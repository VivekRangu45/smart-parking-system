# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
ui/app.py
---------
Smart Parking System – Web UI (OPTIONAL / REMOVABLE)

This file has ZERO impact on the core detection system.
To remove the UI: simply delete the `ui/` folder.

The core API (core/) works independently.

Usage:
    py ui/app.py
    Open → http://localhost:5000
"""

import os
import json
import sys
from datetime import datetime
from flask import (Flask, request, render_template_string,
                   jsonify, send_file)
from werkzeug.utils import secure_filename

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core import detect_parking_slots, save_json
from core.config import IMAGES_DIR, OUTPUT_DIR

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# HTML (self-contained single-file)
# ---------------------------------------------------------------------------

HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Smart Parking – Slot Detector</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  :root {
    --bg:#0d1117;--surface:#161b22;--surface2:#21262d;--border:#30363d;
    --accent:#58a6ff;--green:#7ee787;--red:#f85149;--yellow:#e3b341;
    --text:#e6edf3;--sub:#8b949e;--r:10px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}

  header{background:linear-gradient(135deg,#1f2937,#111827);border-bottom:1px solid var(--border);
         padding:16px 28px;display:flex;align-items:center;gap:12px}
  header h1{font-size:1.2rem;font-weight:700}
  .badge{background:rgba(88,166,255,.15);border:1px solid var(--accent);color:var(--accent);
         padding:2px 10px;border-radius:20px;font-size:.72rem;font-weight:600}
  header .clock{margin-left:auto;font-size:.82rem;color:var(--sub)}

  main{max-width:1100px;margin:0 auto;padding:24px 18px}

  /* Upload */
  .drop{border:2px dashed var(--border);border-radius:var(--r);background:var(--surface);
        padding:36px;text-align:center;cursor:pointer;transition:.2s}
  .drop:hover,.drop.over{border-color:var(--accent);background:rgba(88,166,255,.06)}
  .drop h2{font-size:.95rem}
  .drop p{color:var(--sub);font-size:.82rem;margin-top:6px}
  .drop input{display:none}

  /* Controls */
  .ctrl{display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}
  .ctrl label{font-size:.82rem;color:var(--sub)}
  .ctrl input[type=range]{accent-color:var(--accent)}
  #conf-val{font-weight:700;color:var(--accent);min-width:32px}
  .btn{padding:8px 20px;border:none;border-radius:6px;font-weight:600;
       font-size:.88rem;cursor:pointer;transition:.15s}
  .btn-primary{background:var(--accent);color:#0d1117}
  .btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
  .btn:hover{opacity:.85}

  /* Status */
  #status{margin-top:14px;padding:9px 14px;border-radius:6px;font-size:.85rem;display:none}
  #status.info{background:rgba(88,166,255,.12);border:1px solid var(--accent)}
  #status.ok{background:rgba(126,231,135,.1);border:1px solid var(--green)}
  #status.err{background:rgba(248,81,73,.1);border:1px solid var(--red)}

  hr{border:none;border-top:1px solid var(--border);margin:22px 0}

  /* Grid */
  .grid-hdr{display:grid;grid-template-columns:36px repeat(10,1fr);gap:4px;margin-bottom:4px}
  .grid-hdr span{text-align:center;font-size:.68rem;color:var(--sub);font-weight:600}
  .grid-row{display:grid;grid-template-columns:36px repeat(10,1fr);gap:4px;margin-bottom:4px}
  .row-lbl{display:flex;align-items:center;justify-content:center;
           font-size:.8rem;font-weight:700;color:var(--sub)}
  .slot{aspect-ratio:1/1.25;border-radius:6px;display:flex;align-items:center;
        justify-content:center;flex-direction:column;gap:2px;
        font-size:.65rem;font-weight:600;cursor:default;transition:.15s}
  .slot:hover{transform:scale(1.07)}
  .slot.occ{background:rgba(248,81,73,.18);border:1.5px solid var(--red);color:var(--red)}
  .slot.emp{background:rgba(126,231,135,.1);border:1.5px solid var(--green);color:var(--green)}
  .slot .ic{font-size:1.1rem}

  /* Stats */
  .stats{display:flex;gap:14px;margin-top:18px;flex-wrap:wrap}
  .stat{flex:1;min-width:110px;background:var(--surface2);border:1px solid var(--border);
        border-radius:8px;padding:14px;text-align:center}
  .stat .n{font-size:1.9rem;font-weight:700}
  .stat .l{font-size:.75rem;color:var(--sub);margin-top:2px}
  .stat.o .n{color:var(--red)} .stat.e .n{color:var(--green)} .stat.t .n{color:var(--accent)}

  /* JSON */
  pre{background:var(--surface);border:1px solid var(--border);border-radius:8px;
      padding:14px;font-size:.75rem;max-height:240px;overflow-y:auto;
      color:#a5d6ff;line-height:1.6}

  /* History */
  .hist-list{list-style:none;display:flex;flex-direction:column;gap:5px}
  .hist-list li{background:var(--surface2);border:1px solid var(--border);
                border-radius:6px;padding:8px 12px;font-size:.8rem;
                display:flex;align-items:center;justify-content:space-between}
  .hist-list li a{color:var(--accent);text-decoration:none}
  .hist-list li a:hover{text-decoration:underline}
</style>
</head>
<body>
<header>
  <svg width="22" height="22" fill="none" stroke="#58a6ff" stroke-width="2" viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
  </svg>
  <h1>Smart Parking – Slot Detector</h1>
  <span class="badge">Rule-Based Segmenter</span>
  <span class="clock" id="clk"></span>
</header>

<main>
  <div class="drop" id="drop" onclick="document.getElementById('fi').click()">
    <svg width="36" height="36" fill="none" stroke="#58a6ff" stroke-width="1.5" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    <h2>Click or drag &amp; drop a parking lot image</h2>
    <p>JPG · PNG · BMP · WEBP &nbsp;|&nbsp; Max 32 MB</p>
    <input type="file" id="fi" accept=".jpg,.jpeg,.png,.bmp,.webp"/>
  </div>

  <div class="ctrl">
    <button class="btn btn-primary" onclick="run()">&#128269; Detect</button>
    <button class="btn btn-secondary" onclick="loadLatest()">&#8635; Load Latest</button>
  </div>
  <div id="status"></div>

  <!-- Grid -->
  <div id="grid-wrap" style="display:none">
    <hr/>
    <h2 style="font-size:1rem;margin-bottom:12px">Slot Map</h2>
    <div class="grid-hdr" id="ghdr"></div>
    <div id="grows"></div>
    <div class="stats">
      <div class="stat o"><div class="n" id="socc">-</div><div class="l">Occupied</div></div>
      <div class="stat e"><div class="n" id="semp">-</div><div class="l">Empty</div></div>
      <div class="stat t"><div class="n" id="stot">-</div><div class="l">Total</div></div>
    </div>
  </div>

  <!-- JSON -->
  <div id="json-wrap" style="display:none">
    <hr/>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <h2 style="font-size:.95rem">JSON Output</h2>
      <button class="btn btn-secondary" style="padding:4px 12px;font-size:.75rem"
              onclick="dlJson()">&#11015; Download</button>
    </div>
    <pre id="json-pre"></pre>
  </div>

  <!-- History -->
  <div id="hist-wrap">
    <hr/>
    <h2 style="font-size:.95rem;margin-bottom:10px">Recent Scans</h2>
    <ul class="hist-list" id="hist"></ul>
  </div>
</main>

<script>
let _results = [];

setInterval(() => {
  document.getElementById('clk').textContent = new Date().toLocaleTimeString();
}, 1000);

// Drag & drop
const drop = document.getElementById('drop');
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('over');
  document.getElementById('fi').files = e.dataTransfer.files;
  run();
});
document.getElementById('fi').addEventListener('change', run);

function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg; el.className = type; el.style.display = 'block';
}

async function run() {
  const file = document.getElementById('fi').files[0];
  if (!file) { setStatus('Please select an image first.', 'err'); return; }
  const fd = new FormData();
  fd.append('image', file);
  setStatus('Running slot detection...', 'info');
  try {
    const r = await fetch('/detect', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Server error');
    render(d.results);
    setStatus(`Detection complete — ${d.occupied} occupied, ${d.empty} empty.`, 'ok');
    fetchHistory();
  } catch(e) { setStatus('Error: ' + e.message, 'err'); }
}

async function loadLatest() {
  setStatus('Loading latest results ...', 'info');
  try {
    const r = await fetch('/latest');
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'No data yet');
    render(d.results);
    setStatus('Loaded latest scan.', 'ok');
  } catch(e) { setStatus('Error: ' + e.message, 'err'); }
}

function render(results) {
  _results = results;
  const rows = ['a','b','c'], cols = Array.from({length:10},(_,i)=>i+1);
  document.getElementById('ghdr').innerHTML =
    '<span></span>' + cols.map(c => `<span>C${c}</span>`).join('');
  const gr = document.getElementById('grows');
  gr.innerHTML = '';
  rows.forEach(row => {
    const d = document.createElement('div');
    d.className = 'grid-row';
    d.innerHTML = `<div class="row-lbl">${row.toUpperCase()}</div>`;
    cols.forEach(col => {
      const s = results.find(r => r.slot_id === `${row}${col}`);
      const occ = s && s.status === 1;
      d.innerHTML += `<div class="slot ${occ?'occ':'emp'}" title="${row}${col}: ${occ?'Occupied':'Empty'}">
        <span class="ic">${occ?'&#128663;':'&#10003;'}</span>
        <span>${row}${col}</span></div>`;
    });
    gr.appendChild(d);
  });
  const occ = results.filter(r => r.status === 1).length;
  document.getElementById('socc').textContent = occ;
  document.getElementById('semp').textContent = results.length - occ;
  document.getElementById('stot').textContent = results.length;
  document.getElementById('grid-wrap').style.display = 'block';
  document.getElementById('json-pre').textContent =
    JSON.stringify(results.map(r=>({slot_id:r.slot_id,status:r.status})), null, 2);
  document.getElementById('json-wrap').style.display = 'block';
}

function dlJson() {
  const blob = new Blob(
    [JSON.stringify(_results.map(r=>({slot_id:r.slot_id,status:r.status})),null,2)],
    {type:'application/json'}
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'parking_slots.json'; a.click();
}

async function fetchHistory() {
  try {
    const r = await fetch('/history');
    const d = await r.json();
    const ul = document.getElementById('hist');
    if (!d.files || !d.files.length) {
      ul.innerHTML = '<li style="color:var(--sub)">No scans yet.</li>'; return;
    }
    ul.innerHTML = d.files.slice(0,8).map(f =>
      `<li><span>${f.name}</span><a href="/download/${f.name}" download>&#11015; Download</a></li>`
    ).join('');
  } catch(_) {}
}

fetchHistory();
</script>
</body>
</html>
"""

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template_string(HTML)


