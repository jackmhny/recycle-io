#!/usr/bin/env python3
from PIL import Image

def create_white_square(size=(32, 32), color='white'):
    """Creates a simple image."""
    img = Image.new("RGB", size, color)
    return img

if __name__ == "__main__":
    try:
        image = create_white_square()
        output_path = "favicon.ico"
        image.save(output_path)
        print(f"Image saved to {output_path}")
    except ImportError:
        print("Pillow library not found. Please install it with 'pip install Pillow'")

