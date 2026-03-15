# Test Images Directory

Place your dental images here for automated testing.

## Supported Formats

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WEBP (`.webp`)

## How It Works

When you run the test suite (`./setup.sh` → option 4), the test script will:

1. Scan this directory for image files
2. Use them for API endpoint testing
3. If no images are found, synthetic test images will be generated automatically

## Example Usage

1. Place dental images in this directory:

   ```
   tests/images/
   ├── dental_scan_1.jpg
   ├── sample_tooth.png
   └── dental_xray.webp
   ```

2. Run tests:

   ```bash
   ./setup.sh
   # Select option 4: Test API
   ```

3. Results are saved to `tests/output/` as annotated PNG images with YOLO detections

## Tips

- Use real dental images for more representative test results
- Multiple images can be in this directory; the test will use them in order
- Synthetic images are generated if this directory is empty
