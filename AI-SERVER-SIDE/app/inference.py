# app/inference.py
import torch
import torchvision.transforms as transforms
from torchvision import models
from ultralytics import YOLO
from PIL import Image
import os
import base64
from io import BytesIO
from dotenv import load_dotenv
from app.schemas import Detection, DetectionResult
 
load_dotenv()
 
# ── Classification classes (ResNet50) ──────────────────────────────────────
CLASSIFICATION_CLASSES = [
    "Calculus",
    "Dental Caries",
    "Tooth Discoloration",
    "Caries Gingivitis",
    "Hypodontia",
    "Mouth Ulcer"
]

# ── Detection classes (YOLOv8) ──────────────────────────────────────────────
YOLO_CLASSES = {
    0: "Dental Caries",
    1: "Mouth Ulcer",
    2: "Tooth Discoloration",
    3: "Caries Gingivitis"
}

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
_yolo_model   = None
_resnet_model = None
 
 
def _load_models():
    global _yolo_model, _resnet_model
 
    # Load YOLOv8
    yolo_path = os.getenv('YOLO_MODEL_PATH', 'models/detection.pt')
    _yolo_model = YOLO(yolo_path)
 
    # Load ResNet50 with exact architecture used during training
    resnet_path = os.getenv('RESNET_MODEL_PATH', 'models/classification.pth')
    _resnet_model = models.resnet50(weights=None)
    
    # Build the exact fc layer as used in training
    in_features = _resnet_model.fc.in_features
    _resnet_model.fc = torch.nn.Sequential(
        torch.nn.Linear(in_features, 512),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.5),
        torch.nn.Linear(512, 128),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.5),
        torch.nn.Linear(128, len(CLASSIFICATION_CLASSES))
    )
    
    # Load checkpoint
    checkpoint = torch.load(resnet_path, map_location=DEVICE)
    state = checkpoint.get('model_state_dict', checkpoint)
    
    try:
        _resnet_model.load_state_dict(state, strict=True)
    except RuntimeError as e:
        _resnet_model.load_state_dict(state, strict=False)
    
    _resnet_model.to(DEVICE)
    _resnet_model.eval()
 
 
TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])
 
 
def run_inference(image_path: str) -> DetectionResult:
    if _yolo_model is None:
        raise RuntimeError('Models not loaded')
 
    conf = float(os.getenv('CONFIDENCE_THRESHOLD', 0.45))
 
    # 1. YOLO detection (for visualization in image, not in response)
    results = _yolo_model(image_path, conf=conf)[0]
    
    # Extract YOLO detections with confidence
    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])
        # Use custom YOLO_CLASSES mapping
        label = YOLO_CLASSES.get(cls_id, f"Class_{cls_id}")
        detections.append(Detection(label=label, confidence=round(confidence, 4)))
 
    # 2. ResNet50 classification (multi-label with sigmoid)
    image  = Image.open(image_path).convert('RGB')
    tensor = TRANSFORM(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        output = _resnet_model(tensor)
        probs  = torch.sigmoid(output[0]).cpu().numpy()  # Multi-label probabilities
    
    # Build probabilities dict
    classification_probs = {cls: round(float(prob), 4) for cls, prob in zip(CLASSIFICATION_CLASSES, probs)}
    
    # 3. Generate and encode detection image from YOLO
    detection_img_array = results.plot()  # YOLO returns annotated image as numpy array
    detection_img = Image.fromarray(detection_img_array)
    
    # Encode to base64
    img_buffer = BytesIO()
    detection_img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    detection_image_b64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
 
    return DetectionResult(
        detections=detections,
        classification=classification_probs,
        detection_image=detection_image_b64,
    )
