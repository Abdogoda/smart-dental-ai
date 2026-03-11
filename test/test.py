import os
import random
import cv2
import numpy as np
from test_detection import load_model as load_detection_model, detect_image
from test_classification import load_model as load_classification_model, classify_image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAL_IMAGES_PATH = os.path.join(BASE_DIR, "datasets/detection-dataset/images/val")
OUTPUT_PATH = os.path.join(BASE_DIR, "test", "outputs")

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_PATH, exist_ok=True)

# Grid configuration
GRID_ROWS = 2
GRID_COLS = 4
CELL_SIZE = 400  # Size of each cell


def process_image(img_path, detection_model, classification_model):
    """Process single image with detection and classification."""
    # Detection with annotated image from YOLO
    detections, annotated_image = detect_image(img_path, detection_model)
    image = cv2.resize(annotated_image, (CELL_SIZE, CELL_SIZE - 120))
    
    # Classification
    classifications = classify_image(img_path, classification_model)
    top_class = max(classifications.items(), key=lambda x: x[1])
    
    return image, detections, classifications, top_class


def main():
    print("Loading models...")
    detection_model = load_detection_model()
    classification_model = load_classification_model()
    print("Models loaded successfully!\n")
    
    # Get 8 random images
    images = [f for f in os.listdir(VAL_IMAGES_PATH) if f.endswith(('.jpg', '.jpeg', '.png'))]
    test_images = random.sample(images, min(8, len(images)))
    
    print(f"Processing {len(test_images)} images...\n")
    
    # Create grid
    grid = np.ones((GRID_ROWS * CELL_SIZE, GRID_COLS * CELL_SIZE, 3), dtype=np.uint8) * 255
    
    # Process each image
    for idx, img_name in enumerate(test_images):
        row = idx // GRID_COLS
        col = idx % GRID_COLS
        
        img_path = os.path.join(VAL_IMAGES_PATH, img_name)
        print(f"[{idx+1}/8] Processing {img_name}...")
        
        image, detections, classifications, top_class = process_image(img_path, detection_model, classification_model)
        
        # Pad image with space for classification text
        padded = np.ones((CELL_SIZE, CELL_SIZE, 3), dtype=np.uint8) * 255
        padded[:image.shape[0], :image.shape[1]] = image
        
        # Add classification text
        y_offset = image.shape[0] + 15
        for i, (class_name, prob) in enumerate(sorted(classifications.items(), key=lambda x: x[1], reverse=True)[:3]):
            text = f"{class_name}: {prob*100:.1f}%"
            cv2.putText(padded, text, (10, y_offset + i*20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        
        # Place in grid
        y_start = row * CELL_SIZE
        x_start = col * CELL_SIZE
        grid[y_start:y_start+CELL_SIZE, x_start:x_start+CELL_SIZE] = padded
        
        print(f"  ✓ Detections: {len(detections)}, Top class: {top_class[0]} ({top_class[1]*100:.1f}%)")
    
    # Save grid
    grid_output = os.path.join(OUTPUT_PATH, "grid_results.jpg")
    cv2.imwrite(grid_output, grid)
    
    print(f"\n✓ Grid image saved: {grid_output}")


if __name__ == "__main__":
    main()
