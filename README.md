# 🦷 Smart Dental AI - Training Guide

**AI-powered dental disease detection system** using advanced deep learning models  
Automatically classify and locate dental issues in tooth images with high accuracy

---

## 🎯 Project Overview

### 🎓 What Problem Does This Solve?

- ❌ **Manual Analysis**: Dentists spend time manually examining images
- ✅ **Automated Detection**: AI instantly identifies 6 dental diseases with 91% accuracy
- ✅ **Precise Localization**: Pinpoints exact location of dental issues on images
- ✅ **Decision Support**: Assists dental professionals in diagnosis

### 🏆 Key Achievements

| Metric                         | Performance         | Status              |
| ------------------------------ | ------------------- | ------------------- |
| 🎯 **Classification Accuracy** | 91.06%              | ✅ Production Ready |
| 📍 **Detection Precision**     | mAP 0.78            | ✅ Excellent        |
| 🚀 **Speed**                   | Real-time inference | ✅ Optimized        |
| 💾 **Model Size**              | 103 MB + 49 MB      | ✅ Deployable       |

### 🤖 Technology Stack

| Component         | Technology           | Reason                              |
| ----------------- | -------------------- | ----------------------------------- |
| 📐 Classification | **ResNet50**         | Fast, accurate, proven architecture |
| 🎯 Detection      | **YOLOv8 Medium**    | Real-time detection, good balance   |
| 📊 Data Source    | **Kaggle**           | 15K+ curated dental images          |
| ☁️ Training       | **Google Colab GPU** | Free GPU access, reproducible       |

### 🦠 Dental Conditions Detected (6 Classes)

| Disease           | Description              |
| ----------------- | ------------------------ |
| **Calculus**      | Tartar/plaque buildup    |
| **Caries**        | Tooth decay/cavity       |
| **Discoloration** | Staining/color change    |
| **Gingivitis**    | Gum disease/inflammation |
| **Hypodontia**    | Missing teeth            |
| **Ulcer**         | Mouth sores/lesions      |

---

## 💡 Model Capabilities

### 🔍 Classification Model

- **Input**: Single tooth image (224×224 px)
- **Output**: Disease class + confidence score
- **Use Case**: Quick disease identification
- **Accuracy**: 91.06% on validation set

### 📍 Detection Model

- **Input**: Tooth image with multiple issues (640×640 px)
- **Output**: Bounding boxes + class labels
- **Use Case**: Precise issue localization
- **Precision**: mAP 0.78 (excellent for medical use)

---

## 📥 Get Started

| 📊 Resource                          | 🔗 Link                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 📁 **Pre-trained Models + Datasets** | [Google Drive](https://drive.google.com/drive/folders/1S6DW6uXEmyBw_sNWGQB3a7Gn-A_L82xl?usp=sharing) |
| 📖 **Original Dataset**              | [Kaggle](https://www.kaggle.com/datasets/salmansajid05/oral-diseases)                                |

---

## ##🎯 Training Overview

---

## 📊 Dataset Summary

**Classification Dataset**

- 📊 11,614 images (9,288 train / 2,326 val)
- 🎯 6 disease classes
- 📸 224×224 input size

**Detection Dataset**

- 📊 1,542 images (1,493 train / 49 val)
- 🎯 4 object types
- 📸 640×640 input size

---

## 🏋️ Classification Training Results

| Metric      | Phase 1   | Phase 2    | Improvement |
| ----------- | --------- | ---------- | ----------- |
| 🎯 Accuracy | 75.49%    | **91.06%** | **+15.57%** |
| 📉 Loss     | 0.834     | 0.075      | **-91%**    |
| ⏱️ Duration | 15 epochs | 40 epochs  | -           |

**⏹️ Stopped**: Epoch 55/68 (7 epochs no improvement)

### � Output Model

| File                  | Location                       | Size    | Accuracy |
| --------------------- | ------------------------------ | ------- | -------- |
| 💾 **best_model.pth** | `runs/classification-results/` | ~103 MB | 91.06%   |
| 📊 **Results Plots**  | `runs/classification-results/` | -       | -        |

### �📊 Visualization

![Classification Results](runs/classification-results/classification.png)

---

## 🎯 Detection Training Results

| Metric      | Start | Best     | Final        |
| ----------- | ----- | -------- | ------------ |
| 🎯 mAP@0.5  | 0.31  | **0.78** | 0.76         |
| 📉 Loss     | 3.45  | 0.82     | 0.78         |
| ⏱️ Duration | -     | Epoch 67 | Epoch 87/100 |

**⏹️ Stopped**: Epoch 87/100 (20 epochs no mAP improvement)

### � Output Model

| File                 | Location                          | Size   | mAP@0.5 |
| -------------------- | --------------------------------- | ------ | ------- |
| 💾 **best.pt**       | `runs/detection-results/weights/` | ~49 MB | 0.78    |
| 💾 **last.pt**       | `runs/detection-results/weights/` | ~49 MB | 0.76    |
| 📊 **Results Plots** | `runs/detection-results/`         | -      | -       |

### �📊 Visualization

![Detection Results](runs/detection-results/train_batch0.jpg)

---

## 🚀 Quick Usage

### Using Classification Model

```python
from ultralytics import YOLO
import torch
from PIL import Image

# Load model
model = torch.load('models/classification.pth')
image = Image.open('tooth.jpg')
# ... process image
prediction = model(image)
```

### Using Detection Model

```python
from ultralytics import YOLO

model = YOLO('models/detection.pt')
results = model.predict('tooth.jpg', conf=0.5)
```

---

## 📝 Key Stats

✅ **Best Classification Accuracy**: 91.06%  
✅ **Best Detection mAP**: 0.78  
✅ **Training Time**: 5h (classification) + 3h (detection)  
✅ **GPU Used**: NVIDIA T4 on Google Colab
