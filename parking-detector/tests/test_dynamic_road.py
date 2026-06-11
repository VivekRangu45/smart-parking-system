# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import cv2
import numpy as np

def analyze_image(image_path, pad_frac=0.22, dev_threshold=16.0, pct_threshold=18.0):
    img = cv2.imread(image_path)
    if img is None:
        return None

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

    # 1. Extract ROIs and compute variance for each slot
    slot_rois = {}
    slot_variances = []
    
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            cy1, cy2 = int(r * cell_h), int((r + 1) * cell_h)
            cx1, cx2 = int(c * cell_w), int((c + 1) * cell_w)
            slot = grid_img[cy1:cy2, cx1:cx2]
            
            # Crop padded ROI
            sh, sw = slot.shape[:2]
            ph, pw = int(sh * pad_frac), int(sw * pad_frac)
            roi = slot[ph : sh - ph, pw : sw - pw]
            
            slot_id = f"{ROW_LABELS[r]}{c + 1}"
            slot_rois[slot_id] = roi
            
            # Variance in grayscale
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            var = float(gray.var())
            slot_variances.append((slot_id, var))

    # 2. Sort by variance and select bottom 10 (guaranteed empty slots)
    slot_variances.sort(key=lambda x: x[1])
    empty_candidates = [slot_id for slot_id, _ in slot_variances[:10]]
    
    # 3. Compute BGR road profile (mean and std) from empty candidates
    road_pixels = []
    for slot_id in empty_candidates:
        roi = slot_rois[slot_id]
        road_pixels.append(roi.reshape(-1, 3))
    
    road_pixels = np.vstack(road_pixels).astype(float)
    road_mean = np.mean(road_pixels, axis=0) # [B, G, R]
    road_std = np.std(road_pixels, axis=0)
    
    # 4. Classify pixels in each slot
    occupied_slots = []
    
    for slot_id, roi in slot_rois.items():
        pixels = roi.reshape(-1, 3).astype(float)
        n_pixels = pixels.shape[0]
        
        # Distance from mean road color
        diffs = np.abs(pixels - road_mean)
        
        # A pixel is "non-road" if it deviates in B, G, or R by more than dev_threshold
        # (or 3 * road_std, but a fixed threshold of 16-20 BGR levels is extremely stable)
        non_road_mask = np.any(diffs > dev_threshold, axis=1)
        non_road_pct = (np.sum(non_road_mask) / n_pixels) * 100.0
        
        if non_road_pct >= pct_threshold:
            occupied_slots.append((slot_id, non_road_pct))

    print(f"\nImage: {os.path.basename(image_path)}")
    print(f"  Road Color Baseline (BGR): ({road_mean[0]:.1f}, {road_mean[1]:.1f}, {road_mean[2]:.1f})")
    print(f"  Occupied slots detected ({len(occupied_slots)}):")
    
    # Sort occupied slots by id
    occupied_slots.sort(key=lambda x: (x[0][0], int(x[0][1:])))
    print("  " + ", ".join([f"{sid}({pct:.1f}%)" for sid, pct in occupied_slots]))
    return [sid for sid, _ in occupied_slots]

def main():
    img_dir = "images"
    exts = {".jpg", ".jpeg", ".png"}
    files = sorted([os.path.join(img_dir, f) for f in os.listdir(img_dir) if os.path.splitext(f)[1].lower() in exts and "_debug" not in f and "_calibration" not in f])
    
    for f in files:
        analyze_image(f)

if __name__ == "__main__":
    main()
