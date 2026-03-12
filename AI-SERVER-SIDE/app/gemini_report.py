# app/gemini_report.py
import os
import json
import re
from dotenv import load_dotenv
from google import genai
from app.schemas import DetectionResult
from app.urgency_analyzer import analyze_urgency, get_urgency_action_plan

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)
MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
 
 
def generate_report(detection: DetectionResult) -> dict:
    detected_items = [f"{det.label} ({det.confidence:.0%})" for det in (detection.detections or [])]
    detected_str = ", ".join(detected_items) if detected_items else "No significant findings"
    classification_str = ", ".join([f"{cls}: {prob:.0%}" for cls, prob in detection.classification.items()])
    
    prompt = f'''You are a dental professional. Analyze these findings and respond ONLY with valid JSON.

Findings:
- Classification Probabilities: {classification_str}
- Detected: {detected_str}

Respond with ONLY this JSON:
{{
  "report": "5-10 sentence professional summary of findings and recommendations",
  "urgency_level": "low" or "medium" or "high",
  "action_plan": ["step 1", "step 2", "step 3"]
}}'''
    
    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        raw = re.sub(r'^```json\s*|^```\s*|\s*```$', '', response.text.strip(), flags=re.MULTILINE).strip()
        data = json.loads(raw)
        return {
            'report': data.get('report', ''),
            'urgency_level': data.get('urgency_level', 'medium'),
            'action_plan': data.get('action_plan', []),
        }
    except Exception as e:
        print(f"❌ AI generation failed: {str(e)}")
        urgency = analyze_urgency(detection)
        action_plan = get_urgency_action_plan(urgency, detection)
        top_classification = max(detection.classification.items(), key=lambda x: x[1]) if detection.classification else ('Unknown', 0)
        return {
            'report': f'The analysis indicates {top_classification[0]} with {top_classification[1]:.0%} confidence. Detected conditions: {detected_str}. Recommend professional evaluation.',
            'urgency_level': urgency,
            'action_plan': action_plan,
        }
 
 
def chat_with_context(question: str, context: str) -> str:
    prompt = f'''You are a professional dental consultant AI assistant.

Dental Report:
{context}

Patient Question: {question}

Provide a helpful, accurate response (2-3 sentences):
- What condition they have
- Why it occurred
- What they should do
- When to see a dentist'''
    
    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        return response.text.strip() if response and response.text else None
    except Exception as e:
        print(f"❌ Chat generation failed: {str(e)}")
        pass
    
    # Fallback keyword-based response
    keywords = {
        'discoloration': 'Professional whitening can help. See your dentist for in-office or at-home options.',
        'caries': 'Dental cavities require professional treatment. Schedule an appointment soon.',
        'gingivitis': 'Gum inflammation often improves with brushing, flossing, and antimicrobial mouthwash daily.',
        'calculus': 'Tartar requires professional scaling. Regular cleanings prevent buildup.',
        'ulcer': 'Most mouth ulcers heal in 1-2 weeks. Avoid spicy foods and use a soft brush.',
        'urgent': 'This requires prompt attention. Schedule an appointment within 24-48 hours.',
        'high': 'This requires soon attention from your dentist.',
    }
    
    for keyword, msg in keywords.items():
        if keyword.lower() in context.lower() or keyword.lower() in question.lower():
            return msg
    
    return 'Your dentist will provide personalized recommendations. Maintain good oral hygiene with regular brushing and flossing.'