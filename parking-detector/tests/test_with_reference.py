"""
tests/test_with_reference.py
----------------------------
Tests detection accuracy against the KNOWN reference image.

Ground truth from the reference image:
  ROW A (1): a2=occupied, a6=occupied, a8=occupied
  ROW B (2): b1=occupied, b4=occupied, b10=occupied
  ROW C (3): c2=occupied, c10=occupied

  8 occupied, 22 empty.

Usage:
    py tests/test_with_reference.py --image images/parking_reference.jpg
"""
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import argparse, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core import detect_parking_slots
from core.detector import print_summary, save_json

# ── Ground truth (read from reference image) ─────────────────────────────
GROUND_TRUTH = {
    "a2": 1, "a6": 1, "a8": 1,
    "b1": 1, "b4": 1, "b10": 1,
    "c3": 1, "c10": 1,
}   # all others = 0

def evaluate(image_path: str):
    print(f"\n  Reference image test: {image_path}")
    results = detect_parking_slots(image_path, debug=True)
    print_summary(results)
    save_json(results, "output/reference_test.json")

    # Score
    tp = fp = tn = fn = 0
    errors = []
    for r in results:
        sid    = r["slot_id"]
        pred   = r["status"]
        truth  = GROUND_TRUTH.get(sid, 0)

        if pred == 1 and truth == 1: tp += 1
        elif pred == 1 and truth == 0: fp += 1; errors.append(f"FP:{sid}")
        elif pred == 0 and truth == 1: fn += 1; errors.append(f"FN:{sid}")
        else: tn += 1

    precision  = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall     = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1         = 2*precision*recall/(precision+recall) if (precision+recall) > 0 else 0
    accuracy   = (tp + tn) / 30

    print(f"  TP={tp}  FP={fp}  FN={fn}  TN={tn}")
    print(f"  Precision : {precision:.2f}")
    print(f"  Recall    : {recall:.2f}")
    print(f"  F1 Score  : {f1:.2f}")
    print(f"  Accuracy  : {accuracy:.2f}  ({int(accuracy*30)}/30 slots correct)")
    if errors:
        print(f"  Errors    : {', '.join(errors)}")
    else:
        print(f"  PERFECT DETECTION - 0 errors!")

    return f1

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True,
                        help="Path to the reference parking lot image")
    args = parser.parse_args()
    if not os.path.exists(args.image):
        print(f"[ERROR] Image not found: {args.image}")
        sys.exit(1)
    f1 = evaluate(args.image)
    sys.exit(0 if f1 >= 0.85 else 1)
