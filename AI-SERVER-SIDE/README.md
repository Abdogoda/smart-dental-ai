# 🏥 Dental AI Backend - FastAPI Microservice

A production-ready FastAPI microservice for dental image analysis using YOLOv8 object detection, ResNet50 classification, and Google Gemini AI for medical report generation.

## 📋 Features

### Core AI/ML Capabilities

- **YOLOv8 Detection**: Detects dental conditions with bounding boxes (4 disease types)
- **ResNet50 Classification**: Multi-label classification with sigmoid activation (6 dental conditions)
- **Gemini 1.5 Integration**: Generates natural language medical reports and conversational AI
- **Base64 Image Output**: Detection visualizations encoded for easy frontend integration

### API Endpoints

1. **`GET /`** - Redirects to interactive API documentation
2. **`GET /docs`** - Swagger UI for API exploration
3. **`POST /diagnose`** - Main diagnosis endpoint with image analysis
4. **`POST /chat`** - Conversational AI for follow-up questions

### Testing & Validation

- Comprehensive API test suite (12 tests)
- Grid visualization test (2×4 grid of 8 image results)
- Support for real dental images or synthetic test images
- Automatic output directory with detection results

### Project Structure

```
AI-SERVER-SIDE/
├── app/
│   ├── main.py                 # FastAPI application & endpoints
│   ├── inference.py            # YOLO + ResNet50 inference pipeline
│   ├── gemini_report.py        # Gemini AI integration
│   └── schemas.py              # Pydantic request/response models
├── models/
│   ├── detection.pt            # YOLOv8 model (place your model here)
│   └── classification.pth      # ResNet50 checkpoint (place your model here)
├── tests/
│   ├── test_api.py             # 12-test automated API test suite
│   ├── images/                 # Place test images here
│   └── output/                 # Detection results & grids saved here
├── uploads/                    # Temporary image uploads (auto-cleaned)
├── setup.sh                    # Interactive launcher & management tool
├── requirements.txt            # Python dependencies
├── .env                        # Configuration (copy from .env.example)
├── Dockerfile                  # Docker containerization
├── docker-compose.yml          # Multi-container orchestration
└── README.md                   # This file
```

## 🚀 Quick Start

### Option 1: Interactive Setup (Recommended)

```bash
# Clone/navigate to repository
cd AI-SERVER-SIDE

# Run interactive launcher
chmod +x setup.sh
./setup.sh

# Menu options:
# 1) 🔧 Setup              - Create venv & install dependencies
# 2) 📋 System Status      - Check all requirements
# 3) 🧪 Test Imports       - Verify imports work
# 4) 🧪 Test API          - Run 12 automated tests
# 5) ▶️  Run Server        - Start FastAPI backend
# 6) ❌ Exit
```

### Option 2: Manual Setup

```bash
# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows
# or
source venv/bin/activate      # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Add your models
# Place detection.pt in models/
# Place classification.pth in models/

# Run server
python -m uvicorn app.main:app --reload
```

## 📦 Installation Requirements

### System Requirements

- **Python**: 3.9+
- **Memory**: 8GB+ RAM (for model loading)
- **GPU** (optional): CUDA 11.8+ for accelerated inference

### Python Dependencies

```
fastapi==0.111.0
uvicorn==0.29.0
PyTorch==2.3.0
torchvision==0.18.0
ultralytics==8.2.0  # YOLOv8
google-generativeai==0.3.0  # Gemini
pillow==10.3.0
pydantic==2.7.0
python-dotenv==1.0.1
requests==2.31.0
numpy<2  # For ultralytics compatibility
```

## 🔌 API Reference

### POST /diagnose

**Analyze dental image and return detection + classification + report**

**Request:**

```bash
curl -X POST "http://localhost:8000/diagnose" \
  -H "accept: application/json" \
  -F "file=@dental_image.jpg"
```

**Response:**

