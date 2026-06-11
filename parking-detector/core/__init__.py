"""
core/__init__.py
----------------
Public API for the Smart Parking System – Slot Detection Module.

Usage (from any external module):
    from core import detect_parking_slots, save_json, ParkingDetector

The `ui/` and `tests/` folders have ZERO bearing on this package.
"""

from .detector import detect_parking_slots, ParkingDetector, save_json

__all__ = ["detect_parking_slots", "ParkingDetector", "save_json"]
