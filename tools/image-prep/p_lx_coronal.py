# Coronal larynx plate for the anatomy quiz: the labeled gallery diagram (hn-g-lx-coronal.jpg, from p_gal.py)
# with its text, leader lines, and label dots painted out.
from imgtool import *
im = cv2.imread(OUT + 'hn-g-lx-coronal.jpg')
H, W = im.shape[:2]
out = im.copy()
white = (255, 255, 255)
# text blocks on the white background
out[:42, 200:400] = white; out[:42, 450:615] = white
m = np.zeros((H, W), bool); m[:, :300] = True; m[:100, 285:] = False   # keep the left hyoid horn
out[m] = white
out[200:, 742:] = white
dots = [(300,70),(340,165),(530,128),(456,311),(599,351),(501,435),(568,435),(391,509),(624,629),(535,690)]
lines = [[(530,40),(530,128)],[(300,165),(340,165)],[(300,310),(455,310)],[(300,435),(500,435)],
         [(300,556),(350,556),(391,509)],[(599,351),(742,351)],[(568,435),(742,435)],
         [(624,629),(680,565),(742,565)],[(535,690),(742,690)]]
mask = np.zeros((H, W), np.uint8)
lines.append([(300,32),(300,62)])
for pts in lines: cv2.polylines(mask, [np.array(pts, np.int32)], False, 255, 10)
for (x, y) in dots: cv2.circle(mask, (x, y), 17, 255, -1)
out = cv2.inpaint(out, mask, 5, cv2.INPAINT_TELEA)
m2 = np.zeros((H, W), np.uint8); cv2.circle(m2, (538, 129), 24, 255, -1)
out = cv2.inpaint(out, m2, 9, cv2.INPAINT_NS)  # second pass: dark ring left by the epiglottis label dot
save(out, 'hn-larynx-coronal.jpg', maxw=1000, grid=True)
