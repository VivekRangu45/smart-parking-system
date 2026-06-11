import cv2
import numpy as np

def inspect_ref():
    img = cv2.imread("images/WhatsApp_Image_2026-06-11_at_05.38.39.jpeg")
    h, w = img.shape[:2]
    
    # Precise boundaries
    y_lines = [60, 211, 362, 512]
    x_lines = [145, 222, 296, 372, 445, 521, 596, 670, 744, 818, 892, 966]
    
    print("--- Reference Image Analysis (3 rows, 11 columns) ---")
    for r in range(3):
        y1, y2 = y_lines[r], y_lines[r+1]
        row_cars = []
        for c in range(11):
            x1, x2 = x_lines[c], x_lines[c+1]
            cell = img[y1:y2, x1:x2]
            
            # Simple check if there's a car
            # Convert to gray
            gray = cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY)
            # A slot is occupied if it contains pixels that deviate significantly from grey road color
            # Let's compute mean and variance or just check if it matches road color
            # Let's print the mean pixel value and some description
            mean_val = np.mean(gray)
            std_val = np.std(gray)
            
            # Save cell image for manual inspection if needed
            # cv2.imwrite(f"output/cell_r{r+1}_c{c+1}.jpg", cell)
            
            # Let's count non-road pixels
            # Road is generally around 60-70 in intensity. Cars are either white (>150) or dark/colored
            is_car = "Empty"
            # White car check
            if np.mean(gray > 120) > 0.25:
                is_car = "Car (White/Bright)"
            # Dark/colored car check
            elif np.std(gray) > 15:
                is_car = "Car (Dark/Colored)"
                
            row_cars.append(f"Col{c+1}({is_car})")
        print(f"Row {r+1}: " + " | ".join(row_cars))

if __name__ == "__main__":
    inspect_ref()
