"""Prepare CNS plate/gallery images from downloaded open-licensed sources.
Plates: crop -> clean -> pad 4:3 -> out/<name>; hotspots given in source px, converted to %.
Writes plates_src.json (plate id -> file, hs %) and a dot preview in prev/."""
import cv2, numpy as np, json, sys
from PIL import Image
EP = "ep/"; CS = "cs/"
def L(f):
    im = Image.open(f)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGB", im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[3]); im = bg
    return cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2BGR)
def inpaint(im, lines=(), rects=(), circles=(), width=5, mask=None, radius=4):
    m = np.zeros(im.shape[:2], np.uint8) if mask is None else mask.copy()
    for p in lines: cv2.polylines(m, [np.array(p, np.int32)], False, 255, width)
    for (x0, y0, x1, y1) in rects: cv2.rectangle(m, (x0, y0), (x1, y1), 255, -1)
    for (x, y, r, t) in circles: cv2.circle(m, (x, y), r, 255, t)
    return cv2.inpaint(im, m, radius, cv2.INPAINT_TELEA)
def near_mask(im, lines, band, cond):
    near = np.zeros(im.shape[:2], np.uint8)
    for p in lines: cv2.polylines(near, [np.array(p, np.int32)], False, 255, band * 2)
    return (((near > 0) & cond(im)) * 255).astype(np.uint8)
def bright_in(im, rects, thr=150):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY); m = np.zeros(g.shape, np.uint8)
    for (x0, y0, x1, y1) in rects: m[y0:y1, x0:x1] = ((g[y0:y1, x0:x1] > thr) * 255).astype(np.uint8)
    return cv2.dilate(m, np.ones((3, 3), np.uint8))
def red(im):
    b, g, r = [im[:, :, i].astype(int) for i in range(3)]
    return (r > 120) & (r - g > 60) & (r - b > 60)
def dark(thr):
    return lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY) < thr
def fill(im, rects, col):
    for (x0, y0, x1, y1) in rects: im[y0:y1, x0:x1] = col
    return im
def pad43(img, color):
    h, w = img.shape[:2]
    if w / h > 4 / 3: H, W = round(w * 3 / 4), w
    else: H, W = h, round(h * 4 / 3)
    out = np.full((H, W, 3), color, np.uint8); y, x = (H - h) // 2, (W - w) // 2; out[y:y + h, x:x + w] = img
    return out, x, y, W, H
def hcat(a, b, gap=6, col=(0, 0, 0)):
    h = max(a.shape[0], b.shape[0])
    p = lambda m: cv2.copyMakeBorder(m, (h - m.shape[0]) // 2, h - m.shape[0] - (h - m.shape[0]) // 2, 0, 0, cv2.BORDER_CONSTANT, value=col)
    return np.hstack([p(a), np.full((h, gap, 3), col, np.uint8), p(b)])
BL, WH = (0, 0, 0), (255, 255, 255)
P = {}
def plate(pid, out, src, crop, ops, color, hs, minw=900, post=None, pct=False):
    P[pid] = dict(out=out, src=src, crop=crop, ops=ops, color=color, hs=hs, minw=minw, post=post, pct=pct)

# ---------------- anatomy ----------------
lobe_lines = [[(round(x/1.3),round(y/1.3)) for x,y in l] for l in [[(160, 105), (262, 238)], [(385, 83), (432, 168)], [(620, 18), (493, 158)], [(630, 80), (488, 200)], [(630, 142), (518, 214)],
              [(745, 212), (636, 265)], [(745, 310), (505, 356)], [(745, 396), (620, 396)], [(745, 500), (430, 438)]]]
def lobes_ops(im):
    m = near_mask(im, lobe_lines, 4, dark(110))
    im = cv2.inpaint(im, cv2.dilate(m, np.ones((3, 3), np.uint8)), 3, cv2.INPAINT_TELEA)
    return fill(im, [(0, 0, 733, 72), (0, 72, 130, 118), (540, 0, 733, 420), (440, 0, 540, 60)], WH)
plate("cns-lobes", "cns-lobes.jpg", CS + "1306_Lobes_of_Cerebral_CortexN.jpg", (40, 68, 560, 621), lobes_ops, WH,
      {k:(round(x/1.3),round(y/1.3)) for k,(x,y) in {"frontal": (190, 260), "motor": (338, 172), "broca": (250, 305), "sensory": (392, 195), "parietal": (455, 215), "wernicke": (478, 330),
       "temporal": (350, 420), "occipital": (530, 330), "sylvian": (350, 300), "cerebellum": (520, 430), "brainstem-l": (430, 525)}.items()})
csf_lines = [[(round(x/0.939),round(y/0.939)) for x,y in l] for l in [[(135, 72), (292, 72)], [(120, 220), (442, 276)], [(120, 302), (415, 304)], [(112, 365), (432, 322)], [(445, 433), (542, 358)],
             [(420, 488), (577, 414)], [(420, 543), (592, 430)], [(695, 120), (826, 120)], [(705, 162), (826, 162)], [(770, 205), (826, 205)],
             [(600, 272), (826, 272)], [(615, 482), (756, 482)], [(640, 573), (740, 573)]]]
def csf_ops(im):
    m = near_mask(im, csf_lines, 3, dark(100)) | near_mask(im, [[(560, 500), (642, 452)], [(520, 530), (600, 470)]], 6, dark(100))
    im = cv2.inpaint(im, cv2.dilate(m, np.ones((3, 3), np.uint8)), 3, cv2.INPAINT_TELEA)
    R = [(0, 55, 140, 102), (0, 205, 124, 232), (0, 288, 124, 332), (0, 352, 114, 378), (290, 422, 447, 447), (290, 476, 422, 502),
         (290, 530, 422, 557), (826, 105, 1065, 132), (826, 148, 1065, 175), (826, 192, 1065, 218), (826, 258, 1065, 285),
         (756, 468, 895, 495), (740, 560, 855, 588)]
    return fill(im, [tuple(round(v/0.939) for v in r) for r in R], WH)
plate("cns-ventricles", "cns-ventricles.jpg", CS + "1317_CFS_Circulation.jpg", (150, 10, 880, 693), csf_ops, WH,
      {k:(round(x/0.939),round(y/0.939)) for k,(x,y) in {"lat-v": (590, 268), "monro": (415, 302), "third": (438, 335), "aqueduct": (538, 368), "fourth-v": (588, 432), "subarach": (703, 168)}.items()})
plate("cor-sella", "cns-cor-sella.jpg", EP + "PMC13454250_EDM-26-0006fig1.jpg", (445, 55, 770, 324), None, BL,
      {"s-pit": (597, 164), "s-cav": (565, 178), "s-ica": (620, 167), "s-sphenoid": (600, 184), "s-temporal": (512, 180)})
orb_boxes = [(52, 10, 76, 36), (44, 20, 54, 38), (25, 29, 46, 45), (15, 43, 30, 60), (6, 63, 24, 80), (100, 8, 127, 42), (65, 66, 88, 82), (98, 88, 120, 104),
             (76, 102, 99, 118), (63, 107, 80, 124), (76, 118, 99, 134), (28, 113, 52, 128), (121, 123, 145, 140), (48, 136, 80, 168), (146, 146, 169, 162),
             (146, 169, 170, 200), (71, 181, 112, 197), (56, 203, 75, 219), (104, 211, 137, 229), (173, 214, 217, 234)]
orb_lines = [[(50, 28), (68, 43)], [(43, 40), (58, 45)], [(22, 55), (40, 67)], [(22, 72), (48, 80)], [(119, 24), (122, 40)], [(62, 152), (58, 138)],
             [(168, 185), (168, 198)], [(98, 190), (111, 194)], [(128, 222), (136, 214)], [(198, 222), (174, 217)], [(70, 24), (73, 34)]]
def orb_ops(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    m = bright_in(im, [(a-3,b-3,c+3,d+3) for a,b,c,d in orb_boxes], 115) | near_mask(im, orb_lines, 5, lambda i: cv2.cvtColor(i, cv2.COLOR_BGR2GRAY) > 105)
    th = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    t = np.zeros_like(g); t[0:100, 0:135] = ((th[0:100, 0:135] > 35) * 255).astype(np.uint8); cv2.circle(t, (78, 62), 44, 0, -1)
    m = m | t
    return cv2.inpaint(im, cv2.dilate(m, np.ones((3, 3), np.uint8)), 3, cv2.INPAINT_TELEA)
plate("ax-orbit", "cns-ax-orbit.jpg", EP + "PMC8597479_IJO-69-2574-g011.jpg", (4, 0, 334, 230), orb_ops, BL,
      {"o-lens": (68, 43), "o-globe": (78, 62), "o-lacrimal": (37, 64), "o-nerve": (90, 116), "o-chiasm": (167, 203)})

# ---------------- imaging ----------------
plate("gbm-t1c", "cns-gbm-t1c.jpg", CS + "AFIP-00405558-Glioblastoma-Radiology.jpg", None, None, BL,
      {"gbm-ring": (340, 225), "gbm-necrosis": (382, 255), "gbm-ventricle": (308, 372)})
plate("gbm-flair", "cns-gbm-flair.jpg", EP + "PMC10944577_cureus-0016-00000054287-i05.jpg", (4, 284, 243, 565),
      lambda im: inpaint(im, rects=[(8, 286, 38, 320)]), BL,
      {"fl-edema": (198, 445), "fl-tumor": (150, 405), "fl-sulci": (178, 352), "fl-contra": (70, 420)})
plate("lgg-flair", "cns-lgg-flair.jpg", EP + "PMC12947947_cureus-0018-00000102435-i03.jpg", (40, 90, 715, 1100),
      lambda im: inpaint(im, lines=[[(542, 503), (632, 583)]], width=46, rects=[(535, 492, 590, 545)], radius=6), BL,
      {"lgg-mass": (505, 450), "lgg-cortex": (578, 470), "lgg-effect": (392, 480)})
plate("mets-mri", "cns-mets-mri.jpg", CS + "BC_-_Hirnmetastasen_MRT_T1KM_ax.jpg", None, None, BL,
      {"met-gw": (124, 373), "met-small": (362, 268)})
def srs_img():
    im = L(EP + "PMC12414254_cureus-0017-00000089603-i02.jpg")
    im = inpaint(im, rects=[(176, 26, 196, 50), (176, 286, 196, 302)])
    a = im[25:300, 48:340]; c = im[335:598, 48:340]
    return hcat(a, c, 8)
plate("srs-plan", "cns-srs-plan.jpg", srs_img, None, None, BL,
      {"srs-gtv": (95 - 48, 212 - 25), "srs-rx": (160 - 48, 150 - 25), "srs-v12": (238 - 48, 250 - 25),
       "srs-chiasm": (150 - 48 + 292 + 8, 581 - 335 + 6), "srs-cavity": (193 - 48, 158 - 25)})
plate("mening", "cns-mening.jpg", CS + "MRIMeningioma.png", (60, 0, 690, 560),
      lambda im: cv2.inpaint(im, cv2.dilate((red(im) * 255).astype(np.uint8), np.ones((7, 7), np.uint8)), 5, cv2.INPAINT_TELEA), BL,
      {"men-mass": (400, 140), "men-cleft": (430, 188)})
plate("vs", "cns-vs.jpg", CS + "Akustikus-Schwannon_rechts_MRT_T1KM_axial_001.jpg", (60, 150, 880, 1060), None, BL,
      {"vs-iac": (292, 572), "vs-cpa": (345, 615), "vs-bs": (445, 650), "vs-fourth": (445, 692)})
plate("pit", "cns-pit.jpg", EP + "PMC13198944_luag127f1.jpg", (24, 22, 336, 345),
      lambda im: inpaint(im, lines=[[(136, 175), (160, 175)]], width=7), BL,
      {"pit-mass": (166, 195), "pit-chiasm": (163, 172), "pit-ica": (194, 195), "pit-sphenoid": (170, 262)})
plate("ct-head", "cns-ct-head.jpg", EP + "PMC12098020_gr6.jpg", (140, 70, 565, 490),
      lambda im: inpaint(im, rects=[(508, 204, 533, 229)]), BL,
      {"ct-hem": (425, 245), "ct-edema": (448, 282)})
def necro_img():
    im = L(EP + "PMC12393895_cureus-0017-00000089006-i02.jpg")
    im = inpaint(im, circles=[(100, 280, 36, 9), (477, 270, 38, 14)], rects=[(12, 22, 55, 70), (392, 22, 436, 70), (178, 4, 200, 20)])
    return hcat(im[15:438, 0:352], im[15:438, 382:750], 8)
plate("post-tx", "cns-post-tx.jpg", necro_img, None, None, BL,
      {"pt-enh": (98, 285 - 15), "pt-rcbv": (470 - 382 + 352 + 8, 268 - 15)})
plate("spine-mri", "cns-spine-mri.jpg", EP + "PMC9265325_cancers-14-03289-g010.jpg", (5, 4, 350, 650), None, BL,
      {"sc-vb": (158, 292), "sc-epi": (210, 296), "sc-cord": (230, 322), "sc-csf": (181, 206)})

def run(pid):
    d = P[pid]
    im = d["src"]() if callable(d["src"]) else L(d["src"])
    if d["ops"]: im = d["ops"](im)
    x0, y0, x1, y1 = d["crop"] or (0, 0, im.shape[1], im.shape[0]); im = im[y0:y1, x0:x1]
    im, px, py, W, H = pad43(im, d["color"])
    sc = min(1100 / W, max(1, d["minw"] / W))
    im = cv2.resize(im, (round(W * sc), round(H * sc)), interpolation=cv2.INTER_CUBIC if sc > 1 else cv2.INTER_AREA)
    if d["post"]: im = d["post"](im)
    cv2.imwrite("out/" + d["out"], im, [cv2.IMWRITE_JPEG_QUALITY, 86])
    hs = dict(d["hs"]) if d["pct"] else {k: (round((x - x0 + px) / W * 100, 1), round((y - y0 + py) / H * 100, 1)) for k, (x, y) in d["hs"].items()}
    pv = im.copy(); h_, w_ = pv.shape[:2]
    for i, (k, (x, y)) in enumerate(hs.items()):
        c = (int(x * w_ / 100), int(y * h_ / 100)); cv2.circle(pv, c, 10, (0, 0, 255), 2); cv2.putText(pv, k, (c[0] + 12, c[1] + 5), 0, 0.55, (0, 255, 0), 2)
    cv2.imwrite("prev/" + d["out"].replace(".jpg", ".png"), pv)
    return dict(file=d["out"], hs=hs)

GAL = {
    "cns-g-territories.jpg": lambda: L(CS + "Cerebral_vascular_territories.jpg"),
    "cns-g-homunculus.jpg": lambda: L(CS + "1421_Sensory_Homunculus.jpg"),
    "cns-g-hawbrt.jpg": lambda: inpaint(L(EP + "PMC9841677_40001_2022_894_Fig1_HTML.jpg"), rects=[(503, 5, 535, 45)])[0:538, 500:992],
    "cns-g-csi.jpg": lambda: L(EP + "PMC13354313_cureus-0018-00000110625-i03.jpg")[20:1250, 130:440],
}
def pctr(im, x0, y0, x1, y1):
    h, w = im.shape[:2]; return int(x0 * w / 100), int(y0 * h / 100), int(x1 * w / 100), int(y1 * h / 100)
def lobes_post(im):
    fill(im, [pctr(im, 70, 0, 100, 12)], WH)
    x0, y0, x1, y1 = pctr(im, 25, 6, 36, 20)
    m = np.zeros(im.shape[:2], np.uint8); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    m[y0:y1, x0:x1] = ((g[y0:y1, x0:x1] < 90) * 255).astype(np.uint8)
    return cv2.inpaint(im, cv2.dilate(m, np.ones((5, 5), np.uint8)), 4, cv2.INPAINT_TELEA)
P["cns-lobes"].update(post=lobes_post, pct=True, hs={"frontal": (28, 35), "motor": (51, 12), "broca": (31, 48), "sensory": (60, 16), "parietal": (66, 25),
    "wernicke": (63, 40), "temporal": (50, 52), "occipital": (76, 40), "sylvian": (46, 40), "cerebellum": (70, 61), "brainstem-l": (63, 78)})

if __name__ == "__main__":
    res = {}
    for pid in (sys.argv[1:] or P): res[pid] = run(pid); print(pid, "ok")
    if not sys.argv[1:]:
        for n, f in GAL.items():
            im = f(); h, w = im.shape[:2]
            if max(h, w) > 1000: s = 1000 / max(h, w); im = cv2.resize(im, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
            cv2.imwrite("out/" + n, im, [cv2.IMWRITE_JPEG_QUALITY, 86]); print(n, im.shape[1], im.shape[0])
    old = json.load(open("plates_src.json")) if sys.argv[1:] else {}
    old.update(res); json.dump(old, open("plates_src.json", "w"), indent=1)