@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400

    f = request.files["image"]
    fname = secure_filename(f.filename or "upload.jpg")
    save_path = os.path.join(IMAGES_DIR, fname)
    f.save(save_path)

    try:
        results = detect_parking_slots(save_path, debug=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = os.path.join(OUTPUT_DIR, f"slots_{ts}.json")
    save_json(results, out_path)
    save_json(results, os.path.join(OUTPUT_DIR, "latest.json"))

    occupied = sum(r["status"] for r in results)
    return jsonify({
        "results" : results,
        "occupied": occupied,
        "empty"   : len(results) - occupied,
    })


@app.route("/latest")
def latest():
    path = os.path.join(OUTPUT_DIR, "latest.json")
    if not os.path.exists(path):
        return jsonify({"error": "No scan data yet — upload an image first."}), 404
    with open(path) as f:
        results = json.load(f)
    return jsonify({"results": results})


@app.route("/history")
def history():
    if not os.path.isdir(OUTPUT_DIR):
        return jsonify({"files": []})
    files = sorted(
        [{"name": fn} for fn in os.listdir(OUTPUT_DIR) if fn.endswith(".json")],
        key=lambda x: x["name"], reverse=True,
    )
    return jsonify({"files": files})


@app.route("/download/<filename>")
def download(filename):
    path = os.path.join(OUTPUT_DIR, secure_filename(filename))
    if not os.path.exists(path):
        return "Not found", 404
    return send_file(path, as_attachment=True)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("\n  Smart Parking - Slot Detector UI")
    print("  Open in your browser: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
