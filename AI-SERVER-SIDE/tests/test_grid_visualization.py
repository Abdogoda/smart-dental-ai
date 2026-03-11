#!/usr/bin/env python3
"""
Grid Visualization Test - Process 8 images and create a 2x4 grid visualization
with detection results, classification labels, detection counts, and probabilities.
"""

import sys
import json
import base64
import requests
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from datetime import datetime

# Config
BASE_URL = "http://localhost:8000"
TIMEOUT = 30
TESTS_DIR = Path(__file__).parent
IMAGES_DIR = TESTS_DIR / "images"
OUTPUT_DIR = TESTS_DIR / "output"

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)

# ANSI color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}")
    print(f"{text:^60}")
    print(f"{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.CYAN}ℹ {text}{Colors.END}")

def print_progress(text):
    print(f"{Colors.YELLOW}→ {text}{Colors.END}")

def create_test_image(width=640, height=480):
    """Create a test image with random patterns"""
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    import random
    for _ in range(50):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        draw.line([(x1, y1), (x2, y2)], fill=color, width=2)
    
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def get_test_images(max_images=8):
    """Get max_images random test images (real or generated)"""
    images = []
    
    # Look for real images
    real_images = list(IMAGES_DIR.glob("*.[jJ][pP][gG]*")) + \
                  list(IMAGES_DIR.glob("*.[pP][nN][gG]")) + \
                  list(IMAGES_DIR.glob("*.[wW][eE][bB][pP]"))
    
    # Shuffle and select random images
    random.shuffle(real_images)
    for img_path in real_images[:max_images]:
        with open(img_path, 'rb') as f:
            images.append((f.read(), img_path.name))
    
    # Fill with generated images if needed
    while len(images) < max_images:
        images.append((create_test_image(), f"generated_{len(images)+1}.png"))
    
    return images[:max_images]

def diagnose_image(img_data, img_name):
    """Send image for diagnosis"""
    try:
        # Determine MIME type
        if img_name.lower().endswith(('.jpg', '.jpeg')):
            mime_type = 'image/jpeg'
        elif img_name.lower().endswith('.png'):
            mime_type = 'image/png'
        elif img_name.lower().endswith('.webp'):
            mime_type = 'image/webp'
        else:
            mime_type = 'image/jpeg'
        
        files = {'file': (img_name, img_data, mime_type)}
        response = requests.post(f"{BASE_URL}/diagnose", files=files, timeout=TIMEOUT)
        
        if response.status_code == 200:
            return response.json()
        else:
            print_error(f"Failed to diagnose {img_name}: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error diagnosing {img_name}: {str(e)}")
        return None

