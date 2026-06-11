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

    # Larger padding to completely exclude grid lines
    pad_frac = 0.28

    print(f"\nFeature Analysis with PADDING = {pad_frac * 100:.0f}%:")
    print(f"{'Slot':>5}  {'Truth':>5}  {'SatMean':>7}  {'ValStd':>7}  {'HueStd':>7}  {'Edges':>6}  {'LABdev':>7}")
    print("-" * 55)

    feature_data = []

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
            
            # Feature extraction
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            
            sat_mean = float(hsv[:, :, 1].mean())
            val_std = float(hsv[:, :, 2].std())
            hue_std = float(hsv[:, :, 0].std())
            
            # Edges
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
            enh = clahe.apply(gray)
            edges = cv2.Canny(enh, 30, 100)
            edge_density = float(edges.sum()) / (255.0 * edges.size) if edges.size > 0 else 0
            
            # LAB color deviation
            a_dev = float(np.abs(lab[:, :, 1] - 128).mean())
            b_dev = float(np.abs(lab[:, :, 2] - 128).mean())
            lab_dev = (a_dev + b_dev) / 2.0

            print(f"{slot_id:>5}  {('OCC' if truth else 'EMP'):>5}  "
                  f"{sat_mean:>7.1f}  "
                  f"{val_std:>7.1f}  "
                  f"{hue_std:>7.1f}  "
                  f"{edge_density*100:>6.1f}%  "
                  f"{lab_dev:>7.2f}")
                  
            feature_data.append({
                "slot_id": slot_id,
                "truth": truth,
                "sat_mean": sat_mean,
                "val_std": val_std,
                "hue_std": hue_std,
                "edge_density": edge_density,
                "lab_dev": lab_dev
            })

    # Group and print summary
    for feat_name in ["sat_mean", "val_std", "hue_std", "edge_density", "lab_dev"]:
        occ_vals = [f[feat_name] for f in feature_data if f["truth"] == 1]
        emp_vals = [f[feat_name] for f in feature_data if f["truth"] == 0]
        print(f"\nFeature '{feat_name}':")
        print(f"  Occupied: mean={np.mean(occ_vals):.3f}, min={np.min(occ_vals):.3f}, max={np.max(occ_vals):.3f}")
        print(f"  Empty:    mean={np.mean(emp_vals):.3f}, min={np.min(emp_vals):.3f}, max={np.max(emp_vals):.3f}")

if __name__ == "__main__":
    run("images/WhatsApp_Image_2026-06-11_at_05.38.39.jpeg")
