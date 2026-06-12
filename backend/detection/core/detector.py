# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

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
    h, w = slot_bgr.shape[:2]
    ph = int(h * SLOT_PADDING_FRAC)
    pw = int(w * SLOT_PADDING_FRAC)
    roi = slot_bgr[ph: h - ph, pw: w - pw]

    if roi.size == 0:
        return False, 0.0

    roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
    pixels = roi_rgb.reshape(-1, 3).astype(float)
    n_pixels = pixels.shape[0]

    color_diff = np.max(pixels, axis=1) - np.min(pixels, axis=1)
    color_mask = color_diff > COLOR_THRESHOLD

    mean_rgb = np.mean(pixels, axis=1)
    white_mask = (mean_rgb > WHITE_THRESHOLD) & (~color_mask)
    black_mask = mean_rgb < BLACK_THRESHOLD

    car_mask = color_mask | white_mask | black_mask
    car_pct = (np.sum(car_mask) / n_pixels) * 100.0

    occupied = car_pct >= OCCUPANCY_PERCENT_THRESHOLD
    return occupied, car_pct


def detect_parking_slots(
    image_path: str,
    debug: bool = False,
    debug_output_path: Optional[str] = None,
) -> list:
    img = cv2.imread(str(image_path))
    if img is None:
        raise FileNotFoundError(f"[Detector] Cannot open: {image_path}")

    physical_results = np.zeros((GRID_ROWS, 11), dtype=int)

    for r in range(GRID_ROWS):
        y1 = Y_LINES[r]
        y2 = Y_LINES[r + 1]
        for c in range(11):
            x1 = X_LINES[c]
            x2 = X_LINES[c + 1]
            slot = img[y1:y2, x1:x2]
            is_occ, _ = _analyze_slot(slot)
            physical_results[r, c] = 1 if is_occ else 0

    results = []
    for r in range(GRID_ROWS):
        rl = ROW_LABELS[r]
        for logical_col in range(1, 11):
            if logical_col < 7:
                status = physical_results[r, logical_col - 1]
            elif logical_col == 7:
                status = physical_results[r, 6] | physical_results[r, 7]
            else:
                status = physical_results[r, logical_col]

            slot_id = f"{rl}{logical_col}"
            results.append({"slot_id": slot_id, "status": int(status)})

    if debug:
        out = debug_output_path or _auto_debug_path(str(image_path))
        _save_debug_image(img, physical_results, out)

    return results


def _save_debug_image(img, physical_results, out_path):
    vis = img.copy()

    for r in range(GRID_ROWS):
        y1, y2 = Y_LINES[r], Y_LINES[r + 1]
        for c in range(11):
            is_occ = physical_results[r, c] == 1
            color = (0, 0, 220) if is_occ else (0, 180, 0)

            x1, x2 = X_LINES[c], X_LINES[c + 1]

            overlay = vis.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
            cv2.addWeighted(overlay, 0.25, vis, 0.75, 0, vis)
            cv2.rectangle(vis, (x1, y1), (x2, y2), color, 2)

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

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    cv2.imwrite(out_path, vis)


def _auto_debug_path(image_path: str) -> str:
    base, ext = os.path.splitext(image_path)
    return base + "_debug" + (ext or ".jpg")


def save_json(results: list, output_path: str) -> None:
    payload = [{"slot_id": r["slot_id"], "status": r["status"]} for r in results]
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2)


class ParkingDetector:
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
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out = output_path or os.path.join(OUTPUT_DIR, f"slots_{ts}.json")
        save_json(results, out)
        save_json(results, os.path.join(OUTPUT_DIR, "latest.json"))
        return results
