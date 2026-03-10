#!/usr/bin/env python3
"""
Dataset Splitter - Organize classification dataset into train/val folders
Usage: python split_dataset.py
"""

import os
import sys
from pathlib import Path
from sklearn.model_selection import train_test_split
import json
import argparse

# Class definitions
CLASS_NAMES = {
    'Calculus': 0,
    'Caries': 1,
    'Gingivitis': 2,
    'Hypodontia': 3,
    'Ulcer': 4,
    'Discoloration': 5
}

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}


def find_dataset(dataset_path):
    """Find the classification dataset"""
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset not found at: {dataset_path}")
        print("\n📂 Usage:")
        print("  python split_dataset.py /path/to/classification-dataset")
        sys.exit(1)
    
    # Count images per class
    class_images = {}
    for class_name in CLASS_NAMES.keys():
        class_path = os.path.join(dataset_path, class_name)
        
        if not os.path.exists(class_path):
            print(f"⚠ Class folder not found: {class_name}")
            continue
        
        # Find all images recursively
        images = []
        for root, dirs, files in os.walk(class_path):
            for file in files:
                if Path(file).suffix.lower() in IMAGE_EXTENSIONS:
                    images.append(os.path.join(root, file))
        
        class_images[class_name] = images
    
    return class_images


def create_symlink_or_copy(src, dst):
    """Create symlink, fallback to copy if it fails"""
    try:
        # Use relative symlink if possible
        os.symlink(src, dst)
        return True
    except:
        # Fallback: copy file
        try:
            import shutil
            shutil.copy2(src, dst)
            return False
        except Exception as e:
            print(f"  ❌ Error linking {os.path.basename(src)}: {e}")
            return False


def split_dataset(dataset_path, output_path, test_size=0.2, use_copy=False):
    """Split dataset into train/val folders"""
    
    print("🔍 Scanning dataset...\n")
    class_images = find_dataset(dataset_path)
    
    if not class_images:
        print("❌ No images found in dataset!")
        sys.exit(1)
    
    # Show summary
    total_images = sum(len(imgs) for imgs in class_images.values())
    print(f"✓ Found {total_images} images in {len(class_images)} classes:\n")
    for class_name, images in sorted(class_images.items()):
        print(f"  {class_name}: {len(images)} images")
    
    # Create output directories
    print(f"\n📁 Creating output structure at: {output_path}\n")
    os.makedirs(output_path, exist_ok=True)
    
    train_dir = os.path.join(output_path, 'train')
    val_dir = os.path.join(output_path, 'val')
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(val_dir, exist_ok=True)
    
    # Split and link/copy
    print(f"📊 Splitting 80/20 (train/val)...\n")
    if use_copy:
        print("  Using file COPY (slower)\n")
    else:
        print("  Using SYMLINKS (instant, no disk space)\n")
    
    total_train = 0
    total_val = 0
    symlink_count = 0
    copy_count = 0
    
    for class_name, images in sorted(class_images.items()):
        if not images:
            continue
        
        # Split 80/20
        train_imgs, val_imgs = train_test_split(images, test_size=test_size, random_state=42)
        
        # Create class directories
        train_class_dir = os.path.join(train_dir, class_name)
        val_class_dir = os.path.join(val_dir, class_name)
        os.makedirs(train_class_dir, exist_ok=True)
        os.makedirs(val_class_dir, exist_ok=True)
        
        # Link/copy training images
        print(f"  {class_name}...", end=" ", flush=True)
        for img_path in train_imgs:
            link_path = os.path.join(train_class_dir, os.path.basename(img_path))
            if not os.path.exists(link_path):
                if create_symlink_or_copy(img_path, link_path):
                    symlink_count += 1
                else:
                    copy_count += 1
        
        # Link/copy validation images
        for img_path in val_imgs:
            link_path = os.path.join(val_class_dir, os.path.basename(img_path))
            if not os.path.exists(link_path):
                if create_symlink_or_copy(img_path, link_path):
                    symlink_count += 1
                else:
                    copy_count += 1
        
        total_train += len(train_imgs)
        total_val += len(val_imgs)
        print(f"{len(train_imgs)}T / {len(val_imgs)}V")
    
    # Save class mapping
    class_mapping_file = os.path.join(output_path, 'class_mapping.json')
    with open(class_mapping_file, 'w') as f:
        json.dump(CLASS_NAMES, f, indent=2)
    
    # Summary
    print(f"\n✅ Dataset split complete!\n")
    print(f"📊 Summary:")
    print(f"  Train images: {total_train}")
    print(f"  Val images: {total_val}")
    print(f"  Total: {total_train + total_val}")
    print(f"\n📍 Output:")
    print(f"  {train_dir}/")
    print(f"  {val_dir}/")
    print(f"  {class_mapping_file}")
    
    if symlink_count > 0 or copy_count > 0:
        print(f"\n📌 Links created:")
        print(f"  Symlinks: {symlink_count}")
        print(f"  Copies: {copy_count}")
    
    print(f"\n💾 Directory structure ready for training!")


def main():
    parser = argparse.ArgumentParser(
        description="Split classification dataset into train/val folders",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python split_dataset.py datasets/classification-dataset
  python split_dataset.py datasets/classification-dataset -o data_split
  python split_dataset.py datasets/classification-dataset --copy  # Use file copy instead of symlinks
        """
    )
    
    parser.add_argument(
        "dataset",
        help="Path to classification-dataset folder"
    )
    parser.add_argument(
        "-o", "--output",
        default="data_split",
        help="Output directory (default: data_split)"
    )
    parser.add_argument(
        "-t", "--test-size",
        type=float,
        default=0.2,
        help="Test/validation split ratio (default: 0.2 = 20%%)"
    )
    parser.add_argument(
        "--copy",
        action="store_true",
        help="Use file copy instead of symlinks (slower, uses more disk space)"
    )
    
    args = parser.parse_args()
    
    # Resolve paths
    dataset_path = os.path.abspath(args.dataset)
    output_path = os.path.abspath(args.output)
    
    print("=" * 60)
    print("  📂 Classification Dataset Splitter")
    print("=" * 60)
    print()
    
    # Run split
    split_dataset(dataset_path, output_path, test_size=args.test_size, use_copy=args.copy)
    
    print("\n" + "=" * 60)
    print("✅ Done!")
    print("=" * 60)


if __name__ == "__main__":
    main()
