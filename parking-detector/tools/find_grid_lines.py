import cv2
import numpy as np

def find_exact_grid_lines():
    img_path = "images/img_1.jpg"
    img = cv2.imread(img_path)
    if img is None:
        print("Could not load image.")
        return

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # We know the grid is roughly Y: 60 to 512, X: 142 to 968.
    # Let's inspect vertical lines by taking a slice near the row dividers where cars are less likely to block the vertical lines, 
    # or look for vertical line segments.
    # Let's sum vertically along rows that are close to horizontal dividers (Y = 211, Y = 362)
    # At Y = 211 and Y = 362, the horizontal lines run. The vertical lines intersect them.
    # Let's find white pixels (gray > 200) that are present in both row 1, row 2, and row 3.
    
    # We can detect lines using Hough Line Transform
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
    
    vertical_x = []
    horizontal_y = []
    
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # If vertical
            if abs(x1 - x2) < 3:
                vertical_x.append((x1 + x2) // 2)
            # If horizontal
            elif abs(y1 - y2) < 3:
                horizontal_y.append((y1 + y2) // 2)
                
    # Cluster vertical X coordinates
    vertical_x = sorted(list(set(vertical_x)))
    horizontal_y = sorted(list(set(horizontal_y)))
    
    def cluster_coords(coords, min_dist=15):
        if not coords:
            return []
        clusters = [[coords[0]]]
        for x in coords[1:]:
            if x - clusters[-1][-1] <= min_dist:
                clusters[-1].append(x)
            else:
                clusters.append([x])
        return [int(np.mean(c)) for c in clusters]

    unique_v = cluster_coords(vertical_x, 15)
    unique_h = cluster_coords(horizontal_y, 15)
    
    print("Detected Vertical Lines (X):", unique_v)
    print("Detected Horizontal Lines (Y):", unique_h)

if __name__ == "__main__":
    find_exact_grid_lines()