def create_grid_image(results, output_path):
    """
    Create a 2x4 grid visualization with results.
    Grid layout:
    [Image 1] [Image 2] [Image 3] [Image 4]
    [Image 5] [Image 6] [Image 7] [Image 8]
    """
    try:
        GRID_COLS = 4
        GRID_ROWS = 2
        CELL_WIDTH = 320
        CELL_HEIGHT = 400  # Larger to show text
        MARGIN = 10
        TEXT_AREA = 120
        
        grid_width = GRID_COLS * (CELL_WIDTH + MARGIN) + MARGIN
        grid_height = GRID_ROWS * (CELL_HEIGHT + MARGIN) + MARGIN
        
        grid_img = Image.new('RGB', (grid_width, grid_height), color='white')
        draw = ImageDraw.Draw(grid_img)
        
        # Try to use a default font, fallback to default if not available
        try:
            font_large = ImageFont.truetype("arial.ttf", 12)
            font_small = ImageFont.truetype("arial.ttf", 10)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        for idx, result in enumerate(results[:GRID_COLS * GRID_ROWS]):
            if result is None:
                continue
            
            row = idx // GRID_COLS
            col = idx % GRID_COLS
            x_start = MARGIN + col * (CELL_WIDTH + MARGIN)
            y_start = MARGIN + row * (CELL_HEIGHT + MARGIN)
            
            # Get detection image
            try:
                detection_img_b64 = result['detection']['detection_image']
                detection_img_data = base64.b64decode(detection_img_b64)
                detection_img = Image.open(BytesIO(detection_img_data)).convert('RGB')
                
                # Resize to fit cell
                detection_img.thumbnail((CELL_WIDTH, CELL_WIDTH), Image.Resampling.LANCZOS)
                grid_img.paste(detection_img, (x_start, y_start))
            except Exception as e:
                # Draw error box
                draw.rectangle(
                    [(x_start, y_start), (x_start + CELL_WIDTH, y_start + CELL_WIDTH)],
                    fill='#ffcccc'
                )
                draw.text((x_start + 10, y_start + 10), "Image Error", fill='red', font=font_small)
            
            # Draw text below image
            text_y = y_start + CELL_WIDTH + 5
            
            # Classification info
            classification = result['detection']['classification_label']
            conf = result['detection']['classification_confidence']
            draw.text((x_start + 5, text_y), f"Class: {classification}", fill='black', font=font_small)
            draw.text((x_start + 5, text_y + 15), f"Conf: {conf:.1%}", fill='black', font=font_small)
            
            # Detection count
            detections = result['detection'].get('detections', [])
            det_count = len(detections)
            draw.text((x_start + 5, text_y + 30), f"Detected: {det_count} obj(s)", fill='blue', font=font_small)
            
            # Top detected object
            if detections:
                top_det = detections[0]
                draw.text(
                    (x_start + 5, text_y + 45),
                    f"Top: {top_det['label'][:15]}",
                    fill='darkblue',
                    font=font_small
                )
                draw.text(
                    (x_start + 5, text_y + 60),
                    f"({top_det['confidence']:.1%})",
                    fill='darkblue',
                    font=font_small
                )
        
        # Save grid
        grid_img.save(output_path)
        return output_path
    
    except Exception as e:
        print_error(f"Error creating grid: {str(e)}")
        return None

def main():
    """Main execution"""
    print_header("Grid Visualization Test - 2x4 Results Grid")
    
    # Check server
    print_progress("Checking server connectivity...")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code != 200:
            print_error("Server not responding")
            return False
    except:
        print_error("Cannot connect to server at {BASE_URL}")
        print_info("Make sure the server is running: ./setup.sh -> Option 6")
        return False
    
    print_success("Server is running")
    
    # Get test images
    print_progress("Loading test images...")
    images = get_test_images(8)
    print_success(f"Loaded {len(images)} image(s)")
    for _, img_name in images:
        print_info(f"  • {img_name}")
    
    # Process images
    print_progress("Processing images with AI model...")
    results = []
    for idx, (img_data, img_name) in enumerate(images, 1):
        print_progress(f"Processing image {idx}/8: {img_name}...")
        result = diagnose_image(img_data, img_name)
        if result:
            results.append(result)
            # Display results
            detection = result['detection']
            detections = detection.get('detections', [])
            print_info(f"  ✓ Classification: {detection['classification_label']} "
                      f"({detection['classification_confidence']:.1%})")
            if detections:
                print_info(f"  ✓ Detected {len(detections)} object(s):")
                for det in detections[:3]:
                    print_info(f"    - {det['label']}: {det['confidence']:.1%}")
                if len(detections) > 3:
                    print_info(f"    ... and {len(detections)-3} more")
        else:
            results.append(None)
            print_error(f"  Failed to process image")
    
    # Create grid
    print_progress("Creating visualization grid...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = OUTPUT_DIR / f"grid_visualization_{timestamp}.png"
    
    grid_path = create_grid_image(results, output_path)
    if grid_path:
        print_success(f"Grid visualization saved: {grid_path}")
        print_info(f"Image size: {Image.open(grid_path).size}")
    else:
        print_error("Failed to create grid visualization")
        return False
    
    # Summary
    print_header("Test Summary")
    successful = len([r for r in results if r is not None])
    print_success(f"Processed: {successful}/{len(results)} images successfully")
    print_success(f"Output: {grid_path}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
