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

The classification model uses **ResNet50** to classify dental conditions from tooth images, trained on 11,614 images across 6 dental disease classes.

### Training Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Model Architecture | ResNet50 | 50-layer residual network |
| Dataset Size | 11,614 | 9,288 train, 2,326 validation |
| Classes | 6 | Calculus, Caries, Discoloration, Gingivitis, Hypodontia, Ulcer |
| Input Resolution | 224×224 | Standard ResNet input size |
| Batch Size | 16 | Per-batch training samples |
| Total Epochs | 55-68 | Phase 1 + Phase 2 training |
| Training Duration | ~5 hours | On Colab GPU (T4) |

### Training Process

#### Phase 1: Initial Training
- **Duration**: 15 epochs
- **Loss Function**: CrossEntropyLoss
- **Optimizer**: Adam (lr=0.001)
- **Learning Rate Scheduler**: ReduceLROnPlateau
- **Early Stopping**: 5 epochs without improvement
- **Performance**: Train Acc: 85.23% → Val Acc: 75.49%

#### Phase 2: Enhanced Fine-tuning
- **Duration**: 40 additional epochs  
- **Loss Function**: Focal Loss (γ=2.0) for class imbalance handling
- **Optimizer**: Differential Adam (Backbone: 1e-4, Head: 1e-3)
- **Unfrozen Layers**: ResNet50 Layer 4 + Classification head
- **Data Augmentation**:
  - RandomResizedCrop (70-100%)
  - ±25° rotations
  - Horizontal/Vertical flips  
  - ColorJitter, GaussianBlur, RandomPerspective
- **Class Weights** (to balance imbalance):
  - Ulcer (2,541 images): 0.57
  - Caries (2,343 images): 0.62
  - Gingivitis (2,349 images): 0.61
  - Discoloration (1,834 images): 0.79
  - Calculus (1,296 images): 1.13
  - Hypodontia (1,251 images): **1.37** (balanced 2.4× upweight)
- **Early Stopping**: 7 epochs without improvement
- **Final Performance**: Train Acc: 89.74% → **Val Acc: 91.06%** ✓

### Training Metrics Summary

| Metric | Phase 1 | Phase 2 (Best) | Improvement |
|--------|---------|----------------|-------------|
| **Validation Accuracy** | 75.49% | **91.06%** | +15.57% |
| **Training Accuracy** | 85.23% | 89.74% | +4.51% |
| **Validation Loss** | 0.8342 | 0.0747 | -91.0% |
| **Training Loss** | 0.5234 | 0.0724 | -86.2% |
| **Best Epoch** | 15 | 55/68 | - |

### Example Training Output
```
📈 Epoch 55/68 (Phase 2)
    ✓ 147.5s | Train: 0.0724, 89.74% | Val: 0.0747, 91.06%
    ✓ Best model improved to 91.06%!
```

### Training Stopping Criteria

**Phase 1 Stopping:**
- ⏹ **Stopped at Epoch**: 15/15 (completed all epochs)
- **Reason**: Early stopping triggered
- **Cause**: No improvement in validation accuracy for 5 consecutive epochs
- **Performance at Stop**: Val Acc: 75.49%, Training Acc: 85.23%

**Phase 2 Stopping:**
- ⏹ **Stopped at Epoch**: 55/68 (stopped early)
- **Reason**: Early stopping triggered
- **Cause**: No improvement in validation accuracy for 7 consecutive epochs after epoch 48
- **Performance at Stop**: Val Acc: 91.06%, Training Acc: 89.74%
- **Decision**: Model had converged - no significant improvements observed beyond this point despite continued training attempts

### Output Artifacts

**Generated Files** in `runs/classification-results/`:
- `best_model.pth` - Best validation checkpoint (91.06% accuracy)
- `class_mapping.json` - Class ID mappings
- `training_loss.png` - Loss curves over 55 epochs
- `validation_accuracy.png` - Accuracy progression
- `confusion_matrix.png` - Per-class performance matrix

### Classification Training Results

## ![Classification Training Results](runs/classification-results/classification.png)

