# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
tools/calibrate.py
------------------
Grid Alignment Calibration Tool

Draws the slot grid ON TOP of your parking lot image using the hardcoded
X_LINES and Y_LINES coordinates in config.py so you can visually verify
that the grid cells align with the actual parking slots.

Usage:
    py tools/calibrate.py --image images/your_lot.jpg
"""

import cv2
import os
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import (
    GRID_ROWS, GRID_COLS, ROW_LABELS, Y_LINES, X_LINES
)

COLORS = [
    (255, 80,  80),   # Row a – red-ish
    (80,  255, 80),   # Row b – green-ish
    (80,  80,  255),  # Row c – blue-ish
]

def draw_calibration(image_path: str, output_path: str = None):
    img = cv2.imread(image_path)
    if img is None:
        print(f"[ERROR] Cannot open: {image_path}")
        sys.exit(1)

    vis = img.copy()

    # Draw horizontal boundary lines
    for y in Y_LINES:
        cv2.line(vis, (X_LINES[0], y), (X_LINES[-1], y), (0, 255, 255), 2)

    # Draw vertical boundary lines
    for x in X_LINES:
        cv2.line(vis, (x, Y_LINES[0]), (x, Y_LINES[-1]), (0, 255, 255), 2)

    # Label each cell
    for r in range(GRID_ROWS):
        y1, y2 = Y_LINES[r], Y_LINES[r+1]
        for c in range(11):
            x1, x2 = X_LINES[c], X_LINES[c+1]
            
            # Map physical col to logical col ID
            if c < 6:
                lbl_c = c + 1
            elif c == 6 or c == 7:
                lbl_c = 7
            else:
                lbl_c = c
            
            slot_id = f"{ROW_LABELS[r]}{lbl_c}"
            color = COLORS[r % len(COLORS)]
            
            # Write slot_id inside the box
            cv2.putText(
                vis, slot_id,
                (x1 + 4, y2 - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.38,
                color, 1,
                cv2.LINE_AA,
            )

    # Legend
    legend_lines = [
        "CALIBRATION MODE",
        f"Grid: {GRID_ROWS} rows x 11 physical bays (mapped to {GRID_COLS} slots)",
        "Yellow lines: Y_LINES and X_LINES coordinates from config",
        "If grid doesn't align: edit Y_LINES/X_LINES in core/config.py",
    ]
    for i, line in enumerate(legend_lines):
        cv2.putText(vis, line, (10, 20 + i * 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)

    # Save
    if output_path is None:
        base, ext = os.path.splitext(image_path)
        output_path = base + "_calibration" + (ext or ".jpg")

    cv2.imwrite(output_path, vis)
    print(f"\n[Calibrate] Grid overlay saved -> {output_path}")
    print(f"[Calibrate] Open it and check that each cell aligns with a parking slot.\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parking grid calibration tool")
    parser.add_argument("--image",  required=True, help="Path to a parking lot image")
    parser.add_argument("--output", default=None,  help="Custom output path")
    args = parser.parse_args()
    draw_calibration(args.image, args.output)
