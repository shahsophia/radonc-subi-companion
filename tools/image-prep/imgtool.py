"""Helpers for preparing plate/gallery images: crop, paint out labels/leader lines, pad to 4:3.
Needs Pillow + opencv-python-headless. Run each p_*.py from this folder."""
import cv2, numpy as np, os, tempfile
from PIL import Image
ROOT = "/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"
SITE = os.environ.get("SITE", "headneck")  # which disease site the p_*.py scripts are preparing
SRC = ROOT + {"headneck": "Head and neck/", "breast": "Breast cancer/", "thoracic": "Thoracic/", "gyn": "Gynecology/"}[SITE]
OUT = ROOT + "src/images/" + SITE + "/"
PREV = os.path.join(tempfile.gettempdir(), "radonc-img-preview") + "/"  # gridded previews for checking hotspot positions
os.makedirs(PREV, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
def load(name):
    im = Image.open(SRC+name)
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (255,255,255)); bg.paste(im, mask=im.split()[3]); im = bg
    return cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2BGR)
def inpaint(img, lines=(), polys=(), rects=(), width=5, radius=4):
    m = np.zeros(img.shape[:2], np.uint8)
    for pts in lines:
        cv2.polylines(m, [np.array(pts, np.int32)], False, 255, width)
    for pts in polys:
        cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    for (x0,y0,x1,y1) in rects:
        cv2.rectangle(m, (x0,y0), (x1,y1), 255, -1)
    return cv2.inpaint(img, m, radius, cv2.INPAINT_TELEA)
def pad43(img, color):
    h, w = img.shape[:2]
    if w/h > 4/3: H, W = round(w*3/4), w
    else: H, W = h, round(h*4/3)
    out = np.full((H, W, 3), color, np.uint8)
    y, x = (H-h)//2, (W-w)//2
    out[y:y+h, x:x+w] = img
    return out
def save(img, name, maxw=1100, grid=False):
    h, w = img.shape[:2]
    if w > maxw: img = cv2.resize(img, (maxw, round(h*maxw/w)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(OUT+name, img, [cv2.IMWRITE_JPEG_QUALITY, 84])
    p = img.copy()
    if grid:
        H, W = p.shape[:2]
        for i in range(1,10):
            cv2.line(p, (W*i//10,0), (W*i//10,H), (0,255,255), 1)
            cv2.line(p, (0,H*i//10), (W,H*i//10), (0,255,255), 1)
            cv2.putText(p, str(i*10), (W*i//10+2, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0,200,255), 1)
            cv2.putText(p, str(i*10), (2, H*i//10-2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0,200,255), 1)
    cv2.imwrite(PREV+name.replace(".jpg",".png"), p)
    print(name, img.shape[1], "x", img.shape[0], os.path.getsize(OUT+name)//1024, "KB")
def gridprev(img, name, step=50, region=None, scale=1):
    p = img.copy()
    x0,y0 = 0,0
    if region:
        x0,y0,x1,y1 = region; p = p[y0:y1, x0:x1].copy()
    if scale != 1: p = cv2.resize(p, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    H, W = p.shape[:2]
    for gx in range((x0//step+1)*step, x0+W//scale, step):
        X = int((gx-x0)*scale); cv2.line(p,(X,0),(X,H),(255,160,0),1); cv2.putText(p,str(gx),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,0,0),1)
    for gy in range((y0//step+1)*step, y0+H//scale, step):
        Y = int((gy-y0)*scale); cv2.line(p,(0,Y),(W,Y),(255,160,0),1); cv2.putText(p,str(gy),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,0,0),1)
    cv2.imwrite(PREV+name, p)
def inpaint_dark(img, lines=(), band=14, thr=70, grow=2, radius=4, extra_rects=(), bright=False):
    """Mask only dark (or bright, if bright=True) pixels within `band` px of each approximate line."""
    near = np.zeros(img.shape[:2], np.uint8)
    for pts in lines:
        cv2.polylines(near, [np.array(pts, np.int32)], False, 255, band*2)
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ink = (g > thr) if bright else (g < thr)
    m = ((near > 0) & ink).astype(np.uint8)*255
    if grow: m = cv2.dilate(m, np.ones((2*grow+1, 2*grow+1), np.uint8))
    for (x0,y0,x1,y1) in extra_rects: cv2.rectangle(m, (x0,y0), (x1,y1), 255, -1)
    return cv2.inpaint(img, m, radius, cv2.INPAINT_TELEA)
