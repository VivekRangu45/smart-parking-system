import cv2
import os

def draw_grids():
    y_lines = [60, 211, 362, 512]
    x_lines = [145, 222, 296, 372, 445, 521, 596, 670, 744, 818, 892, 966]
    
    img_dir = "images"
    exts = {".jpg", ".jpeg", ".png"}
    files = sorted([
        os.path.join(img_dir, f) for f in os.listdir(img_dir)
        if os.path.splitext(f)[1].lower() in exts
        and "_debug" not in f
        and "_calibration" not in f
        and "vis_" not in f
        and "_grid" not in f
    ])
    
    for f in files:
        img = cv2.imread(f)
        if img is None:
            continue
            
        vis = img.copy()
        
        # Draw horizontal lines
        for y in y_lines:
            cv2.line(vis, (x_lines[0], y), (x_lines[-1], y), (0, 0, 255), 2)
            
        # Draw vertical lines
        for x in x_lines:
            cv2.line(vis, (x, y_lines[0]), (x, y_lines[-1]), (0, 0, 255), 2)
            
        # Save output
        out_name = os.path.splitext(os.path.basename(f))[0] + "_grid.jpg"
        out_path = os.path.join(img_dir, out_name)
        cv2.imwrite(out_path, vis)
        print(f"Saved: {out_path}")

if __name__ == "__main__":
    draw_grids()
