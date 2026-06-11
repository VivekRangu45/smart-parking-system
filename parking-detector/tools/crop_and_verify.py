import cv2
import os

def crop_cells():
    img_path = "images/WhatsApp_Image_2026-06-11_at_05.38.39.jpeg"
    img = cv2.imread(img_path)
    if img is None:
        print("Could not load image.")
        return

    h, w = img.shape[:2]
    # Current crop config
    CROP = {
        "top":    0.109,
        "bottom": 0.084,
        "left":   0.139,
        "right":  0.055,
    }
    y1 = int(h * CROP["top"])
    y2 = int(h * (1.0 - CROP["bottom"]))
    x1 = int(w * CROP["left"])
    x2 = int(w * (1.0 - CROP["right"]))
    grid_img = img[y1:y2, x1:x2]

    gh, gw = grid_img.shape[:2]
    
    # Let's save a visualization of the 10-column split vs 11-column split
    vis_10 = grid_img.copy()
    vis_11 = grid_img.copy()
    
    # 10 Columns
    cell_w_10 = gw / 10
    cell_h = gh / 3
    for c in range(1, 10):
        cx = int(c * cell_w_10)
        cv2.line(vis_10, (cx, 0), (cx, gh), (0, 0, 255), 2)
    for r in range(1, 3):
        cy = int(r * cell_h)
        cv2.line(vis_10, (0, cy), (gw, cy), (0, 0, 255), 2)
        
    # 11 Columns (actual white lines)
    # The detected lines were: 145, 222, 296, 372, 445, 521, 596, 670, 744, 818, 892, 965
    # Relative to x1 (142):
    v_lines = [222-142, 296-142, 372-142, 445-142, 521-142, 596-142, 670-142, 744-142, 818-142, 892-142]
    for cx in v_lines:
        cv2.line(vis_11, (cx, 0), (cx, gh), (255, 0, 0), 2)
    for r in range(1, 3):
        cy = int(r * cell_h)
        cv2.line(vis_11, (0, cy), (gw, cy), (255, 0, 0), 2)
        
    cv2.imwrite("images/vis_10_cols.jpg", vis_10)
    cv2.imwrite("images/vis_11_cols.jpg", vis_11)
    print("Saved vis_10_cols.jpg and vis_11_cols.jpg in images/ directory.")

if __name__ == "__main__":
    crop_cells()
