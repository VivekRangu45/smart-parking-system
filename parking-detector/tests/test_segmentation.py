# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import cv2
import numpy as np

# Ground truth for WhatsApp_Image_2026-06-11_at_05.38.39.jpeg
GROUND_TRUTH = {
    "a2": 1, "a6": 1, "a8": 1,
    "b1": 1, "b4": 1, "b10": 1,
    "c2": 1, "c10": 1,
}

def run(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Cannot open {image_path}")
        return

    # Use CROP from config
    h, w = img.shape[:2]
    CROP = {"top": 0.10, "bottom": 0.03, "left": 0.09, "right": 0.02}
    y1, y2 = int(h * CROP["top"]), int(h * (1.0 - CROP["bottom"]))
    x1, x2 = int(w * CROP["left"]), int(w * (1.0 - CROP["right"]))
    grid_img = img[y1:y2, x1:x2]
    
    gh, gw = grid_img.shape[:2]
    GRID_ROWS, GRID_COLS = 3, 10
    ROW_LABELS = ["a", "b", "c"]
    cell_w = gw / GRID_COLS
    cell_h = gh / GRID_ROWS

    pad_frac = 0.20 # 20% padding

    print(f"\nRule-Based Pixel Segmentation Analysis:")
    print(f"{'Slot':>5}  {'Truth':>5}  {'Color %':>8}  {'White %':>8}  {'Black %':>8}  {'Total Car %':>12}")
    print("-" * 65)

    results = []

    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            cy1, cy2 = int(r * cell_h), int((r + 1) * cell_h)
            cx1, cx2 = int(c * cell_w), int((c + 1) * cell_w)
            slot = grid_img[cy1:cy2, cx1:cx2]
            
            # Apply padding
            sh, sw = slot.shape[:2]
            ph = int(sh * pad_frac)
            pw = int(sw * pad_frac)
            roi = slot[ph : sh - ph, pw : sw - pw]
            
            slot_id = f"{ROW_LABELS[r]}{c + 1}"
            truth = GROUND_TRUTH.get(slot_id, 0)
            
            # Reshape ROI to pixels (RGB)
            roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            pixels = roi_rgb.reshape(-1, 3).astype(float)
            n_pixels = pixels.shape[0]
            
            # 1. Color check: max(R,G,B) - min(R,G,B) > 20
            color_diff = np.max(pixels, axis=1) - np.min(pixels, axis=1)
            color_mask = color_diff > 22.0
            color_pct = (np.sum(color_mask) / n_pixels) * 100.0
            
            # 2. White check: mean(R,G,B) > 130 and max(R,G,B) - min(R,G,B) <= 20
            mean_rgb = np.mean(pixels, axis=1)
            white_mask = (mean_rgb > 135.0) & (~color_mask)
            white_pct = (np.sum(white_mask) / n_pixels) * 100.0
            
            # 3. Black check: mean(R,G,B) < 45
            black_mask = mean_rgb < 45.0
            black_pct = (np.sum(black_mask) / n_pixels) * 100.0
            
            # Total car pixels
            car_mask = color_mask | white_mask | black_mask
            car_pct = (np.sum(car_mask) / n_pixels) * 100.0

            print(f"{slot_id:>5}  {('OCC' if truth else 'EMP'):>5}  "
                  f"{color_pct:>7.1f}%  "
                  f"{white_pct:>7.1f}%  "
                  f"{black_pct:>7.1f}%  "
                  f"{car_pct:>10.1f}%")
                  
            results.append({
                "slot_id": slot_id,
                "truth": truth,
                "car_pct": car_pct
            })

    occ_pcts = [r["car_pct"] for r in results if r["truth"] == 1]
    emp_pcts = [r["car_pct"] for r in results if r["truth"] == 0]

    print(f"\nOccupied slots Car %: mean={np.mean(occ_pcts):.2f}%, min={np.min(occ_pcts):.2f}%, max={np.max(occ_pcts):.2f}%")
    print(f"Empty slots Car %:    mean={np.mean(emp_pcts):.2f}%, min={np.min(emp_pcts):.2f}%, max={np.max(emp_pcts):.2f}%")

if __name__ == "__main__":
    run("images/WhatsApp_Image_2026-06-11_at_05.38.39.jpeg")
