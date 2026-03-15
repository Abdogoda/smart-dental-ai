# Dental AI Backend (FastAPI)

Backend service for dental image analysis using YOLOv8 detection, ResNet50 classification, and Gemini-generated report text.

## Features

- YOLOv8 object detection with bounding boxes
- ResNet50 multi-label classification (6 classes)
- AI report generation and follow-up chat
- Single-image and batch diagnosis endpoints
- Base64-encoded annotated detection image in API response

## Project Structure

```text
AI-SERVER-SIDE/
|- app/
|  |- main.py
|  |- inference.py
|  |- gemini_report.py
|  |- urgency_analyzer.py
|  `- schemas.py
|- models/
|  |- detection.pt
|  `- classification.pth
|- tests/
|  |- test_api.py
|  |- images/
|  `- output/
|- uploads/
|- run.py
|- setup.sh
|- requirements.txt
|- .env
|- .env.example
`- README.md
```

## Requirements

- Python 3.9+
- Model files:
  - `models/detection.pt`
  - `models/classification.pth`
- `.env` file configured (at minimum `GEMINI_API_KEY`)

Copy and edit environment config:

```bash
cp .env.example .env
# then edit .env and set GEMINI_API_KEY to your real key
```

## Setup and Run with setup.sh (Recommended)

The project includes `setup.sh` as the main launcher for setup, health checks, tests, and server start.

Run it:

```bash
chmod +x setup.sh
./setup.sh
```

Interactive menu options:

1. Setup (create venv and install dependencies)
2. System Status (checks Python, venv, deps, models, .env)
3. Test API (requires server running)
4. Run Server
5. Exit

Note: Setup will create `.env` from `.env.example` automatically if `.env` is missing.

Non-interactive commands:

```bash
./setup.sh status
./setup.sh --help
```

## Manual Setup (Alternative)

```bash
python -m venv venv

# Windows (Git Bash)
source venv/Scripts/activate

# macOS/Linux
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# edit .env and set GEMINI_API_KEY

python run.py
```

Server default URL: `http://127.0.0.1:8000` (or `http://localhost:8000`).

## API Endpoints

- `GET /` -> redirects to `/docs`
- `POST /diagnose` -> single image diagnosis
- `POST /diagnose-batch` -> up to 10 images
- `POST /chat` -> follow-up Q&A with context

Swagger docs: `http://127.0.0.1:8000/docs`

## Postman Collection

The Postman collection is located at:

`../smart-dental-ai.json`

It contains all request types with ready-to-use examples, including:

- Health/docs checks
- `POST /diagnose` sample multipart image request
- `POST /diagnose-batch` sample multi-file request
- `POST /chat` sample JSON body request
- Common validation/error scenarios

How to use:

1. Open Postman -> Import.
2. Select file `../smart-dental-ai.json`.
3. Start the API server (`./setup.sh` -> option 4, or `python run.py`).
4. Run requests from the collection examples.

## Quick cURL Examples

Single diagnosis:

```bash
curl -X POST "http://127.0.0.1:8000/diagnose" \
  -H "accept: application/json" \
  -F "file=@tests/images/example.jpg"
```

Batch diagnosis:

```bash
curl -X POST "http://127.0.0.1:8000/diagnose-batch" \
  -H "accept: application/json" \
  -F "files=@tests/images/img1.jpg" \
  -F "files=@tests/images/img2.jpg"
```

Chat request:

```bash
curl -X POST "http://127.0.0.1:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What should I do next?",
    "context": "Patient shows mild discoloration and gingival inflammation."
  }'
```

## Testing

Run from launcher:

- API tests: `./setup.sh` -> option 3

Or directly:

```bash
python tests/test_api.py
```

## Version

- Version: 1.0.0
- Last updated: March 13, 2026
