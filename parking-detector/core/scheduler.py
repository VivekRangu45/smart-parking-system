"""
core/scheduler.py
-----------------
Smart Parking System – 30-second scan loop.

Watches the `images/` folder, picks the NEWEST image, runs detection,
writes JSON results. Has NO dependency on the UI layer.

Usage:
    py -m core.scheduler
    py -m core.scheduler --interval 30 --debug
    py -m core.scheduler --image images/specific.jpg   # single-shot mode
"""

import argparse
import os
import sys
import time
from datetime import datetime

# Support both package import and direct run
if __package__:
    from .detector import ParkingDetector, save_json, print_summary
    from .config import SCAN_INTERVAL_SECONDS, IMAGES_DIR, OUTPUT_DIR
else:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from core.detector import ParkingDetector, save_json, print_summary
    from core.config import SCAN_INTERVAL_SECONDS, IMAGES_DIR, OUTPUT_DIR

_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _latest_image(folder: str):
    """Return path to the most recently modified image in *folder*, or None."""
    folder = os.path.abspath(folder)
    if not os.path.isdir(folder):
        return None
    candidates = [
        os.path.join(folder, f)
        for f in os.listdir(folder)
        if os.path.splitext(f)[1].lower() in _IMAGE_EXTS
    ]
    return max(candidates, key=os.path.getmtime) if candidates else None


def run_once(detector: ParkingDetector, image_path: str, debug: bool) -> list:
    """Run detection on a single image. Returns results list."""
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Scanning: {image_path}")
    try:
        results = detector.detect_and_save(image_path, debug=debug)
        print_summary(results)
        return results
    except Exception as exc:
        print(f"[ERROR] Detection failed: {exc}")
        return []


def run_scheduler(
    interval: int = SCAN_INTERVAL_SECONDS,
    debug: bool = False,
    images_dir: str = IMAGES_DIR,
    single_image: str = None,
):
    """
    Main scheduler loop.

    Parameters
    ----------
    interval     : seconds between scans
    debug        : save annotated debug images
    images_dir   : folder to watch for new images
    single_image : if set, run once on this image then exit
    """
    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"\n{'='*55}")
    print(f"  Smart Parking System – Slot Detector")
    print(f"  Mode     : {'single-shot' if single_image else f'watch every {interval}s'}")
    print(f"  Watching : {os.path.abspath(images_dir)}")
    print(f"  Output   : {os.path.abspath(OUTPUT_DIR)}")
    print(f"  Debug    : {'on' if debug else 'off'}")
    print(f"  Press Ctrl+C to stop.")
    print(f"{'='*55}")

    detector = ParkingDetector()   # load model once

    if single_image:
        run_once(detector, single_image, debug)
        return

    last_processed = None
    while True:
        img_path = _latest_image(images_dir)
        if img_path is None:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                  f"No images in '{images_dir}/' — waiting ...")
        elif img_path != last_processed:
            # New image detected (or first run)
            run_once(detector, img_path, debug)
            last_processed = img_path
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                  f"No new image — waiting for next scan ...")

        time.sleep(interval)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Smart Parking – Slot Detector Scheduler"
    )
    parser.add_argument("--interval",  type=int, default=SCAN_INTERVAL_SECONDS,
                        help=f"Seconds between scans (default: {SCAN_INTERVAL_SECONDS})")
    parser.add_argument("--debug",     action="store_true",
                        help="Save annotated debug images")
    parser.add_argument("--images-dir", default=IMAGES_DIR,
                        help=f"Folder to watch (default: {IMAGES_DIR})")
    parser.add_argument("--image",     default=None,
                        help="Run on a single image and exit (single-shot mode)")
    args = parser.parse_args()

    try:
        run_scheduler(
            interval=args.interval,
            debug=args.debug,
            images_dir=args.images_dir,
            single_image=args.image,
        )
    except KeyboardInterrupt:
        print("\n[INFO] Scheduler stopped.")
        sys.exit(0)
