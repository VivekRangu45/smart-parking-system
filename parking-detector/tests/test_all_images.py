# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core import detect_parking_slots

# Ground truths for all 5 images
GROUND_TRUTHS = {
    "WhatsApp_Image_2026-06-11_at_05.38.39.jpeg": {
        "a2": 1, "a6": 1, "a8": 1,
        "b1": 1, "b4": 1, "b10": 1,
        "c3": 1, "c10": 1,
    },
    "img_1.jpg": {
        "a2": 1, "a4": 1, "a6": 1, "a8": 1, "a9": 1,
        "b1": 1, "b3": 1, "b5": 1, "b7": 1, "b10": 1,
        "c1": 1, "c2": 1, "c4": 1, "c7": 1, "c8": 1, "c9": 1, "c10": 1,
    },
    "img_2.jpg": {
        "a1": 1, "a4": 1, "a5": 1, "a7": 1, "a9": 1,
        "b2": 1, "b3": 1, "b6": 1, "b8": 1, "b10": 1,
        "c1": 1, "c3": 1, "c4": 1, "c5": 1, "c7": 1, "c9": 1,
    },
    "img_3.jpg": {
        "a2": 1, "a6": 1, "a8": 1,
        "b1": 1, "b4": 1, "b10": 1,
        "c3": 1, "c10": 1,
    },
    "img_4.jpg": {
        "a5": 1,
        "b1": 1,
        "c2": 1, "c5": 1, "c7": 1, "c10": 1,
    }
}

def main():
    print("\n============================================================")
    print("  Smart Parking System – Multi-Image Accuracy Verification")
    print("============================================================\n")

    total_checked = 0
    total_correct = 0
    failures = []

    for img_name, truth_map in GROUND_TRUTHS.items():
        img_path = os.path.join("images", img_name)
        if not os.path.exists(img_path):
            print(f"[WARN] Image not found: {img_path}")
            continue

        print(f"Testing {img_name} ...")
        try:
            results = detect_parking_slots(img_path, debug=True)
        except Exception as e:
            print(f"  [FAIL] Error processing: {e}")
            failures.append((img_name, str(e)))
            continue

        img_checked = 0
        img_correct = 0
        img_errors = []

        for r in results:
            sid = r["slot_id"]
            pred = r["status"]
            truth = truth_map.get(sid, 0)

            total_checked += 1
            img_checked += 1

            if pred == truth:
                total_correct += 1
                img_correct += 1
            else:
                img_errors.append(f"{sid}(pred={pred}, truth={truth})")

        acc = img_correct / img_checked
        print(f"  Result: {img_correct}/{img_checked} correct ({acc*100:.1f}% accuracy)")
        if img_errors:
            print(f"  Errors: {', '.join(img_errors)}")
            failures.append((img_name, img_errors))
        else:
            print("  PERFECT! 0 errors.")

    print("\n============================================================")
    overall_acc = total_correct / total_checked if total_checked > 0 else 0
    print(f"  OVERALL RESULT: {total_correct}/{total_checked} slots correct")
    print(f"  OVERALL ACCURACY: {overall_acc*100:.2f}%")
    print("============================================================\n")

    sys.exit(0 if len(failures) == 0 else 1)

if __name__ == "__main__":
    main()
