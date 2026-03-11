#!/usr/bin/env python3
"""
Comprehensive API testing script for Dental AI Backend
Tests all endpoints with different scenarios and validates responses
"""

import requests
import json
import sys
import time
import base64
import random
from pathlib import Path
from io import BytesIO
from datetime import datetime
from PIL import Image

# Colors for output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    NC = '\033[0m'
    BOLD = '\033[1m'

# Test configuration
BASE_URL = "http://127.0.0.1:8000"
TIMEOUT = 30
OUTPUT_DIR = Path(__file__).parent / "output"
IMAGES_DIR = Path(__file__).parent / "images"
OUTPUT_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)

# Counters
passed = 0
failed = 0
total = 0

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.NC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.NC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.NC}\n")

def print_test(test_name):
    global total
    total += 1
    print(f"{Colors.CYAN}[Test {total}]{Colors.NC} {test_name}...", end=" ")

def print_pass(msg=""):
    global passed
    passed += 1
    print(f"{Colors.GREEN}✓ PASS{Colors.NC}" + (f" - {msg}" if msg else ""))

def print_fail(msg=""):
    global failed
    failed += 1
    print(f"{Colors.RED}✗ FAIL{Colors.NC}" + (f" - {msg}" if msg else ""))

def print_info(msg):
    print(f"  {Colors.BLUE}ℹ{Colors.NC} {msg}")

def print_error(msg):
    print(f"  {Colors.RED}✗{Colors.NC} {msg}")

def print_success(msg):
    print(f"  {Colors.GREEN}✓{Colors.NC} {msg}")

def create_test_image(format='JPEG', size=(640, 480)):
    """Create a simple test image"""
    img = Image.new('RGB', size, color=(73, 109, 137))
    buffer = BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    return buffer.getvalue()

def get_test_image(format_type):
    """Load random real image from tests/images or create synthetic one"""
    # Map format to file extensions
    ext_map = {
        'JPEG': ['.jpg', '.jpeg'],
        'PNG': ['.png'],
        'WEBP': ['.webp']
    }
    
    extensions = ext_map.get(format_type, [])
    
    # Try to find a real image
    all_images = []
    for ext in extensions:
        all_images.extend(list(IMAGES_DIR.glob(f"*{ext.lower()}")))
        all_images.extend(list(IMAGES_DIR.glob(f"*{ext.upper()}")))
    
    if all_images:
        random_image = random.choice(all_images)
        with open(random_image, 'rb') as f:
            return f.read(), random_image.name
    
    # Fallback to generated image
    return create_test_image(format_type), f"generated_{format_type.lower()}"

def list_test_images():
    """List all available test images"""
    images = list(IMAGES_DIR.glob("*.[jJ][pP][gG]*")) + \
             list(IMAGES_DIR.glob("*.[pP][nN][gG]")) + \
             list(IMAGES_DIR.glob("*.[wW][eE][bB][pP]"))
    return images

def save_detection_image(detection_image_b64, test_name):
    """Save base64 encoded detection image to output folder"""
    try:
        # Decode base64
        img_data = base64.b64decode(detection_image_b64)
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{test_name}_{timestamp}.png"
        filepath = OUTPUT_DIR / filename
        
        # Save image
        with open(filepath, 'wb') as f:
            f.write(img_data)
        
        return filepath
    except Exception as e:
        return None