```json
{
  "status": "success",
  "detection": {
    "classification_label": "Tooth Discoloration",
    "classification_confidence": 0.9999,
    "classification_probabilities": {
      "Calculus": 0.0,
      "Dental Caries": 0.0043,
      "Tooth Discoloration": 0.9999,
      "Caries Gingivitis": 0.0007,
      "Hypodontia": 0.0001,
      "Mouth Ulcer": 0.0055
    },
    "detection_image": "iVBORw0KGgoAAAANS..." // Base64 PNG with YOLO detections
  },
  "report": "The patient shows significant signs of tooth discoloration...",
  "urgency_level": "medium",
  "action_plan": [
    "Schedule professional cleaning",
    "Discuss whitening options",
    "Maintain daily oral hygiene"
  ]
}
```

### POST /chat

**Ask follow-up questions about diagnosis**

**Request:**

```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What should I do about the discoloration?",
    "context": "The patient shows significant signs of tooth discoloration..."
  }'
```

**Response:**

```json
{
  "answer": "Professional whitening treatments are available through your dentist..."
}
```

## 🧪 Testing

### Run All API Tests

```bash
./setup.sh  # Option 4
```

Tests validate:

- ✅ Server connectivity
- ✅ Root endpoint redirection
- ✅ JPEG, PNG, WEBP image processing
- ✅ Invalid MIME type rejection
- ✅ File size validation
- ✅ Missing field handling
- ✅ Chat endpoint functionality
- ✅ Error handling & fallbacks
- ✅ Response structure completeness
- ✅ Classification probabilities format

**Test Output:**

```
======================================================================
🏥 DENTAL AI API TEST SUITE
======================================================================
[Test 1] Server connectivity... ✓ PASS
[Test 2] GET / (root endpoint)... ✓ PASS
[Test 3] GET /docs (API documentation)... ✓ PASS
...
[Test 12] POST /chat with missing fields... ✓ PASS

📊 TEST RESULTS
  Total Tests: 12
  Passed: 12
  Failed: 0
  Success Rate: 100.0%
  ✓ ALL TESTS PASSED!
```

### Grid Visualization Test

Create a 2×4 grid showing 8 image detections with results:

```bash
./setup.sh  # Option 5
```

**Output:**

- `tests/output/grid_visualization_YYYYMMDD_HHMMSS.png`
- Shows detection images + probabilities for 8 images
- Perfect for batch analysis and presentation

## 📸 Using Test Images

### Option 1: Automatic (Synthetic Images)

Tests generate random images automatically if no images provided.

### Option 2: Real Dental Images

Place your images in `tests/images/`:

```
tests/images/
├── dental_scan_1.jpg
├── tooth_sample.png
└── xray.webp
```

Supported formats:

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

Tests will automatically use these images for analysis.

## 🐳 Docker Deployment

### Build & Run with Docker Compose

```bash
docker-compose up --build
```

### Manual Docker Build

```bash
# Build image
docker build -t dental-ai:latest .

# Run container
docker run -p 8000:8000 \
  -e GEMINI_API_KEY="your-key-here" \
  -v $(pwd)/models:/app/models \
  dental-ai:latest
```

## ⚙️ Configuration

### Environment Variables (`.env`)

```env
# API Configuration
AI_HOST=0.0.0.0
AI_PORT=8000

# Model Paths
YOLO_MODEL_PATH=models/detection.pt
RESNET_MODEL_PATH=models/classification.pth

# Gemini AI
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-pro

# File Upload
UPLOAD_DIR=uploads
MAX_SIZE_MB=10
CONFIDENCE_THRESHOLD=0.45
```

### Classification Classes (6 types)

1. Calculus
2. Dental Caries
3. Tooth Discoloration
4. Caries Gingivitis
5. Hypodontia
6. Mouth Ulcer

### Detection Classes (4 types)

1. Dental Caries
2. Mouth Ulcer
3. Tooth Discoloration
4. Caries Gingivitis

## 📊 Model Information

### YOLOv8 Detection

- **Input**: 640×640 image
- **Output**: Bounding boxes with class labels & confidence
- **Detects**: 4 dental condition types
- **Inference Time**: ~250-300ms

