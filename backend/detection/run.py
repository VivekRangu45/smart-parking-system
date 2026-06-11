#!/usr/bin/env python3
"""Run slot detection on an image and print JSON results to stdout."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.detector import ParkingDetector  # noqa: E402


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image path required"}))
        sys.exit(1)

    image_path = sys.argv[1]
    debug = "--debug" in sys.argv

    if not os.path.isfile(image_path):
        print(json.dumps({"error": f"Image not found: {image_path}"}))
        sys.exit(1)

    detector = ParkingDetector()
    results = detector.detect_and_save(image_path, debug=debug)
    print(json.dumps(results))


if __name__ == "__main__":
    main()
