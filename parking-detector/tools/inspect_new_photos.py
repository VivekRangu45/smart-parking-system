import os
import cv2
import numpy as np

def compare_images():
    brain_dir = r"C:\Users\hp\.gemini\antigravity\brain\35241271-c4d3-4de4-8e76-710df5e3a68c"
    new_media_files = [
        "media__1781145060804.jpg",
        "media__1781145060805.jpg",
        "media__1781145060809.jpg",
        "media__1781145060858.jpg"
    ]
    
    images_dir = "images"
    existing_images = [
        "img_1.jpg",
        "img_2.jpg",
        "img_3.jpg",
        "img_4.jpg",
        "WhatsApp_Image_2026-06-11_at_05.38.39.jpeg"
    ]

    print("--- Comparing dimensions and mean pixel values ---")
    for media_name in new_media_files:
        media_path = os.path.join(brain_dir, media_name)
        if not os.path.exists(media_path):
            print(f"New media file {media_name} not found in brain folder.")
            continue
        
        img_media = cv2.imread(media_path)
        h, w, c = img_media.shape
        mean_media = np.mean(img_media)
        print(f"New media: {media_name} -> shape={h}x{w}x{c}, mean={mean_media:.3f}")

        # Check match with existing
        matched = False
        for ext_name in existing_images:
            ext_path = os.path.join(images_dir, ext_name)
            if not os.path.exists(ext_path):
                continue
            img_ext = cv2.imread(ext_path)
            if img_ext.shape == img_media.shape:
                diff = cv2.absdiff(img_media, img_ext)
                if np.sum(diff) == 0:
                    print(f"  => EXACT MATCH WITH {ext_name}")
                    matched = True
                    break
        if not matched:
            print("  => No exact match found. This is a NEW image.")

if __name__ == "__main__":
    compare_images()
