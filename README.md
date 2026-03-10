# Smart Dental AI - Training Guide

This repository contains code and results for training two AI models for dental image analysis:

1. **Tooth Classification Model** - ResNet50 classifier for identifying dental conditions
2. **Dental Detection Model** - YOLOv8 object detection for localizing dental issues

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Dataset Structure](#-dataset-structure)
- [Prerequisites](#-prerequisites)
- [Classification Model Training](#-classification-model-training)
- [Detection Model Training](#-detection-model-training)
- [Using Trained Models](#-using-trained-models)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Project Overview

This project implements two deep learning models for dental image analysis:

| Model              | Architecture | Task                                            | Classes   |
| ------------------ | ------------ | ----------------------------------------------- | --------- |
| **Classification** | ResNet50     | Multi-label classification of dental conditions | 6 classes |
| **Detection**      | YOLOv8       | Object detection to locate dental issues        | 4 objects |

### Classification Classes (6)

- Calculus
- Caries
- Gingivitis
- Hypodontia
- Ulcer
- Discoloration

### Detection Objects (4)

- Data_caries
- Mouth_Ulcer
- Tooth_Discoloration
- Gingivitis

---

## � Quick Start - Get Datasets

**All datasets are pre-prepared and available here:**  
🎯 **[Download from Google Drive](https://drive.google.com/drive/folders/1S6DW6uXEmyBw_sNWGQB3a7Gn-A_L82xl?usp=sharing)**

1. Open the link above
2. Download the `smart-dental-ai` folder (or add it to your Drive)
3. Follow the training steps below

---

## 📊 Original Data Source

**This project uses the Oral Diseases Dataset from Kaggle:**

🔗 **[Kaggle - Oral Diseases Dataset](https://www.kaggle.com/datasets/salmansajid05/oral-diseases)**

### Dataset Information

- **Total Images**: +15K dental images
- **Classes**: Multiple oral disease conditions including:
  - Calculus (tartar buildup)
  - Caries (tooth decay)
  - Gingivitis (gum disease)
  - Hypodontia (missing teeth)
  - Ulcer (mouth ulcers)
  - Discoloration (tooth discoloration)
- **Annotations**: Includes bounding boxes for detection tasks
- **Format**: JPG images with YOLO-format labels for object detection
- **License**: See Kaggle dataset page for usage rights

**Note**: The datasets in this drive link have been reformatted and split into classification (multiclass) and detection (bounding box) formats for this project.

---

## �📂 Dataset Structure

```
datasets/
├── classification-dataset/
│   ├── class_mapping.json          # Maps class names to IDs
│   ├── split_dataset.py            # Script to split raw data into train/val
│   ├── train/                      # Training images (split by class)
│   │   ├── Calculus/
│   │   ├── Caries/
│   │   ├── Discoloration/
│   │   ├── Gingivitis/
│   │   ├── Hypodontia/
│   │   └── Ulcer/
│   └── val/                        # Validation images (split by class)
│       ├── Calculus/
│       ├── Caries/
│       ├── Discoloration/
│       ├── Gingivitis/
│       ├── Hypodontia/
│       └── Ulcer/
│
└── detection-dataset/
    ├── data.yaml                   # YOLO configuration file
    ├── images/
    │   ├── train/                  # Training images
    │   └── val/                    # Validation images
    └── labels/
        ├── train/                  # YOLO format labels (.txt files)
        └── val/                    # YOLO format labels (.txt files)
```

---

## 📈 Dataset Statistics

### Classification Dataset

| Class         | Training Images | Validation Images | Total      |
| ------------- | --------------- | ----------------- | ---------- |
| Calculus      | 1,036           | 260               | 1,296      |
| Caries        | 1,874           | 469               | 2,343      |
| Discoloration | 1,467           | 367               | 1,834      |
| Gingivitis    | 1,879           | 470               | 2,349      |
| Hypodontia    | 1,000           | 251               | 1,251      |
| Ulcer         | 2,032           | 509               | 2,541      |
| **TOTAL**     | **9,288**       | **2,326**         | **11,614** |

### Detection Dataset

| Split      | Number of Images |
| ---------- | ---------------- |
| Training   | 1,493            |
| Validation | 49               |
| **TOTAL**  | **1,542**        |

---

## 🔧 Prerequisites

### For Google Colab

- Google Colab account with GPU support
- Project folder uploaded to Google Drive
- GPU runtime enabled (Runtime → Change runtime type → T4 GPU)

> 📥 **Datasets Available**: [Google Drive - smart-dental-ai](https://drive.google.com/drive/folders/1S6DW6uXEmyBw_sNWGQB3a7Gn-A_L82xl?usp=sharing)  
> _(Contains all prepared datasets - download or copy to your Drive)_

### Required Packages

- PyTorch & Torchvision (for classification)
- Ultralytics YOLOv8 (for detection)
- OpenCV, scikit-learn, Pillow, etc.

---

## 🏋️ Classification Model Training

The classification model uses **ResNet50** to classify dental conditions from tooth images.

### Step 1: Prepare Dataset

If you have raw images, run the split script first:

```bash
cd datasets/classification-dataset
python split_dataset.py
```

This organizes images into 80/20 train/val split for each class.

### Step 2: Training on Google Colab

1. **Upload to Google Drive**
   - Create a folder called `smart-dental-ai` in your Google Drive
   - Upload the entire project folder to your Drive

2. **Open the Training Notebook**
   - Navigate to `train/ResNet50_Classification_Training.ipynb`
   - Upload to Google Colab or open from Drive

3. **Configure Paths (Cell 3)**

   Update these variables if your folder structure differs:

   ```python
   DRIVE_PATH = "/content/drive/MyDrive"
   PROJECT_FOLDER = "smart-dental-ai"
   BASE_DIR = os.path.join(DRIVE_PATH, PROJECT_FOLDER)
   ```

4. **Run All Cells**
   - Click **Runtime** → **Run all** (or Shift+Ctrl+Enter)
   - The notebook will:
     - Install dependencies
     - Mount Google Drive
     - Verify dataset structure
     - Load and augment images
     - Train ResNet50 model
     - Generate training plots
     - Save the trained model

5. **Monitor Training**
   - Observe loss curves and accuracy metrics
   - Training typically takes 30-60 minutes depending on dataset size
   - Model checkpoints and plots saved to `runs/classification-results/`

#### What Happens During Classification Training

The training occurs in **2 progressive phases**:

**Phase 1: Initial Training (15 epochs)**

- Trains ResNet50 classification head on all 11,614 images across 6 classes
- Monitors per-batch loss and accuracy with progress bars
- Uses **CrossEntropyLoss** for multi-class classification
- Optimizes with **Adam optimizer** (lr=0.001)
- Saves best model when validation accuracy improves
- Implements **early stopping** if no improvement for 5 epochs
- Uses **ReduceLROnPlateau** scheduler to reduce learning rate if val loss plateaus
- Accuracy was about _75.49%_ which is bad, so we have to do fine-tuning.

**Phase 2: Enhanced Fine-tuning (15+5+40 epochs)**

- Loads best model from Phase 1 and applies advanced techniques
- **Focal Loss** (γ=2.0) to handle class imbalance (especially for underrepresented classes like Hypodontia)
- Computes class weights:
  - Ulcer: ~0.57 (largest class, 2,541 images)
  - Caries: ~0.62
  - Discoloration: ~0.79
  - Gingivitis: ~0.61
  - Calculus: ~1.13
  - Hypodontia: ~1.37 (smallest class, 1,251 images)
- **Enhanced augmentation** applied to training data:
  - RandomResizedCrop (70-100% of image)
  - Random rotations (±25°)
  - Horizontal/Vertical flips
  - Color jittering (brightness, contrast, saturation)
  - Gaussian blur
  - Random perspective distortion
- Unfreezes **ResNet50 Layer 4** backbone for fine-tuning
- **Differential learning rates**: Layer 4 (lr=0.0001), Classification head (lr=0.001)
- Early stopping if no improvement for 7 epochs
- The Accuracy here stopped at _91.06%_ which is not bad compared to the first phase.

**Key Metrics Printed Each Epoch:**

```
📈 Epoch 55/68
    ✓ 147.5s | Train: 0.0724, 89.74% | Val: 0.0747, 91.06%
    ✓ Best model improved to 91.06%!
```

### Step 3: Output Files

After training completes, you'll find in `runs/classification-results/`:

```
models/
├── best_model.pth              # Best model (lowest validation loss)
├── final_model.pth             # Final model after all epochs
└── class_mapping.json          # Class ID mappings

plots/
├── training_loss.png           # Loss curves
├── validation_accuracy.png     # Accuracy over epochs
├── confusion_matrix.png        # Validation set confusion matrix
└── training_history.json       # Detailed metrics
```

### Classification Training Results

## ![Classification Training Results](runs/classification-results/classification.png)

## 🎯 Detection Model Training

The detection model uses **YOLOv8** for real-time dental issue detection.

### Step 1: Verify Dataset Format

Ensure your detection dataset follows YOLO format:

```
detection-dataset/
├── data.yaml            # YOLO configuration
├── images/
│   ├── train/*.jpg     # Training images
│   └── val/*.jpg       # Validation images
└── labels/
    ├── train/*.txt     # YOLO format labels
    └── val/*.txt       # YOLO format labels
```

Each `.txt` file contains one line per object:

```
<class_id> <center_x> <center_y> <width> <height>
```

(coordinates normalized to 0-1)

### Step 2: Training on Google Colab

1. **Upload to Google Drive**
   - Ensure `smart-dental-ai` folder with detection dataset is in Google Drive

2. **Open the Training Notebook**
   - Navigate to `train/YOLOv8_Dental_Detection_Training.ipynb`
   - Upload to Google Colab

3. **Configure Paths (Cell 2-3)**

   Update paths if needed:

   ```python
   DRIVE_PATH = "/content/drive/MyDrive"
   PROJECT_FOLDER = "smart-dental-ai"
   DETECTION_DATASET = os.path.join(DATASET_DIR, 'detection-dataset')
   DATA_YAML = os.path.join(DETECTION_DATASET, 'data.yaml')
   ```

4. **Run All Cells**
   - Click **Runtime** → **Run all**
   - The notebook will:
     - Install YOLOv8 and dependencies
     - Mount Google Drive
     - Verify dataset and data.yaml
     - Load YOLOv8 pretrained model
     - Train on detection dataset
     - Evaluate on validation set
     - Generate training visualizations
     - Save the trained model

5. **Monitor Training**
   - YOLOv8 training typically takes 20-40 minutes on 1,542 images (1,493 train + 49 val)
   - Monitor mAP (mean average precision) and loss metrics
   - Results saved to `runs/detection-results/`

#### What Happens During Detection Training

YOLOv8 performs object detection training to localize dental issues:

**Detection Model Training Process:**

- Loads **YOLOv8 Medium** pretrained model (trained on COCO dataset)
- Fine-tunes on 1,493 training images with 4 object classes:
  - Data_caries (tooth decay)
  - Mouth_Ulcer (oral ulcers)
  - Tooth_Discoloration (discolored teeth)
  - Gingivitis (gum disease)
- Each training image has bounding box annotations in YOLO format

**Loss Functions Used:**

- **Box Loss** (GIoU): Penalizes incorrect bounding box dimensions and positions
- **Confidence Loss**: Predicts if object exists in bounding box
- **Classification Loss**: Predicts which of 4 classes the object belongs to

**Key Metrics Monitored Per Epoch:**

```
Epoch 1/100
  train/loss: 3.45  (total training loss)
  train/box_loss: 1.23  (bounding box regression)
  train/cls_loss: 0.98  (classification loss)
  val/box_loss: 1.56   (validation bounding box loss)
  val/cls_loss: 1.12   (validation classification loss)
  metrics/mAP50: 0.65  (mean average precision at 0.5 IoU)
  metrics/mAP50-95: 0.42  (mAP across IoU thresholds 0.5-0.95)
```

**Training Characteristics:**

- Smaller dataset (1,542 images) compared to classification (11,614)
- Validation set only has 49 images (typically 5-10% of training)
- Model learns to draw bounding boxes around dental issues
- Early stopping triggered if no improvement in mAP@0.5 after 20 epochs
- Image size standardized to **640×640 pixels**
- Batch size of 8 optimized for GPU memory

**Output During Training:**

- Progress bar showing epoch completion
- Real-time loss curves for training/validation
- Automatically saves best model when mAP improves
- Generates confusion matrix showing detection accuracy per class

### Step 3: Output Files

After training, find results in `runs/detection-results/`:

```
detect/
├── train/
│   ├── weights/
│   │   ├── best.pt              # Best model
│   │   └── last.pt              # Last epoch model
│   ├── results.csv              # Training metrics
│   ├── confusion_matrix.png     # Confusion matrix
│   └── results.png              # Training plots
└── val/
    └── predictions.png          # Sample predictions
```

### Detection Training Results

![Detection Training Results](runs/detection-results/train_batch0.jpg)

---

## 🚀 Using Trained Models

### Classification Model

```python
import torch
from torchvision import models, transforms
from PIL import Image

# Load model
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = models.resnet50(num_classes=6)
model.load_state_dict(torch.load('models/classification.pth', map_location=device))
model = model.to(device)
model.eval()

# Prepare image
image = Image.open('tooth_image.jpg')
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225])
])
input_tensor = transform(image).unsqueeze(0).to(device)

# Predict
with torch.no_grad():
    output = model(input_tensor)
    probabilities = torch.softmax(output, dim=1)
    class_idx = torch.argmax(probabilities, dim=1).item()

# Map to class name
classes = ['Calculus', 'Caries', 'Gingivitis', 'Hypodontia', 'Ulcer', 'Discoloration']
print(f"Predicted: {classes[class_idx]} ({probabilities[0][class_idx]:.2%})")
```

### Detection Model

```python
from ultralytics import YOLO

# Load trained model
model = YOLO('models/detection.pt')

# Run inference
results = model.predict('tooth_image.jpg', conf=0.5)

# Results
for result in results:
    print(result.boxes)  # Detections

    # Draw and save
    result.save('predictions.jpg')
```

## 💾 Saving & Export

### Save Classification Model

```python
torch.save(model.state_dict(), 'classification_model.pth')

# Save full model
torch.save(model, 'classification_model_full.pt')
```

### Export Detection Model to ONNX

```python
from ultralytics import YOLO

model = YOLO('models/detection.pt')
model.export(format='onnx')  # Saves as detection.onnx
```

---

## 📝 Notes

- **Training Time**: Classification ~5 hours, Detection ~3 hours on Colab GPU
- **GPU Memory**: Recommended 8GB+ VRAM
- **Dataset Size**: Currently supports 100-2000+ images per class
- **Model Updates**: Periodically retrain with new data for improved performance

---

## 📚 References

- [PyTorch ResNet Documentation](https://pytorch.org/vision/stable/models.html)
- [YOLOv8 Official Docs](https://docs.ultralytics.com/)
- [Google Colab GPU Training](https://colab.research.google.com/)
- [YOLO Label Format](https://docs.ultralytics.com/datasets/detect/#dataset-format)

---

**Last Updated**: March 2026  
**Project**: Smart Dental AI
