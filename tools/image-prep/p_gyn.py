# GYN: anatomy + imaging plates and galleries. Sources and licenses are listed in Gynecology/SOURCES.md.
import os; os.environ["SITE"]="gyn"
from imgtool import *
WHITE=(255,255,255); BLACK=(0,0,0)
def bbox_crop(im, pad=12, thr=245):
    m = (im.min(axis=2) < thr); ys, xs = np.where(m)
    y0, y1, x0, x1 = max(ys.min()-pad,0), min(ys.max()+pad, im.shape[0]), max(xs.min()-pad,0), min(xs.max()+pad, im.shape[1])
    return im[y0:y1, x0:x1]
def up(img, f): return cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_CUBIC)
def cover_letter(im, x0, y0, x1, y1, sx, sy):
    """Replace a panel letter/arrow box with a same-size patch of nearby background."""
    im[y0:y1, x0:x1] = im[sy:sy+(y1-y0), sx:sx+(x1-x0)]

# --- Anatomy: Cancer Research UK diagrams (labels, leader lines and tumors removed from the SVG source) ---
save(pad43(bbox_crop(load("cruk477_sagittal_pelvis_nolabels.png")), WHITE), "gyn-sagittal.jpg", grid=True)
save(pad43(bbox_crop(load("cruk196_uterus_nolabels.png")), WHITE), "gyn-uterus.jpg", grid=True)
save(pad43(bbox_crop(load("cruk040_pelvic_nodes_nolabels.png")), WHITE), "gyn-nodes-map.jpg", grid=True)

def clean(im, rects=(), color_rects=(), sat=90, grow=3, radius=4):
    """Inpaint whole rects (panel letters, text) and only the saturated (colored arrow) pixels inside color_rects."""
    m = np.zeros(im.shape[:2], np.uint8)
    for (x0,y0,x1,y1) in rects: m[y0:y1, x0:x1] = 255
    if color_rects:
        hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV); cm = np.zeros_like(m)
        for (x0,y0,x1,y1) in color_rects: cm[y0:y1, x0:x1] = 255
        m |= cm & ((hsv[...,1] > sat).astype(np.uint8)*255)
    if grow: m = cv2.dilate(m, np.ones((2*grow+1,2*grow+1), np.uint8))
    return cv2.inpaint(im, m, radius, cv2.INPAINT_TELEA)
def bright_rects(im, rects, thr=200, grow=2):
    """Mask of bright (white-arrow / white-letter) pixels inside rects."""
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY); m = np.zeros(g.shape, np.uint8)
    for (x0,y0,x1,y1) in rects: m[y0:y1, x0:x1] = (g[y0:y1, x0:x1] > thr).astype(np.uint8)*255
    return cv2.dilate(m, np.ones((2*grow+1,2*grow+1), np.uint8))

# Vulva: zoom in on the vulva itself (the CRUK frame includes both thighs).
im = bbox_crop(load("cruk285_vulva_nolabels.png")); h, w = im.shape[:2]
save(pad43(up(im[int(h*.24):int(h*.82), int(w*.30):int(w*.70)], 2), WHITE), "gyn-vulva.jpg", grid=True)

# Vagina: zoom of the same CRUK sagittal diagram (cervix and fornices down to the introitus, bladder in front, rectum behind).
im = pad43(bbox_crop(load("cruk477_sagittal_pelvis_nolabels.png")), WHITE); h, w = im.shape[:2]
save(pad43(up(im[int(h*.36):int(h*.80), int(w*.26):int(w*.74)], 1.6), WHITE), "gyn-vagina.jpg", grid=True)

# Groin: 3D femoral triangle, panel (b) of Pinto et al. UOG 2025 fig. 19 (CC BY 4.0); unlabeled panel.
im = load("pmc12133214_fig19_femoral_triangle.jpg")[0:355, 238:470].copy()
im = clean(im, rects=[(0,0,26,26)])
save(pad43(up(im, 2.4), (200,200,200)), "gyn-groin.jpg", grid=True)

# Axial CT at L4 (normal contrast CT, Häggström, CC0). Axial image only (drop the scout).
im = load("haggstrom_normal_ct_axial_150.png")[62:298, 70:482]
save(pad43(up(im, 2.5), BLACK), "gyn-nodes-ax-upper.jpg", grid=True)