def check_server_health():
    """Check if server is running"""
    print_test("Server connectivity")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code == 200:
            print_pass("Server is running")
            return True
        else:
            print_fail(f"Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_fail("Cannot connect to server")
        return False
    except Exception as e:
        print_fail(f"Error: {str(e)}")
        return False

def test_root_endpoint():
    """Test GET / endpoint"""
    print_test("GET / (root endpoint)")
    try:
        response = requests.get(f"{BASE_URL}/", allow_redirects=False, timeout=TIMEOUT)
        if response.status_code == 307:  # Redirect
            if response.headers.get('location') == '/docs':
                print_pass("Redirects to /docs")
                return True
            else:
                print_fail(f"Redirects to wrong URL: {response.headers.get('location')}")
                return False
        else:
            print_fail(f"Expected 307, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_diagnose_with_valid_image():
    """Test POST /diagnose with valid image (JPEG, PNG, or WEBP)"""
    print_test("POST /diagnose with valid image")
    try:
        img_data, img_name = get_test_image('JPEG')
        mime_type = 'image/jpeg' if img_name.lower().endswith(('.jpg', '.jpeg')) else 'image/png'
        files = {'file': (img_name, img_data, mime_type)}
        response = requests.post(f"{BASE_URL}/diagnose", files=files, timeout=TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            # Validate response structure
            required_fields = ['status', 'detection', 'report', 'urgency_level', 'action_plan']
            missing = [f for f in required_fields if f not in data]
            
            if missing:
                print_fail(f"Missing fields: {missing}")
                return False
            
            # Validate detection structure
            detection = data['detection']
            detection_fields = ['detections', 'classification', 'detection_image']
            missing_det = [f for f in detection_fields if f not in detection]
            
            if missing_det:
                print_fail(f"Missing detection fields: {missing_det}")
                return False
            
            # Validate detections array
            detections = detection.get('detections', [])
            if not isinstance(detections, list):
                print_fail(f"Detections should be a list, got {type(detections)}")
                return False
            
            # Validate classification probabilities
            probs = detection.get('classification', {})
            if len(probs) != 6:
                print_fail(f"Expected 6 classification probabilities, got {len(probs)}")
                return False
            
            # Validate detection_image is base64
            detection_img = detection.get('detection_image', '')
            if not detection_img or len(detection_img) < 100:
                print_fail("detection_image is missing or too small")
                return False
            
            # Validate report fields
            report = data.get('report', '')
            if not report or len(report) < 20:
                print_fail("report should be a meaningful summary")
                return False
            
            action_plan = data.get('action_plan', [])
            if not isinstance(action_plan, list) or len(action_plan) < 2:
                print_fail("action_plan should have at least 2 steps")
                return False
            
            print_pass("Response valid and complete")
            
            # Display report information
            print_info(f"Report: {report[:100]}...")
            print_info(f"Urgency Level: {data['urgency_level']}")
            print_info(f"Action Plan:")
            for step in action_plan:
                print_info(f"  • {step}")
            
            # Display detections
            detections = detection.get('detections', [])
            if detections:
                print_info(f"Detected {len(detections)} object(s):")
                for det in detections:
                    print_info(f"  • {det['label']}: {det['confidence']:.2%} confidence")
            else:
                print_info("No objects detected")
            
            print_info(f"Classification Probabilities:")
            for class_name, prob in probs.items():
                print_info(f"  • {class_name}: {prob:.2%}")
            
            # Save detection image
            img_path = save_detection_image(detection_img, "diagnose_jpeg")
            if img_path:
                print_info(f"Detection image saved: {img_path}")
            return True
        else:
            print_fail(f"Status {response.status_code}: {response.text[:100]}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_diagnose_invalid_type():
    """Test POST /diagnose with invalid MIME type"""
    print_test("POST /diagnose with invalid MIME type (text/plain)")
    try:
        files = {'file': ('test.txt', b'invalid content', 'text/plain')}
        response = requests.post(f"{BASE_URL}/diagnose", files=files, timeout=TIMEOUT)
        
        if response.status_code == 415:
            print_pass(f"Correctly rejected with 415 Unsupported Media Type")
            return True
        else:
            print_fail(f"Expected 415, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_diagnose_large_file():
    """Test POST /diagnose with file larger than 10MB"""
    print_test("POST /diagnose with oversized file (>10MB)")
    try:
        # Create large file
        large_data = b'x' * (11 * 1024 * 1024)
        files = {'file': ('large.jpg', large_data, 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/diagnose", files=files, timeout=TIMEOUT)
        
        if response.status_code == 413:
            print_pass("Correctly rejected with 413 Payload Too Large")
            return True
        else:
            print_fail(f"Expected 413, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_diagnose_no_file():
    """Test POST /diagnose without file"""
    print_test("POST /diagnose without file")
    try:
        response = requests.post(f"{BASE_URL}/diagnose", timeout=TIMEOUT)
        
        if response.status_code == 422:
            print_pass("Correctly rejected with 422 Unprocessable Entity")
            return True
        else:
            print_fail(f"Expected 422, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_chat_endpoint():
    """Test POST /chat endpoint"""
    print_test("POST /chat with valid question")
    try:
        payload = {
            "question": "What does the report say about my teeth?",
            "context": "The analysis indicates Caries with 96% confidence."
        }
        response = requests.post(f"{BASE_URL}/chat", json=payload, timeout=TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            if 'answer' in data:
                print_pass()
                print_info(f"Answer: {data['answer'][:100]}...")
                return True
            else:
                print_fail("Response missing 'answer' field")
                return False
        else:
            print_fail(f"Status {response.status_code}: {response.text[:100]}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_chat_empty_question():
    """Test POST /chat with empty question"""
    print_test("POST /chat with empty question")
    try:
        payload = {
            "question": "",
            "context": "Some context"
        }
        response = requests.post(f"{BASE_URL}/chat", json=payload, timeout=TIMEOUT)
        
        if response.status_code == 422:
            print_pass("Correctly rejected empty question")
            return True
        else:
            print_fail(f"Expected 422, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_chat_missing_fields():
    """Test POST /chat with missing fields"""
    print_test("POST /chat with missing fields")
    try:
        payload = {"question": "Test"}  # Missing context
        response = requests.post(f"{BASE_URL}/chat", json=payload, timeout=TIMEOUT)
        
        if response.status_code == 422:
            print_pass("Correctly rejected due to missing field")
            return True
        else:
            print_fail(f"Expected 422, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def test_docs_endpoint():
    """Test GET /docs (OpenAPI UI)"""
    print_test("GET /docs (API documentation)")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=TIMEOUT)
        
        if response.status_code == 200:
            if 'swagger' in response.text.lower() or 'openapi' in response.text.lower():
                print_pass()
                return True
            else:
                print_fail("Response doesn't contain OpenAPI documentation")
                return False
        else:
            print_fail(f"Status {response.status_code}")
            return False
    except Exception as e:
        print_fail(str(e))
        return False

def run_all_tests():
    """Run all tests"""
    print_header("🏥 DENTAL AI API TEST SUITE")
    
    # Show available test images
    available_images = list_test_images()
    print_info(f"Test images directory: {IMAGES_DIR}")
    if available_images:
        print_success(f"Found {len(available_images)} test image(s):")
        for img in available_images:
            print(f"     • {img.name}")
    else:
        print_warning("No test images found in tests/images/")
        print_info("Using synthetic images for testing")
    print()
    
    # Check server first
    if not check_server_health():
        print_error("Cannot proceed without server")
        return False
    
    print_header("🔍 BASIC ENDPOINT TESTS")
    test_root_endpoint()
    test_docs_endpoint()
    
    print_header("📸 DIAGNOSE ENDPOINT TESTS (Valid Cases)")
    test_diagnose_with_valid_image()
    
    print_header("⚠️  DIAGNOSE ENDPOINT TESTS (Error Cases)")
    test_diagnose_invalid_type()
    test_diagnose_large_file()
    test_diagnose_no_file()
    
    print_header("💬 CHAT ENDPOINT TESTS")
    test_chat_endpoint()
    test_chat_empty_question()
    test_chat_missing_fields()
    
    # Summary
    print_header("📊 TEST RESULTS")
    total_tests = passed + failed
    percentage = (passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"  {Colors.BOLD}Total Tests:{Colors.NC} {total_tests}")
    print(f"  {Colors.GREEN}{Colors.BOLD}Passed:{Colors.NC} {passed}")
    print(f"  {Colors.RED}{Colors.BOLD}Failed:{Colors.NC} {failed}")
    print(f"  {Colors.BOLD}Success Rate:{Colors.NC} {percentage:.1f}%")
    print()
    
    if failed == 0:
        print(f"  {Colors.GREEN}{Colors.BOLD}✓ ALL TESTS PASSED!{Colors.NC}")
    else:
        print(f"  {Colors.RED}{Colors.BOLD}✗ SOME TESTS FAILED{Colors.NC}")
    
    # Show output info
    print()
    print(f"  {Colors.BLUE}📁 Test Images:{Colors.NC} {IMAGES_DIR}")
    print(f"  {Colors.BLUE}📁 Output Images:{Colors.NC} {OUTPUT_DIR}")
    if list(OUTPUT_DIR.glob("*.png")):
        file_count = len(list(OUTPUT_DIR.glob("*.png")))
        print(f"  {Colors.GREEN}✓{Colors.NC} {file_count} detection image(s) saved")
    
    return failed == 0

if __name__ == '__main__':
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted by user{Colors.NC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {str(e)}{Colors.NC}")
        sys.exit(1)
