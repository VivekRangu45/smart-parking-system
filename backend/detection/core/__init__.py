"""
core/__init__.py — Public API for slot detection.
"""
from .detector import detect_parking_slots, ParkingDetector, save_json

__all__ = ["detect_parking_slots", "ParkingDetector", "save_json"]