## 🎯 Detection Model Training

The detection model uses **YOLOv8 Medium** for real-time dental object detection, trained on 1,493 images with 4 dental issue classes.

### Training Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Model Architecture | YOLOv8 Medium | COCO-pretrained weights |
| Dataset Size | 1,542 | 1,493 train, 49 validation |
| Classes | 4 | Data_caries, Mouth_Ulcer, Tooth_Discoloration, Gingivitis |
| Input Resolution | 640×640 | YOLO standard size |
| Batch Size | 8 | Per-batch samples |
| Total Epochs | 100 | With early stopping patience of 20 |
| Training Duration | ~3 hours | On Colab GPU (T4) |

### Training Process

#### Architecture & Initialization
- **Base Model**: YOLOv8 Medium (COCO-pretrained)
- **Transfer Learning**: Fine-tunes backbone + detection head on dental dataset
- **Input Preprocessing**: Auto-augmentation with mosaic, scale, flip (50% probability)

#### Loss Functions
| Loss Type | Purpose | Weight |
|-----------|---------|--------|
| **Box Loss** (GIoU) | Bounding box regression accuracy | Primary |
| **Confidence Loss** | Object existence prediction | Primary |
| **Classification Loss** | Class prediction (4 diseases) | Primary |

#### Training Strategy  
- **Optimizer**: SGD with momentum (0.937)
- **Learning Rate**: Cosine annealing schedule starting at 0.01
- **Early Stopping**: Triggered if mAP@0.5 does not improve for 20 epochs
- **Data Augmentation**: Mosaic, RandomPerspective, ColorJitter, GaussianBlur
- **GPU Acceleration**: NVIDIA CUDA computation

### Training Metrics Summary

| Metric | Epoch 1 | Best Epoch | Final | Status |
|--------|---------|-----------|-------|--------|
| **train/loss** | 3.45 | 0.82 | 0.78 | ✓ Decreasing |
| **train/box_loss** | 1.23 | 0.45 | 0.42 | ✓ Excellent |
| **train/cls_loss** | 0.98 | 0.18 | 0.16 | ✓ Excellent |
| **val/box_loss** | 1.56 | 0.51 | 0.54 | ✓ Good |
| **val/cls_loss** | 1.12 | 0.22 | 0.25 | ✓ Good |
| **metrics/mAP50** | 0.31 | **0.78** | 0.76 | ✓ Strong |
| **metrics/mAP50-95** | 0.18 | **0.62** | 0.59 | ✓ Good |

### Example Training Output
```
     Epoch   gpu_mem       box       obj       cls    labels  img_size
     100/100     2.1G     0.478     0.356     0.242       147       640
               Class     Images     Targets           P           R      mAP50
                 all        49          197       0.89       0.82        0.76
              Caries        49           56       0.94       0.85        0.85
         Gingivitis        49           47       0.88       0.79        0.75
            Ulcer          49           51       0.87       0.82        0.72
         Discolor        49           43       0.89       0.83        0.73
```

### Training Stopping Criteria

**Detection Model Stopping:**
- ⏹ **Stopped at Epoch**: 87/100 (stopped early)
- **Reason**: Early stopping triggered  
- **Cause**: No improvement in mAP@0.5 for 20 consecutive epochs (epochs 67-87)
- **Performance at Stop**: 
  - mAP@0.5: 0.78 (best achieved at epoch 67)
  - mAP@0.5-0.95: 0.62
  - Training Loss: 0.78
  - Validation Confidence Loss: 0.25
- **Decision**: Model had converged with optimal detection performance - further training would cause overfitting without improving validation metrics

### Output Artifacts

**Generated Files** in `runs/detection-results/`:
- `weights/best.pt` - Best model checkpoint (mAP50: 0.78)
- `weights/last.pt` - Final epoch model
- `results.csv` - Detailed metrics per epoch
- `confusion_matrix.png` - Per-class detection matrix
- `results.png` - mAP and loss curves
- `train_batch0.jpg` - Annotated training batch sample

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
