import os
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models/phase2_best.pth")

CLASSES = {0: "Calculus", 1: "Dental Caries", 2: "Tooth Discoloration", 3: "Caries Gingivitis", 4: "Hypodontia", 5: "Mouth Ulcer"}

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_model():
    """Load the classification model."""
    model = models.resnet50(weights=None)
    model.fc = nn.Sequential(
        nn.Linear(model.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.5),
        nn.Linear(512, 128),
        nn.ReLU(),
        nn.Dropout(0.5),
        nn.Linear(128, 6)
    )
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()
    return model


def classify_image(image_path, model):
    image = Image.open(image_path).convert('RGB')
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = model(input_tensor)
        probs = torch.sigmoid(outputs[0]).cpu().numpy()
    
    results = {}
    for class_id, prob in enumerate(probs):
        class_name = CLASSES[class_id]
        results[class_name] = float(prob)
    
    return results


if __name__ == "__main__":
    # Example usage
    model = load_model()
    print("Model loaded successfully!")
    print("\nTo use this module in other files:")
    print("from test_classification import load_model, classify_image")
    print("model = load_model()")
    print("results = classify_image('path/to/image.jpg', model)")
    print("print(results)")
