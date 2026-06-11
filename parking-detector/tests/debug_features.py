"""
Quick standalone test of per-slot analysis thresholds.
Prints feature scores for every slot so we can tune thresholds.

Usage:
    py tests/debug_features.py --image images/your_parking_lot.jpg
"""
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import argparse, os
import cv2
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import GRID_ROWS, GRID_COLS, ROW_LABELS, CROP, SLOT_PADDING_FRAC
from core.detector import _crop_to_grid, _analyze_slot

def run(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Cannot open: {image_path}"); return

    grid_img, _, _ = _crop_to_grid(img)
    gh, gw = grid_img.shape[:2]
    cw, ch = gw / GRID_COLS, gh / GRID_ROWS

    print(f"\nImage: {image_path}  |  Grid: {gw}x{gh}  |  Cell: {cw:.0f}x{ch:.0f}")
    print(f"\n{'Slot':>5}  {'Sat':>6}  {'BrtStd':>7}  {'Edges':>7}  {'LABdev':>7}  {'Detect':>8}")
    print("  " + "-"*52)

    from core.config import (SAT_THRESHOLD, BRIGHTNESS_STD_THRESHOLD,
                              EDGE_DENSITY_THRESHOLD, LAB_DEVIATION_THRESHOLD)

    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            y1 = int(r * ch); y2 = int((r+1) * ch)
            x1 = int(c * cw); x2 = int((c+1) * cw)
            slot = grid_img[y1:y2, x1:x2]
            is_occ, scores = _analyze_slot(slot)
            sid = f"{ROW_LABELS[r]}{c+1}"
            flag = "[OCCUPIED]" if is_occ else "[ empty  ]"
            print(f"  {sid:>5}  "
                  f"{scores.get('sat_mean',0):>6.1f}  "
                  f"{scores.get('brightness_std',0):>7.1f}  "
                  f"{scores.get('edge_density',0)*100:>6.1f}%  "
                  f"{scores.get('lab_deviation',0):>7.2f}  "
                  f"  {flag}")

    print(f"\nThresholds: Sat>{SAT_THRESHOLD}  BrtStd>{BRIGHTNESS_STD_THRESHOLD}  "
          f"Edges>{EDGE_DENSITY_THRESHOLD*100:.0f}%  LAB>{LAB_DEVIATION_THRESHOLD}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    run(args.image)
