# 🦷 Smart Dental AI - Training Guide

AI-powered dental image analysis using ResNet50 + YOLOv8

---

##🎯 What This Project Does

| Model                 | Task                       | Accuracy      | Speed     |
| --------------------- | -------------------------- | ------------- | --------- |
| 🔍 **Classification** | Identify 6 dental diseases | **91.06%**    | Fast      |
| 📍 **Detection**      | Locate dental issues       | **mAP: 0.78** | Real-time |

### Conditions Detected

Calculus • Caries • Discoloration • Gingivitis • Hypodontia • Ulcer

---

## 📥 Get Started

| 📊 Resource        | 🔗 Link                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| 📁 **Datasets**    | [Google Drive](https://drive.google.com/drive/folders/1S6DW6uXEmyBw_sNWGQB3a7Gn-A_L82xl?usp=sharing) |
| 📖 **Source Data** | [Kaggle](https://www.kaggle.com/datasets/salmansajid05/oral-diseases)                                |

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

| File | Location | Size | Accuracy |
|------|----------|------|----------|
| 💾 **best_model.pth** | `runs/classification-results/` | ~103 MB | 91.06% |
| 📊 **Results Plots** | `runs/classification-results/` | - | - |

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

| File | Location | Size | mAP@0.5 |
|------|----------|------|----------|
| 💾 **best.pt** | `runs/detection-results/weights/` | ~49 MB | 0.78 |
| 💾 **last.pt** | `runs/detection-results/weights/` | ~49 MB | 0.76 |
| 📊 **Results Plots** | `runs/detection-results/` | - | - |

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
