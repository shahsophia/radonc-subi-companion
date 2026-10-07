# Zoomed-out nasopharynx plate: same anatomy-model photo as p_naso.py (letters/leader lines painted out),
# with a dashed box showing the area the zoomed-in plate (hn-nasopharynx.jpg) covers.
from imgtool import *
im = load('nasopharynx_anatomy.png')
lines=[[(70,360),(454,619)],[(456,572),(456,662)],[(60,643),(412,643)],[(65,885),(428,711)],
 [(820,95),(412,538)],[(812,92),(690,356)],[(828,262),(580,486)],[(828,262),(622,523)],[(828,262),(636,582)],[(848,372),(735,581)],[(880,490),(791,601)]]
out = inpaint_dark(im, lines=lines, band=12, thr=60)
marks=[(415,155),(515,152),(210,226),(440,272),(441,390),(205,375),(530,178),(420,210)]
out = inpaint_dark(out, lines=[[(200+x-9,380+y),(200+x+9,380+y)] for x,y in marks], band=12, thr=85, grow=1)
X0, Y0, X1, Y1 = 120, 280, 880, 1150
crop = out[Y0:Y1, X0:X1].copy()
# letters F/G sit at the right edge of this crop on a white background
crop[:, 735:] = np.where(crop[:, 735:].mean(axis=2, keepdims=True) < 120, 255, crop[:, 735:])
crop[50:105, 725:] = 255  # leftover "F"
crop = inpaint(crop, rects=[(430,545,494,610), (335,648,394,684)])  # sticker numbers on the model
# dashed zoom box (zoomed-in plate = out[470:710, 290:610])
bx0, by0, bx1, by1 = 290-X0, 470-Y0, 610-X0, 710-Y0
def dashed(p, q):
    (x0, y0), (x1, y1) = p, q
    n = int(max(abs(x1-x0), abs(y1-y0)) // 14)
    for i in range(0, n, 2):
        a = (int(x0+(x1-x0)*i/n), int(y0+(y1-y0)*i/n)); b = (int(x0+(x1-x0)*(i+1)/n), int(y0+(y1-y0)*(i+1)/n))
        cv2.line(crop, a, b, (255,255,255), 7); cv2.line(crop, a, b, (40,40,40), 3)
for p, q in [((bx0,by0),(bx1,by0)), ((bx1,by0),(bx1,by1)), ((bx1,by1),(bx0,by1)), ((bx0,by1),(bx0,by0))]: dashed(p, q)
img = pad43(crop, (255,255,255))
save(img, 'hn-nasopharynx-wide.jpg', grid=True)
H, W = img.shape[:2]; px = (W - crop.shape[1])//2; py = (H - crop.shape[0])//2
def pct(x, y): return round((x-X0+px)/W*100), round((y-Y0+py)/H*100)
for k, v in {"nasopharynx": (432,612), "sphenoid": (412,538), "turbinates": (622,523), "hard palate": (640,648),
             "soft palate": (480,676), "oropharynx": (420,740), "oral tongue": (610,760), "larynx": (470,1040)}.items():
    print(k, pct(*v))
