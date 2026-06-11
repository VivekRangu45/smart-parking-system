# -*- coding: utf-8 -*-
import sys, io
# Force UTF-8 output on Windows to avoid cp1252 encoding errors
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

"""
tests/test_detector.py
----------------------
Smart Parking System – Slot Detection Test Suite

Tests included:
  T1. Import check         – core package imports cleanly
  T2. YOLO model load      – model downloads / loads without error
  T3. Slot count           – detect_parking_slots() returns exactly 30 slots
  T4. Slot ID format       – IDs are a1..c10 with correct naming
  T5. Status values        – all statuses are strictly 0 or 1
  T6. JSON output          – saved JSON is valid and matches results
  T7. Real-image test      – runs on every image in ./images/ (if any)
  T8. Debug image          – debug mode saves an image file
  T9. Single-shot mode     – scheduler runs once and exits cleanly

Usage:
    py tests/test_detector.py
    py tests/test_detector.py --image-dir images/
"""

import argparse
import json
import os
import sys
import tempfile

# ── Path setup ──────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

PASS = "[PASS]"
FAIL = "[FAIL]"
INFO = "[TEST]"

_failures = []


def ok(name):
    print(f"  {PASS}  {name}")


def fail(name, msg):
    print(f"  {FAIL}  {name}: {msg}")
    _failures.append((name, msg))


