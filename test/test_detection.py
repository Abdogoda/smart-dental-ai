import os
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models/detection.pt")

CLASSES = {0: "Dental Caries", 1: "Mouth Ulcer", 2: "Tooth Discoloration", 3: "Caries Gingivitis"}


def load_model():
    """Load the YOLO detection model."""
    model = YOLO(MODEL_PATH)
    return model


def detect_image(image_path, model, conf=0.25):
    results = model(image_path, conf=conf)
    result = results[0]
    
    detections = []
    for box in result.boxes:
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])
        bbox = box.xyxy[0].cpu().numpy()
        class_name = CLASSES.get(class_id, "Unknown")
        
        detections.append({
            'class': class_name,
            'confidence': confidence,
            'bbox': [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])]
        })
    
    # Get annotated image from YOLO
    annotated_image = result.plot()
    
    return detections, annotated_image


if __name__ == "__main__":
    # Example usage
    model = load_model()
    print("Model loaded successfully!")
    print("\nTo use this module in other files:")
    print("from test_detection import load_model, detect_image")
    print("model = load_model()")
    print("detections = detect_image('path/to/image.jpg', model)")
    print("print(detections)")
