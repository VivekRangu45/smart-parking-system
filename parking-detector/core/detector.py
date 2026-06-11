# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
core/detector.py
----------------
Smart Parking System – Slot Detection Engine (v3)

A deterministic, lightweight, and dependency-free color/brightness segmentation module.
Detects occupied slots based on whether the slot's padded ROI deviates from the grayish pavement.

Public API:
    from core import detect_parking_slots
    results = detect_parking_slots("path/to/image.jpg")
    # -> [{"slot_id": "a1", "status": 1}, ...]
"""

import cv2
import numpy as np
import json
import os
from datetime import datetime
from typing import Optional

if __package__:
    from .config import (
        GRID_ROWS, GRID_COLS, ROW_LABELS,
        Y_LINES, X_LINES, SLOT_PADDING_FRAC,
        COLOR_THRESHOLD, WHITE_THRESHOLD, BLACK_THRESHOLD,
        OCCUPANCY_PERCENT_THRESHOLD, OUTPUT_DIR
    )
else:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from core.config import (
        GRID_ROWS, GRID_COLS, ROW_LABELS,
        Y_LINES, X_LINES, SLOT_PADDING_FRAC,
        COLOR_THRESHOLD, WHITE_THRESHOLD, BLACK_THRESHOLD,
        OCCUPANCY_PERCENT_THRESHOLD, OUTPUT_DIR
    )


def _analyze_slot(slot_bgr: np.ndarray) -> tuple:
    """
    Analyse a single slot crop for car presence using rule-based pixel classification.

    Returns (is_occupied: bool, non_road_pct: float)
    """
    h, w = slot_bgr.shape[:2]
    ph = int(h * SLOT_PADDING_FRAC)
    pw = int(w * SLOT_PADDING_FRAC)
    roi = slot_bgr[ph: h - ph, pw: w - pw]

    if roi.size == 0:
        return False, 0.0

    # Convert to RGB (standardize colors)
    roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
    pixels = roi_rgb.reshape(-1, 3).astype(float)
    n_pixels = pixels.shape[0]

    # 1. Color check (deviation from gray)
    color_diff = np.max(pixels, axis=1) - np.min(pixels, axis=1)
    color_mask = color_diff > COLOR_THRESHOLD

    # 2. White check (bright gray, non-colored)
    mean_rgb = np.mean(pixels, axis=1)
    white_mask = (mean_rgb > WHITE_THRESHOLD) & (~color_mask)

    # 3. Black check (dark gray / shadow)
    black_mask = mean_rgb < BLACK_THRESHOLD

    # Total non-road pixels
    car_mask = color_mask | white_mask | black_mask
    car_pct = (np.sum(car_mask) / n_pixels) * 100.0

    occupied = car_pct >= OCCUPANCY_PERCENT_THRESHOLD
    return occupied, car_pct


def detect_parking_slots(
    image_path: str,
    debug: bool = False,
    debug_output_path: Optional[str] = None,
) -> list:
    """
    Detect car occupancy for all 30 parking slots.

    Uses rule-based BGR pixel segmentation inside each slot's boundary.

    Parameters
    ----------
    image_path        : Path to the parking-lot image.
    debug             : Save annotated debug image if True.
    debug_output_path : Custom path for debug image.

    Returns
    -------
    List[dict]:  [{"slot_id": "a1", "status": 0|1}, ...] — 30 entries.
    """
    img = cv2.imread(str(image_path))
    if img is None:
        raise FileNotFoundError(f"[Detector] Cannot open: {image_path}")

    # Analyze 3 rows and 11 columns physically
    physical_results = np.zeros((GRID_ROWS, 11), dtype=int)

    for r in range(GRID_ROWS):
        y1 = Y_LINES[r]
        y2 = Y_LINES[r+1]
        for c in range(11):
            x1 = X_LINES[c]
            x2 = X_LINES[c+1]
            slot = img[y1:y2, x1:x2]

            is_occ, _ = _analyze_slot(slot)
            physical_results[r, c] = 1 if is_occ else 0

    # Map the 11 columns to 10 logical slot IDs (c1..c10)
    results = []
    for r in range(GRID_ROWS):
        rl = ROW_LABELS[r]
        for logical_col in range(1, 11):
            if logical_col < 7:
                # Cols 1 to 6 map to physical cols 0 to 5
                status = physical_results[r, logical_col - 1]
            elif logical_col == 7:
                # C7 maps to physical cols 6 and 7 (OR operation)
                status = physical_results[r, 6] | physical_results[r, 7]
            else:
                # Cols 8, 9, 10 map to physical cols 8, 9, 10
                status = physical_results[r, logical_col]

            slot_id = f"{rl}{logical_col}"
            results.append({"slot_id": slot_id, "status": int(status)})

    # Save debug image if requested
    if debug:
        out = debug_output_path or _auto_debug_path(str(image_path))
        _save_debug_image(img, physical_results, out)

    return results


def _save_debug_image(img, physical_results, out_path):
    """Draw red rectangles for occupied slots, green for empty slots using exact white line coordinates."""
    vis = img.copy()

    for r in range(GRID_ROWS):
        y1, y2 = Y_LINES[r], Y_LINES[r+1]
        for c in range(11):
            is_occ = physical_results[r, c] == 1
            color = (0, 0, 220) if is_occ else (0, 180, 0) # BGR: Red / Green

            x1, x2 = X_LINES[c], X_LINES[c+1]

            overlay = vis.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
            cv2.addWeighted(overlay, 0.25, vis, 0.75, 0, vis)
            cv2.rectangle(vis, (x1, y1), (x2, y2), color, 2)

            # Draw logical slot ID label (e.g. a7, a8, etc.)
            # Column mapping to label:
            if c < 6:
                lbl_c = c + 1
            elif c == 6 or c == 7:
                lbl_c = 7
            else:
                lbl_c = c
            slot_id = f"{ROW_LABELS[r]}{lbl_c}"
            cv2.putText(vis, slot_id, (x1 + 4, y2 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38,
                        (255, 255, 255), 1, cv2.LINE_AA)

    # Save
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    cv2.imwrite(out_path, vis)
    print(f"[Detector] Debug image -> {out_path}")


def _auto_debug_path(image_path: str) -> str:
    base, ext = os.path.splitext(image_path)
    return base + "_debug" + (ext or ".jpg")


def save_json(results: list, output_path: str) -> None:
    payload = [{"slot_id": r["slot_id"], "status": r["status"]} for r in results]
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"[Detector] JSON -> {output_path}")


def print_summary(results: list) -> None:
    occ = sum(r["status"] for r in results)
    emp = len(results) - occ
    print(f"\n{'='*55}")
    print(f"  {datetime.now().strftime('%H:%M:%S')}  |  Occupied:{occ}  Empty:{emp}  Total:{len(results)}")
    print(f"{'='*55}")
    print("     " + "  ".join(f"C{c+1:02d}" for c in range(GRID_COLS)))
    for rl in ROW_LABELS:
        row = [r for r in results if r["slot_id"].startswith(rl)]
        cells = "   ".join("[X]" if s["status"] else "[ ]" for s in row)
        print(f"  {rl}  {cells}")
    print(f"{'='*55}  ([X]=occupied  [ ]=empty)\n")


class ParkingDetector:
    """Stateful wrapper — compatible with the old API."""
    def __init__(self):
        pass

    def detect(self, image_path: str, debug: bool = False,
               debug_output_path: Optional[str] = None) -> list:
        return detect_parking_slots(image_path, debug=debug,
                                    debug_output_path=debug_output_path)

    def detect_and_save(self, image_path: str,
                        output_path: Optional[str] = None,
                        debug: bool = False) -> list:
        results = self.detect(image_path, debug=debug)
        ts  = datetime.now().strftime("%Y%m%d_%H%M%S")
        out = output_path or os.path.join(OUTPUT_DIR, f"slots_{ts}.json")
        save_json(results, out)
        save_json(results, os.path.join(OUTPUT_DIR, "latest.json"))
        return results
