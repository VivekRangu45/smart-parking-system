# Parking Lot Detector

A **lightweight** parking-lot slot detection system using pure **OpenCV** (no neural network, no GPU required).

## How It Works

Each image is assumed to be a **top-down view** of a parking lot with:
- **3 rows** — labeled `a`, `b`, `c`
- **10 columns** — labeled `1`–`10`
- **30 slots total** — named `a1 … c10`

Detection method: **Laplacian Variance per cell**
- The image is divided into a 3×10 grid.
- For each cell, the variance of the Laplacian (edge-richness) is computed on the greyscale patch.
- If variance > threshold → **Occupied (1)** — cars have lots of edges.
- If variance ≤ threshold → **Empty (0)** — empty tarmac is smooth.

No model download, no GPU, no internet required.

---

## Project Structure

```
parking-detector/
├── detector.py        ← Core detection logic
├── scheduler.py       ← Runs detection every 30 s
├── app.py             ← Web UI (Flask)
├── test_detector.py   ← Test suite (run first!)
├── requirements.txt
├── images/            ← Drop your parking-lot images here
└── output/            ← JSON results written here
```

---

## Installation

```bash
pip install -r requirements.txt
```

---

## Usage

### 1. Test the module

```bash
python test_detector.py
```

Drop some images into `./images/` before running for the full smoke-test.

### 2. Run the web UI (upload images via browser)

```bash
python app.py
```

Open **http://localhost:5000** → drag-and-drop an image → hit **Detect**.

### 3. Run the scheduler (auto-scan every 30 s)

Drop images into `./images/` and run:

```bash
python scheduler.py
# or with custom interval & threshold:
python scheduler.py --interval 30 --threshold 80 --debug
```

The scheduler always detects the **latest image** in `./images/` and writes:
- `output/slots_YYYYMMDD_HHMMSS.json` — timestamped snapshot
- `output/latest.json` — always up to date (overwritten each cycle)

---

## JSON Output Format

```json
[
  { "slot_id": "a1", "status": 1 },
  { "slot_id": "a2", "status": 0 },
  ...
  { "slot_id": "c10", "status": 1 }
]
```

`status: 1` = occupied, `status: 0` = empty.

---

## Tuning the Threshold

If detection accuracy is off, run the calibration test:

```bash
python test_detector.py
```

Scroll to **Test 6** output — it prints every slot's variance score.  
Then adjust `VARIANCE_THRESHOLD` in `detector.py` (default: **80**) or pass `--threshold` to the scheduler.

**Rule of thumb:**
- Cars (edges, shadows) → variance typically **100 – 500+**
- Empty slots (smooth tarmac) → variance typically **5 – 60**

A threshold of **80** works well for most aerial parking-lot images.

---

## CLI Options

### scheduler.py

| Flag | Default | Description |
|------|---------|-------------|
| `--interval` | 30 | Seconds between scans |
| `--threshold` | 80 | Laplacian variance cut-off |
| `--debug` | off | Save annotated debug images |

### test_detector.py

| Flag | Default | Description |
|------|---------|-------------|
| `--image-dir` | `images` | Folder with real images |