### ResNet50 Classification

- **Input**: 224×224 image
- **Architecture**:
  - Backbone: ResNet50
  - FC Layer: Linear(2048→512)→ReLU→Dropout(0.5)→Linear(512→128)→ReLU→Dropout(0.5)→Linear(128→6)
- **Output**: Multi-label sigmoid probabilities (0-1 for each class)
- **Inference Time**: ~100-150ms

### Total Inference Time

~500-600ms per image (without Gemini)

## 🔐 Security Considerations

- **CORS**: Currently allows all origins - restrict in production
- **File Upload**: Size limited to 10MB, MIME type validation
- **API Key**: Store GEMINI_API_KEY in .env, never commit to git
- **Error Messages**: Detailed errors in development, generic in production
- **Rate Limiting**: Consider implementing in production deployment

## 📝 Logging & Debugging

### Server Logs

Real-time FastAPI logging shows:

- Image processing pipeline
- Model inference details
- Error tracebacks

### Output Tracking

```
tests/output/
├── diagnose_jpeg_*.png          # Detection results from JPEG tests
├── diagnose_png_*.png           # Detection results from PNG tests
├── diagnose_webp_*.png          # Detection results from WEBP tests
└── grid_visualization_*.png     # 2×4 grid of 8 images
```

## 🚢 Production Deployment

### Recommended Setup

```bash
# Use Gunicorn for production
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8000 app.main:app
```

### Performance Optimization

- Enable GPU (if available)
- Use model quantization
- Implement request caching
- Use Redis for session state
- Deploy multiple workers

## 🤝 Integration with Frontend

### Handling Detection Images

The API returns detection images as base64-encoded PNG:

```javascript
// Frontend code example
const response = await fetch("/diagnose", { method: "POST", body: formData });
const data = await response.json();

// Display detection image
const detectionImage = data.detection.detection_image;
const imageUrl = `data:image/png;base64,${detectionImage}`;
document.getElementById("preview").src = imageUrl;

// Display classification results
const probs = data.detection.classification_probabilities;
Object.entries(probs).forEach(([label, prob]) => {
  console.log(`${label}: ${(prob * 100).toFixed(1)}%`);
});
```

## 📚 API Documentation

Interactive documentation available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## ⚡ Performance Metrics

| Metric                | Value                |
| --------------------- | -------------------- |
| Image Processing      | 500-600ms            |
| YOLO Detection        | 250-300ms            |
| ResNet Classification | 100-150ms            |
| Gemini Report         | 1-3 seconds          |
| Concurrent Requests   | 4-8 (depends on CPU) |
| Memory Usage          | 2-4GB                |

## 🐛 Troubleshooting

### Issue: "Models not loaded"

```bash
# Check model files exist
ls -la models/
# Output should show:
# - detection.pt
# - classification.pth

# If missing, copy your trained models:
cp /path/to/detection.pt models/
cp /path/to/classification.pth models/
```

### Issue: "NumPy compatibility"

```bash
# Already fixed in requirements.txt (numpy<2)
pip install -r requirements.txt --force-reinstall
```

### Issue: "Gemini API not found"

```bash
# Check .env has correct GEMINI_API_KEY
cat .env | grep GEMINI

# Verify API key works:
# https://aistudio.google.com/app/apikey
```

### Issue: Port 8000 already in use

```bash
# Use different port
AI_PORT=8001 python -m uvicorn app.main:app
```

## 📞 Support

For issues or questions:

1. Check test output: `./setup.sh` → Option 4
2. Review API docs: http://localhost:8000/docs
3. Check error logs in server terminal
4. Verify model files exist in `models/` directory

## 📄 License

This project is part of the Dental AI System. All rights reserved.

## 🎯 Roadmap

- [ ] WebSocket support for real-time streaming
- [ ] Batch processing (multiple images)
- [ ] Model fine-tuning API
- [ ] Database integration for patient records
- [ ] OCR for dental forms
- [ ] Mobile app integration
- [ ] Multi-language support

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅
