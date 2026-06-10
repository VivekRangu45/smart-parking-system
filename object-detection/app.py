import os
import io
import tempfile
from flask import Flask, request, jsonify

app = Flask(__name__)

# Try to load YOLO model; gracefully fall back if not available
model = None
try:
    from ultralytics import YOLO
    model_path = os.environ.get('YOLO_MODEL_PATH', 'yolov8n.pt')
    model = YOLO(model_path)
    print(f'YOLO model loaded: {model_path}')
except Exception as e:
    print(f'WARNING: Could not load YOLO model: {e}')
    print('Running in fallback mode (returns dummy detections)')


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model is not None})


@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    try:
        if model is not None:
            # Save to temp file for YOLO
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                file.save(tmp.name)
                results = model(tmp.name)
                os.unlink(tmp.name)

            # Parse results
            vehicle_types = ['car', 'truck', 'bus', 'motorcycle', 'bicycle']
            detected_type = 'unknown'
            for result in results:
                for box in result.boxes:
                    cls_name = result.names[int(box.cls[0])]
                    if cls_name in vehicle_types:
                        detected_type = cls_name
                        break
                if detected_type != 'unknown':
                    break

            return jsonify({
                'vehicle_type': detected_type,
                'slot_id': None,
                'confidence': float(results[0].boxes.conf[0]) if len(results[0].boxes) > 0 else 0
            })
        else:
            # Fallback: return dummy detection
            return jsonify({
                'vehicle_type': 'car',
                'slot_id': None,
                'confidence': 0.0,
                'note': 'YOLO model not loaded; returning fallback'
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
