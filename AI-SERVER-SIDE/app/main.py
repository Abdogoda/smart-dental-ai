# app/main.py
import uuid, os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
 
from app.schemas import DiagnosisResponse, ChatRequest, ChatResponse, BatchDiagnosisResponse, BatchDiagnosisItem
from app.inference import run_inference, _load_models
from app.gemini_report import generate_report, chat_with_context
 
load_dotenv()
UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', 'uploads'))
UPLOAD_DIR.mkdir(exist_ok=True)
 
ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_SIZE_MB   = 10
 
 
# ── Load models once on startup ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_models()    # YOLO + ResNet loaded here, not on each request
    yield
 
 
app = FastAPI(
    title='Dental AI Diagnosis Service',
    version='1.0.0',
    lifespan=lifespan,
)
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],   # Restrict to Node.js URL in production
    allow_methods=['*'],
    allow_headers=['*'],
)


# ── GET / ────────────────────────────────────────────────────────────────────
@app.get('/')
def root():
    return RedirectResponse(url='/docs')


# ── POST /diagnose ────────────────────────────────────────────────────────
@app.post('/diagnose', response_model=DiagnosisResponse)
async def diagnose(file: UploadFile = File(...)):
 
    # Validate MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, 'Only JPEG / PNG / WEBP images accepted')
 
    # Validate file size
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f'File exceeds {MAX_SIZE_MB} MB')
 
    # Save with unique name to avoid collisions
    suffix   = Path(file.filename).suffix
    tmp_path = UPLOAD_DIR / f'{uuid.uuid4()}{suffix}'
    tmp_path.write_bytes(content)
 
    try:
        detection = run_inference(str(tmp_path))
        
        report_data = generate_report(detection)
        
        return DiagnosisResponse(
            detection=detection,
            report=report_data['report'],
            urgency_level=report_data['urgency_level'],
            action_plan=report_data['action_plan'],
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f'AI processing failed: {str(e)}'
        raise HTTPException(500, error_msg)
    finally:
        tmp_path.unlink(missing_ok=True)  # always delete temp file


# ── POST /diagnose-batch ────────────────────────────────────────────────────
@app.post('/diagnose-batch', response_model=BatchDiagnosisResponse)
async def diagnose_batch(files: List[UploadFile] = File(...)):
    """Process multiple images at once (up to 10 per request)"""
    if not files:
        raise HTTPException(400, 'No files provided')
    
    if len(files) > 10:
        raise HTTPException(413, 'Maximum 10 images allowed per batch')
    
    results = []
    errors = []
    
    for file in files:
        try:
            # Validate MIME type
            if file.content_type not in ALLOWED_TYPES:
                errors.append(f'{file.filename}: Invalid file type')
                continue
            
            # Validate file size
            content = await file.read()
            if len(content) > MAX_SIZE_MB * 1024 * 1024:
                errors.append(f'{file.filename}: Exceeds {MAX_SIZE_MB}MB')
                continue
            
            # Save with unique name
            suffix   = Path(file.filename).suffix
            tmp_path = UPLOAD_DIR / f'{uuid.uuid4()}{suffix}'
            tmp_path.write_bytes(content)
            
            try:
                detection = run_inference(str(tmp_path))
                report_data = generate_report(detection)
                
                results.append(BatchDiagnosisItem(
                    filename=file.filename,
                    detection=detection,
                    report=report_data['report'],
                    urgency_level=report_data['urgency_level'],
                    action_plan=report_data['action_plan'],
                ))
            finally:
                tmp_path.unlink(missing_ok=True)
        
        except Exception as e:
            errors.append(f'{file.filename}: {str(e)}')
    
    if not results:
        raise HTTPException(400, f'No images processed. Errors: {errors}')
    
    return BatchDiagnosisResponse(
        count=len(results),
        results=results,
    )
 
 
# ── POST /chat ────────────────────────────────────────────────────────────
@app.post('/chat', response_model=ChatResponse)
async def chat(body: ChatRequest):
    try:
        answer = chat_with_context(body.question, body.context)
        return ChatResponse(answer=answer)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f'Chat failed: {str(e)}'
        raise HTTPException(500, error_msg)
