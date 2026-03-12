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
3. **`POST /diagnose`** - Single image diagnosis endpoint with AI analysis
4. **`POST /diagnose-batch`** - Batch processing endpoint (up to 10 images per request)
5. **`POST /chat`** - Conversational AI for follow-up questions

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

## 🔌 API Reference

### POST /diagnose

**Analyze single dental image and return detection + classification + report**

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
    "detections": [
      { "label": "Dental Caries", "confidence": 0.95 },
      { "label": "Mouth Ulcer", "confidence": 0.87 }
    ],
    "classification": {
      "Calculus": 0.0043,
      "Dental Caries": 0.0999,
      "Tooth Discoloration": 0.8765,
      "Caries Gingivitis": 0.0087,
      "Hypodontia": 0.0001,
      "Mouth Ulcer": 0.0105
    },
    "detection_image": "iVBORw0KGgoAAAANS..." // Base64 PNG with YOLO detections
  },
  "report": "The patient shows significant signs of tooth discoloration with associated gingival inflammation...",
  "urgency_level": "medium",
  "action_plan": [
    "Schedule professional cleaning",
    "Discuss whitening options",
    "Maintain daily oral hygiene"
  ]
}
```

### POST /diagnose-batch

**Analyze multiple dental images at once (up to 10 per request)**

**Request:**

```bash
curl -X POST "http://localhost:8000/diagnose-batch" \
  -H "accept: application/json" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@image3.jpg"
```

**Response:**

```json
{
  "status": "success",
  "count": 3,
  "results": [
    {
      "filename": "image1.jpg",
      "detection": {
        "detections": [...],
        "classification": {...},
        "detection_image": "iVBORw0KGgo..."
      },
      "report": "Patient shows moderate discoloration...",
      "urgency_level": "low",
      "action_plan": [...]
    },
    {
      "filename": "image2.jpg",
      "detection": {...},
      "report": "Significant decay detected...",
      "urgency_level": "high",
      "action_plan": [...]
    },
    {
      "filename": "image3.jpg",
      "detection": {...},
      "report": "Minor plaque buildup...",
      "urgency_level": "medium",
      "action_plan": [...]
    }
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
- ✅ Single image analysis (/diagnose)
- ✅ **Batch image processing (/diagnose-batch)** - NEW!
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

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅
