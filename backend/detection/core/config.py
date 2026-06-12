"""
core/config.py — Smart Parking System – Slot Detection Config
"""
import os

# ---------------------------------------------------------------------------
# Grid Layout
# ---------------------------------------------------------------------------
GRID_ROWS = 3
GRID_COLS = 10
ROW_LABELS = ["a", "b", "c"]

# Coordinates of the white lines in the image (559x1024)
Y_LINES = [60, 211, 362, 512]
X_LINES = [145, 222, 296, 372, 445, 521, 596, 670, 744, 818, 892, 966]

# ---------------------------------------------------------------------------
# Rule-Based Pixel Segmentation Settings
# ---------------------------------------------------------------------------
SLOT_PADDING_FRAC = 0.22
COLOR_THRESHOLD = 18.0
WHITE_THRESHOLD = 120.0
BLACK_THRESHOLD = 38.0
OCCUPANCY_PERCENT_THRESHOLD = 28.0

# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------
SCAN_INTERVAL_SECONDS = 30

# ---------------------------------------------------------------------------
# Paths (relative to backend/detection/)
# ---------------------------------------------------------------------------
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(_BASE_DIR, "images")
OUTPUT_DIR = os.path.join(_BASE_DIR, "output")
