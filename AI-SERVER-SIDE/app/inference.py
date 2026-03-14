# app/inference.py
import torch
import torchvision.transforms as transforms
from torchvision import models
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
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


def _append_classification_text(image: Image.Image, classification_probs: dict) -> Image.Image:
    """Append a text area below the detection image with top-3 class probabilities."""
    top3 = sorted(classification_probs.items(), key=lambda item: item[1], reverse=True)[:3]

    line_texts = [f'{idx}. {label}: {prob * 100:.2f}%' for idx, (label, prob) in enumerate(top3, start=1)]

    font = ImageFont.load_default()
    padding_x = 12
    padding_y = 8
    line_gap = 4

    # Use a temporary drawing context to measure text height.
    measurement_canvas = Image.new('RGB', (1, 1), 'white')
    measurement_draw = ImageDraw.Draw(measurement_canvas)

    line_heights = [measurement_draw.textbbox((0, 0), text, font=font)[3] for text in line_texts]

    text_area_height = padding_y * 2 + sum(line_heights) + line_gap * (len(line_texts) - 1)
    combined_height = image.height + text_area_height

    combined_image = Image.new('RGB', (image.width, combined_height), color='white')
    combined_image.paste(image, (0, 0))

    draw = ImageDraw.Draw(combined_image)
    draw.rectangle([(0, image.height), (image.width, combined_height)], fill='white')

    y = image.height + padding_y
    for text, h in zip(line_texts, line_heights):
        draw.text((padding_x, y), text, fill='black', font=font)
        y += h + line_gap

    return combined_image
 
 
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
    
    # 3. Generate detection image and append top-3 classification probabilities
    detection_img_array = results.plot()  # YOLO returns annotated image as numpy array
    detection_img = Image.fromarray(detection_img_array)
    detection_img = _append_classification_text(detection_img, classification_probs)
    
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