# Planning CT (female pelvis, CTVs drawn), Cancers 2026 fig. 2 panels A and B (CC BY 4.0).
im = load("pmc13465101_fig2_cervix_ctv_ct.jpg")
save(pad43(up(im[27:216, 12:350], 2.8), BLACK), "gyn-ct-sim.jpg", grid=True)
save(pad43(up(im[27:216, 372:713], 2.8), BLACK), "gyn-nodes-ax-lower.jpg", grid=True)

# Groin CT with inguinal CTVs (Cancers 2023 fig. 2, right panel, CC BY 4.0).
im = load("pmc10741760_fig2_inguinal_ctv_ct.jpg")[12:228, 374:736]
save(pad43(up(im, 2.8), BLACK), "gyn-ct-groin.jpg", grid=True)

# Cervix sagittal T2 (Otero-Garcia et al. Insights Imaging 2019 fig. 17a, CC BY 4.0): stage IVA tumor. Remove the arrows and panel letter.
im = load("pmc6375059_fig17_cervix_mri.jpg")[0:393, 0:392].copy()
im = clean(im, rects=[(0,345,45,393)], color_rects=[(85,235,150,285)], sat=80)
im = cv2.inpaint(im, bright_rects(im, [(245,105,295,165)], thr=215), 4, cv2.INPAINT_TELEA)
save(pad43(up(im, 2.6), BLACK), "gyn-mri-cx-sag.jpg", grid=True)

# PET/CT staging (Hosseini et al. J Imaging 2025 fig. 4, CC BY 4.0): MIP plus axial fused/CT pairs. Remove letters and arrows.
im = load("pmc11856187_fig4_cervix_pet.jpg")
letters = [(2,2,40,40),(298,2,332,36),(545,2,578,36),(298,216,332,250),(545,216,578,250),(298,402,332,436),(545,402,578,436)]
arrows  = [(148,158,195,184),(355,312,392,336),(595,312,632,336),(466,418,505,442),(702,418,740,442)]
im = clean(im, rects=letters, color_rects=arrows, sat=70)
save(pad43(up(im, 1.4), BLACK), "gyn-pet.jpg", grid=True)

def tile(panels, cell=(360,270)):
    """Letterbox each panel into a cell and lay them out 2 per row."""
    cw, ch = cell; rows = []
    for i in range(0, len(panels), 2):
        row = []
        for p in panels[i:i+2]:
            s_ = min(cw/p.shape[1], ch/p.shape[0]); q = cv2.resize(p, (round(p.shape[1]*s_), round(p.shape[0]*s_)), interpolation=cv2.INTER_CUBIC)
            c = np.zeros((ch, cw, 3), np.uint8); y, x = (ch-q.shape[0])//2, (cw-q.shape[1])//2; c[y:y+q.shape[0], x:x+q.shape[1]] = q
            row.append(c)
        rows.append(np.hstack(row))
    return np.vstack(rows)

# CT staging findings: 2x2 of hydronephrosis + pelvic mass (Cureus 2025, CC BY 4.0) and omental caking + ascites (Cureus 2026, CC BY 4.0).
h = load("pmc12329160_fig1_hydronephrosis_ct.jpg")
h[238:272, 0:62] = 0; h[238:272, 372:425] = 0   # panel letters sit on black background
h = clean(h, color_rects=[(15,185,75,245),(470,200,525,265)], sat=80)
a = load("pmc13105303_fig1_ascites_omental_ct.jpg")
a[5:42, 258:295] = 0; a[235:272, 2:42] = 0; a[238:268, 52:225] = 0
a = clean(a, color_rects=[(390,40,445,75),(80,285,110,315)], sat=80)
a = cv2.inpaint(a, bright_rects(a, [(428,62,472,92),(82,252,112,292)], thr=200), 4, cv2.INPAINT_TELEA)
comp = tile([h[0:272, 0:366], h[0:272, 376:750], a[0:200, 255:500], a[235:470, 0:250]])
save(pad43(up(comp, 1.5), BLACK), "gyn-ct-staging.jpg", grid=True)

# Galleries
im = load("pmc11856187_fig1_cervix_mri_pet.jpg")[222:448, 250:522].copy(); im = clean(im, rects=[(4,4,36,34)])
save(up(im, 2), "gyn-g-pet-paraaortic.jpg", maxw=900)
save(up(load("pmc10813817_fig17_inguinal_nodes_ct.jpg")[0:305, 0:345], 2), "gyn-g-groin-ct.jpg", maxw=900)
