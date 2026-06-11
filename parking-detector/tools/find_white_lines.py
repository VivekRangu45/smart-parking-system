import cv2
import numpy as np

def find_white_lines():
    img_path = "images/img_1.jpg"
    img = cv2.imread(img_path)
    if img is None:
        print("Could not load image.")
        return

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Threshold to get white lines (high intensity)
    # The lines are very white, so we threshold at > 200
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
    
    # Let's project vertically and horizontally to find line coordinates
    vertical_proj = np.sum(thresh, axis=0)
    horizontal_proj = np.sum(thresh, axis=1)
    
    # Print peaks in horizontal projection (row boundaries)
    # Print peaks in vertical projection (column boundaries)
    import matplotlib.pyplot as plt
    
    # Find local maxima to detect line locations
    def find_peaks(proj, threshold_factor=0.2):
        peaks = []
        limit = np.max(proj) * threshold_factor
        in_peak = False
        start = 0
        for idx, val in enumerate(proj):
            if val > limit:
                if not in_peak:
                    start = idx
                    in_peak = True
            else:
                if in_peak:
                    peaks.append((start, idx - 1))
                    in_peak = False
        if in_peak:
            peaks.append((start, len(proj) - 1))
        
        # Return middle of each peak
        return [int((s + e) / 2) for s, e in peaks]

    h_peaks = find_peaks(horizontal_proj, 0.15)
    v_peaks = find_peaks(vertical_proj, 0.15)
    
    print("Horizontal lines (Y coordinates):", h_peaks)
    print("Vertical lines (X coordinates):", v_peaks)
    print(f"Number of rows (horizontal segments): {len(h_peaks)-1}")
    print(f"Number of columns (vertical segments): {len(v_peaks)-1}")

if __name__ == "__main__":
    find_white_lines()
