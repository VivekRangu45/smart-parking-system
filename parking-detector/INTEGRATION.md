# Smart Parking System – Slot Detection Module
## Integration Guide for Agents and Developers

> This document is the authoritative reference for integrating the
> **Parking Slot Detection** module into a larger Smart Parking System.

---

## Module Location

```
parking-detector/
└── core/                  ← This is what you integrate
    ├── __init__.py        ← Public API
    ├── config.py          ← All tunable parameters
    ├── detector.py        ← Deterministic segmentation engine
    └── scheduler.py       ← 30-second scan loop
```

The `ui/` folder is a standalone testing tool. **Delete it** when deploying.
The `tests/` and `tools/` folders are development utilities. **Delete them** when deploying.

---

## Installation (Core Only)

The module is extremely lightweight and does **not** require heavy deep learning libraries like PyTorch or Ultralytics.

```bash
pip install opencv-python numpy
```

---

## Public API

### Option A — Functional (simplest)

```python
from core import detect_parking_slots

results = detect_parking_slots("path/to/parking_lot.jpg")
```

### Option B — Class (compatible wrapper)

```python
from core import ParkingDetector

detector = ParkingDetector()

# Call as many times as needed
results1 = detector.detect("lot_frame_001.jpg")
results2 = detector.detect("lot_frame_002.jpg")

# Detect + auto-write JSON
results3 = detector.detect_and_save("lot_frame_003.jpg")
```

### Option C — Detect + save JSON manually

```python
from core import detect_parking_slots, save_json

results = detect_parking_slots("image.jpg")
save_json(results, "output/slots.json")
```

---

## Return Value Contract

Both functions return **exactly 30 dicts**, one per slot, ordered `a1 → c10`:

```json
[
  {
    "slot_id": "a1",
    "status": 0
  },
  {
    "slot_id": "a2",
    "status": 1
  },
  ...
  {
    "slot_id": "c10",
    "status": 1
  }
]
```

### Field specification

| Field    | Type | Values  | Description               |
|----------|------|---------|---------------------------|
| slot_id  | str  | a1–c10  | Row (a/b/c) + Column (1–10) |
| status   | int  | 0 or 1  | 0 = empty, 1 = occupied   |

---

## Using the Scheduler (30-second auto-scan)

The scheduler watches an image folder, detects the latest image every N seconds, and writes JSON to `output/latest.json`.

```python
# Embed in your parent system:
from core.scheduler import run_scheduler

run_scheduler(
    interval=30,               # scan every 30 seconds
    debug=False,               # set True during development
    images_dir="images/",      # folder that receives new camera frames
)
```

Or run it as a subprocess:

```bash
py -m core.scheduler --interval 30 --debug
```

The output contract (`output/latest.json`) is guaranteed to always be a valid 30-slot JSON file after the first scan.

---

## Configuration

All parameters live in [`core/config.py`](core/config.py).

| Parameter                    | Default | Description |
|------------------------------|---------|-------------|
| `GRID_ROWS`                  | 3       | Number of parking rows |
| `GRID_COLS`                  | 10      | Number of parking columns in logical layout |
| `ROW_LABELS`                 | a,b,c   | Row names |
| `Y_LINES`                    | `[60, 211, 362, 512]` | Horizontal white boundaries (Y coordinates) |
| `X_LINES`                    | `[145, 222, 296, ...]` | Vertical white boundaries (X coordinates for 11 columns) |
| `SLOT_PADDING_FRAC`          | 0.22    | Inside padding fraction to ignore painted borders and text |
| `COLOR_THRESHOLD`            | 18.0    | Minimum BGR channel variance to classify as a colored car |
| `WHITE_THRESHOLD`            | 120.0   | Minimum brightness to classify as a white/silver car |
| `BLACK_THRESHOLD`            | 38.0    | Maximum brightness to classify as a black car or car shadow |
| `OCCUPANCY_PERCENT_THRESHOLD`| 28.0    | Minimum percentage of non-road pixels to mark slot occupied |

### Column Layout & Mapping
The physical layout has 11 parking bays because column 7 is printed twice in the header. We mapped the 11 physical bays to 10 logical IDs (`C1..C10`):
- Column 1 to 6 $\to$ C1 to C6
- Column 7 & 8 $\to$ C7 (Logical OR: occupied if either physical slot is occupied)
- Column 9 to 11 $\to$ C8 to C10

---

## Debug Mode

Add `debug=True` to any detect call to save an annotated image:

```python
results = detect_parking_slots("image.jpg", debug=True)
# Saves: image_debug.jpg
```

The debug image shows:
- **Red overlay** = detected as OCCUPIED
- **Green overlay** = detected as EMPTY  
- Bounding boxes matching the exact coordinate boundaries defined in config.

---

## Removing the UI

The `ui/` folder is completely standalone:

```bash
# To remove the UI:
rmdir /s /q ui
# Core detection is unaffected.
```

---

## Error Handling

| Exception          | Cause | Fix |
|--------------------|-------|-----|
| `FileNotFoundError` | Image path is wrong | Check path |
| Wrong slot count    | Should never happen — always 30 slots | Verify configuration |
| All slots occupied  | Thresholds are too sensitive or coordinate lines changed | Run verification tests |

---

## Architecture Diagram

```
Camera / Image Source
        │
        ▼ (image file written to images/)
┌─────────────────────────────────┐
│         core/scheduler.py       │  ← runs every 30s
│   Watches images/ for new file  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│         core/detector.py        │
│  1. Partition using line coords │
│  2. Run pixel color classifiers │
│  3. Map 11 columns to 10 slots  │
│  4. Return [{slot_id, status}]  │
└────────────┬────────────────────┘
             │
             ▼
     output/latest.json           ← consumed by Smart Parking backend
     output/slots_TIMESTAMP.json  ← historical archive
```
