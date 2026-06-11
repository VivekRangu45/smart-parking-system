# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import cv2
import numpy as np

def analyze_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Cannot open {image_path}")
        return

    # Aligned CROP boundaries
    h, w = img.shape[:2]
    CROP = {"top": 0.109, "bottom": 0.084, "left": 0.139, "right": 0.055}
    y1, y2 = int(h * CROP["top"]), int(h * (1.0 - CROP["bottom"]))
    x1, x2 = int(w * CROP["left"]), int(w * (1.0 - CROP["right"]))
    grid_img = img[y1:y2, x1:x2]
    
    gh, gw = grid_img.shape[:2]
    GRID_ROWS, GRID_COLS = 3, 10
    ROW_LABELS = ["a", "b", "c"]
    cell_w = gw / GRID_COLS
    cell_h = gh / GRID_ROWS

    pad_frac = 0.25 # 25% padding
    tw, th = 60, 100

    row_rois = {r: [] for r in ROW_LABELS}
    for r in range(GRID_ROWS):
        row_lbl = ROW_LABELS[r]
        for c in range(GRID_COLS):
            cy1, cy2 = int(r * cell_h), int((r + 1) * cell_h)
            cx1, cx2 = int(c * cell_w), int((c + 1) * cell_w)
            slot = grid_img[cy1:cy2, cx1:cx2]
            
            # Crop padded ROI
            sh, sw = slot.shape[:2]
            ph = int(sh * pad_frac)
            pw = int(sw * pad_frac)
            roi = slot[ph : sh - ph, pw : sw - pw]
            
            resized_roi = cv2.resize(roi, (tw, th))
            slot_id = f"{row_lbl}{c + 1}"
            row_rois[row_lbl].append((slot_id, resized_roi))

    # Compute row-specific templates
    row_templates = {}
    for r in ROW_LABELS:
        imgs = np.array([img for _, img in row_rois[r]])
        row_templates[r] = np.median(imgs, axis=0).astype(np.uint8)

    print(f"\nImage: {os.path.basename(image_path)}")
    print(f"Row Median + Padding Difference (MAE) values:")
    
    errors = {}
    for r in ROW_LABELS:
        template_gray = cv2.cvtColor(row_templates[r], cv2.COLOR_BGR2GRAY)
        
        row_str = []
        for slot_id, roi in row_rois[r]:
            roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            mae = float(np.mean(np.abs(roi_gray.astype(float) - template_gray.astype(float))))
            errors[slot_id] = mae
            row_str.append(f"{slot_id}:{mae:.1f}")
        print("  " + "  ".join(row_str))

    maes = list(errors.values())
    print(f"  Stats: min={min(maes):.2f}, max={max(maes):.2f}, mean={np.mean(maes):.2f}")

def main():
    img_dir = "images"
    exts = {".jpg", ".jpeg", ".png"}
    files = sorted([os.path.join(img_dir, f) for f in os.listdir(img_dir) if os.path.splitext(f)[1].lower() in exts and "_debug" not in f and "_calibration" not in f])
    
    for f in files:
        analyze_image(f)

if __name__ == "__main__":
    main()
