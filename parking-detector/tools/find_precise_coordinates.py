import cv2
import numpy as np

def find_precise():
    img = cv2.imread("images/WhatsApp_Image_2026-06-11_at_05.38.39.jpeg")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Let's crop a vertical strip where the vertical lines are clearly visible and not blocked by cars.
    # Wait, the vertical lines go all the way through the parking lot.
    # Let's look at the horizontal line Y=211 or Y=362.
    # Let's find vertical lines by looking at slices.
    # We can also plot the vertical profile of the image to see.
    # Let's find the columns by thresholding the image and finding the vertical lines.
    
    # Threshold white pixels
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    
    # We want to find the vertical white lines.
    # Let's count white pixels vertically in each column (X) from Y=60 to Y=512.
    col_counts = np.sum(thresh[60:512, :], axis=0)
    
    # Let's print the local maxima of col_counts.
    import scipy.signal
    # Or just write a simple peak finder
    peaks = []
    for x in range(1, len(col_counts) - 1):
        if col_counts[x] > col_counts[x-1] and col_counts[x] > col_counts[x+1] and col_counts[x] > 5000:
            peaks.append((x, col_counts[x]))
            
    # Print peaks sorted by X
    print("Found peaks in column counts:")
    for p in sorted(peaks):
        print(f"X={p[0]}, sum={p[1]}")

if __name__ == "__main__":
    find_precise()
