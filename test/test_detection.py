import os
from ultralytics import YOLO

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models/detection.pt")
CLASSES = ["Dental Caries", "Mouth Ulcer", "Tooth Discoloration", "Caries Gingivitis"]


def load_model():
    """Load the YOLO detection model."""
    model = YOLO(MODEL_PATH)
    return model


def detect_image(image_path, model, conf=0.25):
    """Detect objects in image and return detections with annotated image."""
    result = model(image_path, conf=conf)[0]
    
    detections = [{
        'class': CLASSES[int(box.cls[0])],
        'confidence': float(box.conf[0]),
        'bbox': [int(x) for x in box.xyxy[0].cpu().numpy()]
    } for box in result.boxes]
    
    return detections, result.plot()


if __name__ == "__main__":
    model = load_model()
    print("Model loaded successfully!")
