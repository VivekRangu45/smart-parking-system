# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import cv2
import numpy as np

# Ground truths for the 5 images (corrected c3 occupied, c2 empty for reference image)
GROUND_TRUTHS = {
    "WhatsApp_Image_2026-06-11_at_05.38.39.jpeg": {
        "a2": 1, "a6": 1, "a8": 1, "b1": 1, "b4": 1, "b10": 1, "c3": 1, "c10": 1
    },
    "img_3.jpg": {
        "a2": 1, "a6": 1, "a8": 1, "b1": 1, "b4": 1, "b10": 1, "c3": 1, "c10": 1
    },
    "img_4.jpg": {
        "a5": 1, "b1": 1, "c2": 1, "c5": 1, "c10": 1
    },
    "img_1.jpg": {
        "a2": 1, "a4": 1, "a6": 1, "a8": 1, "a9": 1,
        "b1": 1, "b3": 1, "b5": 1, "b7": 1, "b10": 1,
        "c1": 1, "c2": 1, "c4": 1, "c7": 1, "c8": 1, "c9": 1, "c10": 1
    },
    "img_2.jpg": {
        "a1": 1, "a4": 1, "a5": 1, "a7": 1, "a9": 1,
        "b2": 1, "b3": 1, "b6": 1, "b8": 1, "b10": 1,
        "c1": 1, "c3": 1, "c4": 1, "c5": 1, "c7": 1, "c8": 1, "c9": 1
    }
}

def analyze_image(image_path, pad_frac=0.22, dist_threshold=16.0):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Cannot open {image_path}")
        return

    fname = os.path.basename(image_path)
    gt = GROUND_TRUTHS.get(fname, {})

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

    # 1. Extract ROIs and average BGR for each slot
    slot_rois = {}
    slot_means = {}
    
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
            slot_means[slot_id] = roi.mean(axis=(0, 1))

    # 2. Filter slots to find guaranteed empty road pavement
    road_candidates = []
    for slot_id, mean_bgr in slot_means.items():
        # Skip if it is known occupied in ground truth (just to get a clean baseline for testing)
        # In production, we use the saturation/brightness check
        if gt.get(slot_id, 0) == 1:
            continue
        
        b, g, r_val = mean_bgr
        brightness = (b + g + r_val) / 3.0
        saturation = max(b, g, r_val) - min(b, g, r_val)
        
        # Road pavement is grayish and medium brightness
        if saturation < 15.0 and 60.0 < brightness < 110.0:
            road_candidates.append(mean_bgr)

    if not road_candidates:
        # Fallback using unsupervised method
        for slot_id, mean_bgr in slot_means.items():
            b, g, r_val = mean_bgr
            brightness = (b + g + r_val) / 3.0
            saturation = max(b, g, r_val) - min(b, g, r_val)
            if saturation < 15.0 and 60.0 < brightness < 110.0:
                road_candidates.append(mean_bgr)

    if not road_candidates:
        road_candidates = list(slot_means.values())

    # True road baseline color
    road_baseline = np.mean(road_candidates, axis=0)
    
    print(f"\nImage: {fname}")
    print(f"  Road Color Baseline (BGR): ({road_baseline[0]:.1f}, {road_baseline[1]:.1f}, {road_baseline[2]:.1f})")
    print(f"  {'Slot':>5}  {'Truth':>5}  {'Non-Road Pixel %':>18}")
    print("  " + "-" * 32)

    slot_pcts = {}
    for slot_id, roi in slot_rois.items():
        pixels = roi.reshape(-1, 3).astype(float)
        n_pixels = pixels.shape[0]
        
        # BGR Euclidean distance from baseline
        diffs = np.linalg.norm(pixels - road_baseline, axis=1)
        non_road_mask = diffs > dist_threshold
        non_road_pct = (np.sum(non_road_mask) / n_pixels) * 100.0
        slot_pcts[slot_id] = non_road_pct
        
        truth_str = "OCC" if gt.get(slot_id, 0) == 1 else "EMP"
        print(f"  {slot_id:>5}  {truth_str:>5}  {non_road_pct:>17.1f}%")

    occ_pcts = [pct for slot_id, pct in slot_pcts.items() if gt.get(slot_id, 0) == 1]
    emp_pcts = [pct for slot_id, pct in slot_pcts.items() if gt.get(slot_id, 0) == 0]

    print(f"\n  Occupied slots non-road %: mean={np.mean(occ_pcts):.1f}%, min={np.min(occ_pcts):.1f}%, max={np.max(occ_pcts):.1f}%")
    print(f"  Empty slots non-road %:    mean={np.mean(emp_pcts):.1f}%, min={np.min(emp_pcts):.1f}%, max={np.max(emp_pcts):.1f}%")

def main():
    img_dir = "images"
    exts = {".jpg", ".jpeg", ".png"}
    files = sorted([os.path.join(img_dir, f) for f in os.listdir(img_dir) if os.path.splitext(f)[1].lower() in exts and "_debug" not in f and "_calibration" not in f])
    
    for f in files:
        analyze_image(f)

if __name__ == "__main__":
    main()
