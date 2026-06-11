import cv2
import numpy as np
import os

def check_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Could not load {image_path}")
        return

    # Coordinates of white lines
    y_lines = [60, 211, 362, 512]
    x_lines = [145, 222, 296, 372, 445, 521, 596, 670, 744, 818, 892, 966]

    # Let's perform rule-based occupancy check for all 3x11 physical slots
    results_11 = np.zeros((3, 11), dtype=int)
    
    # We will use the same rule-based detector parameters
    # but apply them inside the exact boxes.
    # To avoid the white lines themselves, we pad each box.
    pad_frac = 0.22

    for r in range(3):
        y1, y2 = y_lines[r], y_lines[r+1]
        for c in range(11):
            x1, x2 = x_lines[c], x_lines[c+1]
            cell = img[y1:y2, x1:x2]
            
            h, w = cell.shape[:2]
            ph, pw = int(h * pad_frac), int(w * pad_frac)
            roi = cell[ph : h - ph, pw : w - pw]
            
            if roi.size == 0:
                continue
                
            roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            pixels = roi_rgb.reshape(-1, 3).astype(float)
            n_pixels = pixels.shape[0]

            # 1. Color check (deviation from gray)
            color_diff = np.max(pixels, axis=1) - np.min(pixels, axis=1)
            color_mask = color_diff > 18.0

            # 2. White check (bright gray, non-colored)
            mean_rgb = np.mean(pixels, axis=1)
            white_mask = (mean_rgb > 120.0) & (~color_mask)

            # 3. Black check (dark gray / shadow)
            black_mask = mean_rgb < 38.0

            car_mask = color_mask | white_mask | black_mask
            car_pct = (np.sum(car_mask) / n_pixels) * 100.0
            
            # If car_pct >= 28.0%, then occupied
            results_11[r, c] = 1 if car_pct >= 28.0 else 0

    # Map the 11 physical columns to 10 logical slot IDs
    # Column mapping:
    # Col 1 -> C1
    # Col 2 -> C2
    # Col 3 -> C3
    # Col 4 -> C4
    # Col 5 -> C5
    # Col 6 -> C6
    # Col 7 & 8 -> C7 (OR operation: occupied if either is occupied)
    # Col 9 -> C8
    # Col 10 -> C9
    # Col 11 -> C10
    
    logical_results = {}
    row_labels = ["a", "b", "c"]
    for r in range(3):
        rl = row_labels[r]
        for c in range(11):
            if c < 6:
                logical_col = c + 1
                status = results_11[r, c]
            elif c == 6 or c == 7:
                logical_col = 7
                # For C7, it is occupied if either physical Col 7 or Col 8 is occupied
                status = results_11[r, 6] | results_11[r, 7]
            else:
                logical_col = c  # since Col 9 -> C8, Col 10 -> C9, Col 11 -> C10
                status = results_11[r, c]
            
            slot_id = f"{rl}{logical_col}"
            # If already set, do OR operation
            if slot_id in logical_results:
                logical_results[slot_id] = logical_results[slot_id] | status
            else:
                logical_results[slot_id] = status
                
    return logical_results

def main():
    img_dir = "images"
    exts = {".jpg", ".jpeg", ".png"}
    files = sorted([
        os.path.join(img_dir, f) for f in os.listdir(img_dir)
        if os.path.splitext(f)[1].lower() in exts
        and "_debug" not in f
        and "_calibration" not in f
        and "vis_" not in f
    ])
    
    for f in files:
        print(f"\nImage: {os.path.basename(f)}")
        res = check_image(f)
        # Print row by row
        row_labels = ["a", "b", "c"]
        for rl in row_labels:
            row_str = []
            for col in range(1, 11):
                slot_id = f"{rl}{col}"
                status = res[slot_id]
                row_str.append(f"{slot_id}:{'X' if status else ' '}")
            print("  " + "  ".join(row_str))

if __name__ == "__main__":
    main()