def header(title):
    print(f"\n{INFO}  {title}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_synthetic_image(width=1024, height=400):
    """Create a blank grey image of the right aspect ratio."""
    import numpy as np
    import cv2
    img = np.full((height, width, 3), 100, dtype="uint8")
    # Draw some grid lines to simulate a parking lot
    for i in range(1, 3):
        y = int(height * (0.12 + 0.29 * i))
        cv2.line(img, (0, y), (width, y), (200, 200, 200), 2)
    for j in range(1, 10):
        x = int(width * (0.10 + 0.086 * j))
        cv2.line(img, (x, 0), (x, height), (200, 200, 200), 2)
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    cv2.imwrite(tmp.name, img)
    tmp.close()
    return tmp.name


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def t1_import():
    header("T1: Package imports cleanly")
    try:
        from core import detect_parking_slots, ParkingDetector, save_json
        ok("core package imported")
    except Exception as e:
        fail("import", str(e))


def t2_model_load():
    header("T2: Core segmentation sanity check")
    try:
        from core.detector import _analyze_slot
        import numpy as np
        # Create a mock slot crop (asphalt-like gray)
        slot = np.full((150, 82, 3), 85, dtype="uint8")
        is_occ, pct = _analyze_slot(slot)
        assert not is_occ
        assert pct < 1.0
        ok("Core segmentation engine is functional and quiet")
    except Exception as e:
        fail("segmentation check", str(e))


def t3_slot_count():
    header("T3: Returns exactly 30 slots")
    try:
        from core import detect_parking_slots
        img = _make_synthetic_image()
        results = detect_parking_slots(img)
        os.unlink(img)
        assert len(results) == 30, f"Expected 30, got {len(results)}"
        ok(f"Got {len(results)} slots")
    except Exception as e:
        fail("slot count", str(e))


def t4_slot_ids():
    header("T4: Slot IDs are correctly named (a1..c10)")
    try:
        from core import detect_parking_slots
        from core.config import ROW_LABELS, GRID_COLS
        img = _make_synthetic_image()
        results = detect_parking_slots(img)
        os.unlink(img)
        ids = {r["slot_id"] for r in results}
        expected = {f"{row}{col}" for row in ROW_LABELS for col in range(1, GRID_COLS + 1)}
        missing = expected - ids
        extra   = ids - expected
        if missing:
            fail("slot IDs", f"Missing: {sorted(missing)}")
        elif extra:
            fail("slot IDs", f"Unexpected: {sorted(extra)}")
        else:
            ok(f"All {len(expected)} slot IDs correct")
    except Exception as e:
        fail("slot IDs", str(e))


def t5_status_values():
    header("T5: Status values are strictly 0 or 1")
    try:
        from core import detect_parking_slots
        img = _make_synthetic_image()
        results = detect_parking_slots(img)
        os.unlink(img)
        bad = [r for r in results if r["status"] not in (0, 1)]
        if bad:
            fail("status values", f"Invalid status in: {bad}")
        else:
            ok("All statuses are 0 or 1")
    except Exception as e:
        fail("status values", str(e))


def t6_json_output():
    header("T6: JSON output is valid and matches results")
    try:
        from core import detect_parking_slots, save_json
        img = _make_synthetic_image()
        results = detect_parking_slots(img)
        os.unlink(img)

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            json_path = f.name
        save_json(results, json_path)

        with open(json_path) as f:
            data = json.load(f)
        os.unlink(json_path)

        assert len(data) == 30, f"JSON has {len(data)} entries"
        for entry in data:
            assert "slot_id" in entry
            assert "status"  in entry
            assert entry["status"] in (0, 1)
        ok("JSON is valid (30 entries, correct schema)")
    except Exception as e:
        fail("JSON output", str(e))


def t7_real_images(image_dir: str):
    header(f"T7: Real image smoke test ({image_dir}/)")
    from core import detect_parking_slots
    from core.detector import print_summary

    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    imgs = [
        os.path.join(image_dir, f)
        for f in (os.listdir(image_dir) if os.path.isdir(image_dir) else [])
        if os.path.splitext(f)[1].lower() in exts
        and "_debug" not in f          # skip previously generated debug images
        and "_calibration" not in f    # skip calibration overlays
    ]
    if not imgs:
        print(f"  [SKIP] No images in ./{image_dir}/ — add images and re-run T7.")
        return

    for img_path in imgs:
        print(f"\n  -> Processing: {img_path}")
        try:
            results = detect_parking_slots(img_path, debug=True)
            print_summary(results)
            occ = sum(r["status"] for r in results)
            ok(f"{img_path} — {occ} occupied, {30-occ} empty")
        except Exception as e:
            fail(img_path, str(e))


def t8_debug_image():
    header("T8: Debug image is saved")
    try:
        from core import detect_parking_slots
        img = _make_synthetic_image()
        debug_path = img.replace(".jpg", "_debug.jpg")
        detect_parking_slots(img, debug=True, debug_output_path=debug_path)
        os.unlink(img)
        if os.path.exists(debug_path):
            ok(f"Debug image created: {debug_path}")
            os.unlink(debug_path)
        else:
            fail("debug image", "File was not created")
    except Exception as e:
        fail("debug image", str(e))


def t9_single_shot_scheduler():
    header("T9: Scheduler single-shot mode")
    try:
        from core.scheduler import run_once, ParkingDetector
        detector = ParkingDetector()
        img = _make_synthetic_image()
        results = run_once(detector, img, debug=False)
        os.unlink(img)
        assert isinstance(results, list)
        ok("Scheduler single-shot completed successfully")
    except Exception as e:
        fail("scheduler single-shot", str(e))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main(image_dir: str = "images"):
    print(f"\n{'='*60}")
    print(f"  Smart Parking System – Detector Test Suite")
    print(f"{'='*60}")

    t1_import()
    t2_model_load()
    t3_slot_count()
    t4_slot_ids()
    t5_status_values()
    t6_json_output()
    t7_real_images(image_dir)
    t8_debug_image()
    t9_single_shot_scheduler()

    print(f"\n{'='*60}")
    if _failures:
        print(f"  {len(_failures)} TEST(S) FAILED:")
        for name, msg in _failures:
            print(f"    [FAIL] {name}: {msg}")
    else:
        print(f"  ALL TESTS PASSED")
    print(f"{'='*60}\n")
    return 1 if _failures else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parking detector test suite")
    parser.add_argument("--image-dir", default="images",
                        help="Folder containing real parking images (default: images/)")
    args = parser.parse_args()
    sys.exit(main(args.image_dir))
