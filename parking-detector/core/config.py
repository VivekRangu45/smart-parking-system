"""
core/config.py — Smart Parking System – Slot Detection Config
"""

# ---------------------------------------------------------------------------
# Grid Layout
# ---------------------------------------------------------------------------
GRID_ROWS  = 3
GRID_COLS  = 10
ROW_LABELS = ["a", "b", "c"]

# Coordinates of the white lines in the image (559x1024)
# Y lines define the 3 rows (boundary coordinates)
Y_LINES = [60, 211, 362, 512]

# X lines define the 11 physical columns in the parking lot
X_LINES = [145, 222, 296, 372, 445, 521, 596, 670, 744, 818, 892, 966]

# ---------------------------------------------------------------------------
# Rule-Based Pixel Segmentation Settings (Core Detector)
# ---------------------------------------------------------------------------
# Padding inside each slot to avoid painted grid-lines
SLOT_PADDING_FRAC = 0.22

# Thresholds to determine if a pixel is "not road color (gray)"
COLOR_THRESHOLD = 18.0   # deviation of BGR channels: max(BGR) - min(BGR) > 18
WHITE_THRESHOLD = 120.0  # mean brightness > 120 (for white/silver cars)
BLACK_THRESHOLD = 38.0   # mean brightness < 38 (for black cars / deep shadows)

# Occupancy threshold: if >= 28% of the pixels in the slot ROI are non-road,
# the slot is occupied (status 1), otherwise empty (status 0).
OCCUPANCY_PERCENT_THRESHOLD = 28.0

# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------
SCAN_INTERVAL_SECONDS = 30

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
IMAGES_DIR = "images"
OUTPUT_DIR = "output"
