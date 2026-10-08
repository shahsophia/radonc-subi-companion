"""prostate_fill.py WORKDIR : build the prostate plate/gallery images from downloaded open-license sources
and write WORKDIR/prostate_plates.json + prostate_gallery.json (then run prostate_integrate.py).
WORKDIR layout: ep/ (Europe PMC / PMC S3 figures), art/<PMCID>/ (hi-res images pulled from the article PDF
with pdfimg.py), cs/ (Wikimedia Commons files), hgf/ (Häggström CT slices). Needs Pillow + opencv.
Previews with numbered dots go to WORKDIR/prev/.
Hotspot tuples: (id, label, panel_index, x, y, blurb or None to keep the old blurb); x/y are % of that
panel's grid frame (None grid frame = the whole source image)."""
import sys, os, json, cv2, numpy as np
from PIL import Image
W = sys.argv[1].rstrip("/") + "/"
R = "/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"
OUT = R + "src/images/prostate/"; os.makedirs(OUT, exist_ok=True); os.makedirs(W + "prev", exist_ok=True)
BL, WH = (0, 0, 0), (255, 255, 255)

def load(p):
    im = Image.open(W + p if not p.startswith("/") else p)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGB", im.size, WH); bg.paste(im, mask=im.split()[3]); im = bg
    return cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2BGR)

def inpaint(im, rects):
    m = np.zeros(im.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in rects: m[y0:y1, x0:x1] = 255
    return cv2.inpaint(im, m, 5, cv2.INPAINT_TELEA)

def inpaint_dark(im, rects, th=110):
    """paint out dark line pixels (leader lines) inside rects"""
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    m = np.zeros(im.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in rects: m[y0:y1, x0:x1] = (g[y0:y1, x0:x1] < th) * 255
    return cv2.inpaint(im, cv2.dilate(m, np.ones((5, 5), np.uint8)), 4, cv2.INPAINT_TELEA)

def build(name, panels, color, hs, gap=8, rows=None):
    ims, offs = [], [None] * len(panels)
    for src, gridf, crop, ops in panels:
        im = load(src)
        if ops: im = ops(im)
        gf = gridf or (0, 0, im.shape[1], im.shape[0]); cr = crop or gf
        ims.append((im[cr[1]:cr[3], cr[0]:cr[2]].copy(), gf, cr))
    rows = rows or [list(range(len(ims)))]
    rw = [sum(ims[k][0].shape[1] for k in r) + gap * (len(r) - 1) for r in rows]
    rh = [max(ims[k][0].shape[0] for k in r) for r in rows]
    w = max(rw); h = sum(rh) + gap * (len(rows) - 1)
    img = np.full((h, w, 3), color, np.uint8); y = 0
    for r, ww_, hh_ in zip(rows, rw, rh):
        x = (w - ww_) // 2
        for k in r:
            im = ims[k][0]; yy = y + (hh_ - im.shape[0]) // 2
            img[yy:yy + im.shape[0], x:x + im.shape[1]] = im; offs[k] = (x, yy); x += im.shape[1] + gap
        y += hh_ + gap
    if w / h > 4 / 3: Hh, Ww = round(w * 3 / 4), w
    else: Hh, Ww = h, round(h * 4 / 3)
    can = np.full((Hh, Ww, 3), color, np.uint8); py, px = (Hh - h) // 2, (Ww - w) // 2
    can[py:py + h, px:px + w] = img
    out = []
    for hid, label, pi, xp, yp, blurb in hs:
        im, gf, cr = ims[pi]; ox, oy = offs[pi]
        sx = gf[0] + xp / 100 * (gf[2] - gf[0]); sy = gf[1] + yp / 100 * (gf[3] - gf[1])
        X = sx - cr[0] + ox + px; Y = sy - cr[1] + oy + py
        out.append(dict(id=hid, label=label, x=round(X / Ww * 100, 1), y=round(Y / Hh * 100, 1), blurb=blurb))
    sc = min(1, 1100 / Ww)
    if sc < 1: can = cv2.resize(can, (round(Ww * sc), round(Hh * sc)), interpolation=cv2.INTER_AREA)
    elif Ww < 800: can = cv2.resize(can, (800, round(Hh * 800 / Ww)), interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(OUT + name, can, [cv2.IMWRITE_JPEG_QUALITY, 88])
    pv = can.copy(); hh, ww = pv.shape[:2]
    for i, h_ in enumerate(out):
        c = (int(h_["x"] * ww / 100), int(h_["y"] * hh / 100))
        cv2.circle(pv, c, 9, (0, 0, 255), 2); cv2.putText(pv, str(i + 1), (c[0] + 10, c[1] + 5), 0, 0.6, (0, 255, 255), 2)
    cv2.imwrite(W + "prev/" + name, pv)
    return out

def gallery_img(name, src, crop=None, ops=None, maxw=1000, minw=600):
    im = load(src)
    if ops: im = ops(im)
    if crop: im = im[crop[1]:crop[3], crop[0]:crop[2]]
    h, w = im.shape[:2]
    if w > maxw: im = cv2.resize(im, (maxw, round(h * maxw / w)), interpolation=cv2.INTER_AREA)
    elif w < minw: im = cv2.resize(im, (minw, round(h * minw / w)), interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(OUT + name, im, [cv2.IMWRITE_JPEG_QUALITY, 88])

def pct(box, x, y):
    """source pixel -> % of box"""
    return round((x - box[0]) / (box[2] - box[0]) * 100, 1), round((y - box[1]) / (box[3] - box[1]) * 100, 1)

P = {}  # plate id -> (image name, caption, title or None, hotspots)
def plate(pid, name, panels, color, hs, caption, title=None, rows=None):
    P[pid] = (name, caption, title, build(name, panels, color, hs, rows=rows))

# ---- sources ----
JAM = "art/jampdf/"                      # Jambor I et al., Acta Radiol Open 2021 (PMC8638086), CC BY-NC
JAMC = "Jambor I et al., Acta Radiol Open 2021 (PMC8638086), %s, CC BY-NC 4.0."
CAAC = "art/caac/p4_191.png"             # Chakrabarti D et al., CA Cancer J Clin 2025 (PMC12593286), Fig. 2, CC BY
CAACC = "Chakrabarti D et al., CA Cancer J Clin 2025 (PMC12593286), Fig. 2%s, CC BY 4.0."
LIM = "Lim TJ et al., Korean J Urol 2012 (PMC3427835), Fig. 1%s, CC BY-NC; measurement marks not shown."
HAGG = "Häggström M, CT of a normal abdomen and pelvis (Wikimedia Commons), CC0."
HG = lambda n: ("hgf/%d.png" % n, None, None, None)

# =============== Anatomy: gland ===============
ZB = (50, 0, 420, 258)
plate("pr-zones", "pr-zones.jpg", [(JAM + "p3_50.png", ZB, (50, 4, 420, 258), None)], BL, [
    ("pz", "Peripheral Zone (PZ)", 0, 26.0, 60.0, None),
    ("tz", "Transition Zone (TZ)", 0, 45.0, 40.0, None),
    ("afms", "Anterior Fibromuscular Stroma", 0, 50.0, 20.0, None),
    ("urethra", "Prostatic Urethra", 0, 48.0, 52.0, None),
    ("capsule", "Prostatic 'Capsule'", 0, 75.5, 52.0, None),
    ("nvb-r", "Neurovascular Bundle", 0, 63.5, 84.0, None),
    ("rectum", "Rectum", 0, 46.0, 94.0, None)],
    "Axial T2 MRI of a normal prostate (anterior at top). The bright rim is the peripheral zone; the mottled center is the transition and central zones with BPH. " + JAMC % "Fig. 2A")
plate("pr-sagittal", "pr-sagittal.jpg", [("art/PMC3427835/p2_8.png", (0, 0, 605, 600), (0, 0, 605, 600), None)], BL, [
    ("bladder", "Bladder", 0, 45.0, 30.0, None),
    ("base", "Prostate Base", 0, 46.0, 46.0, None),
    ("apex", "Prostate Apex", 0, 50.0, 63.0, None),
    ("sv", "Seminal Vesicles", 0, 57.0, 38.0, None),
    ("denon", "Denonvilliers' Fascia", 0, 56.0, 54.0, None),
    ("rectum-s", "Rectum / Anterior Rectal Wall", 0, 62.0, 58.0, None),
    ("pubis", "Pubic Symphysis", 0, 27.0, 57.0, None),
    ("sphincter", "External Urethral Sphincter", 0, 52.0, 68.0, None),
    ("bulb", "Penile Bulb", 0, 53.0, 76.0, None)],
    "Midline sagittal T2 MRI of the male pelvis (anterior on the left). " + LIM % "A")
plate("pr-levels", "pr-levels.jpg", [("art/PMC3427835/p2_10.png", (0, 0, 605, 600), (0, 0, 605, 600), None)], BL, [
    ("c-base", "Base", 0, 50.0, 41.0, None),
    ("c-mid", "Mid-Gland", 0, 50.0, 52.0, None),
    ("c-apex", "Apex", 0, 50.0, 64.0, None),
    ("c-right", "Right Lobe", 0, 43.0, 50.0, None),
    ("c-left", "Left Lobe", 0, 58.0, 50.0, None),
    ("c-lev", "Levator Ani", 0, 34.0, 56.0, None)],
    "Coronal T2 MRI through the prostate, with the bladder on top and the penile bulb below the apex. Patient's right is on the image left. " + LIM % "B",
    "Base, Mid-Gland, Apex (Coronal MRI)")

# =============== Anatomy: TRUS ===============
TB = (90, 0, 560, 400)
plate("pr-trus-ax", "pr-trus-ax.jpg", [("ep/PMC4216863_bmjopen2014006382f04.jpg", TB, (90, 0, 560, 405), None)], BL, [
    ("probe", "Probe / Rectal Wall", 0, 50.0, 67.0, None),
    ("gland-edge", "Prostate Capsule (Edge)", 0, 34.0, 32.0, None),
    ("pz-us", "Peripheral Zone", 0, 45.0, 60.0, None),
    ("tz-us", "Transition Zone", 0, 50.0, 36.0, None),
    ("foley", "Urethra with Foley Catheter", 0, 51.0, 48.0, None),
    ("grid", "Template Grid Coordinates", 0, 51.0, 8.0, None),
    ("needle", "Needle / Seed Artifact", 0, 37.0, 57.0, "Bright echo of a needle tip. Each needle goes through a template hole, so its position on screen matches a grid letter and number."),
    ("nvb-us", "Neurovascular Bundle Area", 0, 66.0, 60.0, None)],
    "Transverse TRUS of the prostate with the brachytherapy template grid overlaid (letters across, depth in cm down the sides) and needles placed through the perineum. van den Bos W et al., BMJ Open 2014 (PMC4216863), Fig. 4, CC BY-NC 4.0.")
NG = "art/PMC13344289/p5_35.png"; NGB = (1045, 35, 2085, 550)
plate("pr-trus-sag", "pr-trus-sag.jpg", [(NG, NGB, NGB, None)], BL, [
    ("bladder-us", "Bladder", 0, *pct(NGB, 1150, 250), "Sits at the base end of the gland (left on this view). Outlined in light blue here. The Foley balloon at the bladder neck is the landmark for the base."),
    ("base-us", "Prostate Base", 0, *pct(NGB, 1390, 300), None),
    ("apex-us", "Prostate Apex", 0, *pct(NGB, 1760, 380), None),
    ("urethra-us", "Urethra", 0, *pct(NGB, 1600, 330), None),
    ("spacer-us", "Rectal Spacer (Hypoechoic)", 0, *pct(NGB, 1480, 510), "Dark gel injected between the prostate and the rectum. It pushes the rectal wall away from the high-dose region."),
    ("rect-us", "Rectum / Probe", 0, *pct(NGB, 1300, 527), None)],
    "Sagittal TRUS during HDR planning, base on the left and apex on the right: prostate (red), urethra (yellow), bladder (light blue), rectum (dark blue), with a hyaluronic acid spacer behind the gland. Ng SK et al., J Appl Clin Med Phys 2026 (PMC13344289), Fig. 3b, CC BY 4.0.")

# =============== Anatomy: nodes ===============
CR = "cs/Diagram_showing_the_pelvic_and_para-aortic_lymph_nodes_CRUK_339.svg.png"; CRB = (610, 30, 1920, 1682)
crop_lines = lambda im: inpaint_dark(im, [(600, 552, 1180, 574), (600, 1010, 1092, 1032)])
plate("pr-nodes-map", "pr-nodes-map.jpg", [(CR, CRB, CRB, crop_lines)], WH, [
    ("pa", "Para-aortic Nodes", 0, *pct(CRB, 1184, 563), None),
    ("ci", "Common Iliac Nodes", 0, *pct(CRB, 1098, 976), None),
    ("ext", "External Iliac Nodes", 0, *pct(CRB, 1054, 1098), None),
    ("int", "Internal Iliac (Hypogastric) Nodes", 0, *pct(CRB, 1108, 1176), None),
    ("ing", "Inguinal Nodes", 0, *pct(CRB, 1018, 1404), None),
    ("prostate-map", "Prostate", 0, *pct(CRB, 1264, 1212), None),
    ("bladder-map", "Bladder", 0, *pct(CRB, 1264, 1080), "Sits in front of the prostate. The pelvic nodal chains run along the vessels on either side of it.")],
    "Pelvic and para-aortic lymph nodes (green) along the aorta, IVC, and iliac vessels. Obturator and presacral nodes are shown on the axial CT levels. Cancer Research UK diagram (Wikimedia Commons), CC BY-SA 4.0; labels removed.")
HB = (60, 60, 460, 300)
plate("pr-nodes-ax-high", "pr-nodes-ax-high.jpg", [("hgf/180.png", HB, (20, 30, 500, 312), None)], BL, [
    ("h-ci-r", "Right Common Iliac Node", 0, 44.0, 37.0, None),
    ("h-ci-l", "Left Common Iliac Node", 0, 66.0, 42.0, None),
    ("h-presacral", "Presacral Nodes (S1)", 0, 53.0, 41.0, None),
    ("h-bowel", "Small Bowel", 0, 57.0, 27.0, None),
    ("h-psoas", "Psoas Muscle", 0, 38.0, 51.0, None)],
    "Contrast-enhanced axial CT at L5 in a healthy adult male, where the common iliac vessels sit in front of the spine. " + HAGG)
HM = (60, 60, 460, 312)
plate("pr-nodes-ax-mid", "pr-nodes-ax-mid.jpg", [("hgf/210.png", HM, (20, 30, 500, 312), None)], BL, [
    ("m-ext-r", "Right External Iliac Nodes", 0, 36.0, 37.0, None),
    ("m-int-r", "Right Internal Iliac Nodes", 0, 37.0, 57.0, None),
    ("m-ext-l", "Left External Iliac Nodes", 0, 71.0, 42.0, None),
    ("m-int-l", "Left Internal Iliac Nodes", 0, 67.0, 56.0, None),
    ("m-presacral", "Presacral Nodes (S2-S3)", 0, 52.0, 76.0, None),
    ("m-bowel", "Sigmoid / Bowel", 0, 49.0, 36.0, None)],
    "Contrast-enhanced axial CT through the upper sacrum in a healthy adult male: external iliac vessels in front, internal iliac vessels along the sidewall. " + HAGG)
plate("pr-nodes-ax-low", "pr-nodes-ax-low.jpg", [("hgf/250.png", HM, (20, 30, 500, 312), None)], BL, [
    ("l-obt-r", "Right Obturator Nodes", 0, 36.0, 50.0, None),
    ("l-obt-l", "Left Obturator Nodes", 0, 70.0, 52.0, None),
    ("l-ext", "Distal External Iliac", 0, 32.0, 21.0, None),
    ("l-bladder", "Bladder", 0, 50.0, 45.0, None),
    ("l-rectum", "Rectum", 0, 55.0, 83.0, None),
    ("l-fem", "Femoral Head", 0, 22.0, 47.0, None)],
    "Contrast-enhanced axial CT at the femoral heads in a healthy adult male, with the full bladder in the middle of the pelvis. " + HAGG,
    "Axial CT: Femoral Heads (Obturator Level)")

# =============== Imaging: MRI ===============
# Jambor Fig. 16 (same patient and slice): T2 panel x0-416 y0-278, ADC x418-836, DWI b1500 x0-416 y280-563
T2B = (0, 0, 416, 278)
plate("pr-mri-t2", "pr-mri-t2.jpg", [(JAM + "p11_139.png", T2B, (70, 45, 350, 278), None)], BL, [
    ("t2-pz", "Normal Peripheral Zone (Bright)", 0, *pct(T2B, 230, 150), None),
    ("t2-lesion", "Dark PZ Lesion", 0, *pct(T2B, 171, 172), None),
    ("t2-tz", "Transition Zone (BPH Nodules)", 0, *pct(T2B, 205, 120), None),
    ("t2-capsule", "Capsule / Bulge", 0, *pct(T2B, 152, 168), "On prostatectomy this tumor had extracapsular extension on the right. Bulging or irregular capsule, broad tumor contact (>1.5 cm), or a lost rectoprostatic angle suggests extraprostatic extension (T3a)."),
    ("t2-nvb", "Neurovascular Bundle", 0, *pct(T2B, 160, 195), None),
    ("t2-rectum", "Rectum", 0, *pct(T2B, 200, 215), None)],
    "Axial T2 MRI of a Gleason 4+3 cancer in the right peripheral zone (image left), dark against the bright normal PZ. " + JAMC % "Fig. 16")
ADB = (418, 0, 836, 278); DWB = (0, 280, 416, 563)
plate("pr-mri-dwi", "pr-mri-dwi.jpg", [(JAM + "p11_139.png", ADB, (488, 45, 768, 278), None), (JAM + "p11_139.png", DWB, (70, 330, 350, 563), None)], BL, [
    ("adc-lesion", "Restricted Diffusion (Dark on ADC)", 0, *pct(ADB, 589, 172), None),
    ("adc-normal", "Normal PZ (Bright on ADC)", 0, *pct(ADB, 648, 150), None),
    ("dwi-bright", "Bright on High b-Value DWI", 1, *pct(DWB, 171, 456), "The same tumor on b1500 DWI. Bright on high b-value plus dark on ADC = true restricted diffusion. The dominant PI-RADS sequence in the PZ."),
    ("adc-tz", "Transition Zone", 0, *pct(ADB, 623, 120), None)],
    "Same slice as the T2 image: ADC map (left) and b1500 DWI (right). The right PZ tumor is dark on ADC and bright on DWI. " + JAMC % "Fig. 16")
CB = (1040, 0, 1545, 485); DB = (1552, 0, 2060, 485)
plate("pr-mri-sag", "pr-mri-sag.jpg", [(CAAC, CB, (1040, 40, 1500, 485), None), (CAAC, DB, (1552, 48, 2000, 485), None)], BL, [
    ("sag-sv", "Normal Seminal Vesicle (Bright)", 1, 37.0, 42.0, None),
    ("sag-svi", "Seminal Vesicle Invasion (Dark)", 1, 46.0, 43.0, None),
    ("sag-base", "Prostate Base", 1, 50.0, 56.0, None),
    ("sag-apex", "Apex", 1, 50.0, 82.0, None),
    ("sag-bladder", "Bladder", 0, 53.0, 30.0, None),
    ("sag-rectum", "Rectum", 0, 50.0, 70.0, None)],
    "Seminal vesicle invasion (T3b) on axial (left) and coronal (right) T2 MRI: dark tumor replaces the normally bright seminal vesicle tubules. " + CAACC % "C-D",
    "MRI: Seminal Vesicle Invasion (Axial & Coronal T2)")

# =============== Imaging: CT ===============
IC = "art/icht/p3_56.png"; ICB = (0, 0, 520, 480)
plate("pr-ct-sim", "pr-ct-sim.jpg", [(IC, ICB, (22, 0, 495, 470), lambda im: inpaint(im, [(5, 5, 55, 60)]))], BL, [
    ("sim-prostate", "Prostate (CTV)", 0, *pct(ICB, 262, 170), None),
    ("sim-fid", "Gold Fiducial Marker", 0, *pct(ICB, 198, 242), None),
    ("sim-spacer", "Hydrogel Spacer", 0, *pct(ICB, 240, 290), None),
    ("sim-rectum", "Rectum", 0, *pct(ICB, 245, 385), None),
    ("sim-pubis", "Pubic Symphysis", 0, *pct(ICB, 205, 25), "Anterior bony landmark. The prostate sits just behind and below it.")],
    "Planning CT with a gold fiducial (green) in the prostate (red) and a hydrogel spacer (pink) pushing the rectum (brown) back. Icht O et al., Front Oncol 2024 (PMC11217322), Fig. 1A, CC BY 4.0.")
SB = (0, 0, 1182, 757)
plate("pr-ct-postop", "pr-ct-postop.jpg", [("art/PMC7874055/p4_72.png", SB, (200, 100, 1000, 700), None)], BL, [
    ("bed", "Prostate Bed (Fossa)", 0, *pct(SB, 565, 451), None),
    ("clips", "Surgical Clip", 0, *pct(SB, 545, 339), None),
    ("pb-bladder", "Bladder", 0, *pct(SB, 635, 353), None),
    ("pb-rectum", "Rectum", 0, *pct(SB, 645, 514), None),
    ("pb-recur", "Local Recurrence (Boost Target)", 0, *pct(SB, 694, 412), "A nodule in the fossa seen on MRI, contoured as a GTV (green) for a boost on top of the prostate bed dose.")],
    "Salvage RT planning CT after prostatectomy: prostate bed CTV (red), PTV (dark blue), bladder (yellow), rectum (orange), and a local recurrence boost target (green). Sardaro A et al., Front Oncol 2021 (PMC7874055), Fig. 1B, CC BY 4.0.")

# =============== Imaging: PSMA + bone scan ===============
ES = "art/PMC13359636/p7_258.png"; ESB = (1150, 30, 1560, 760)
WA = "art/PMC13175320/p8_587.png"; WAB = (8, 50, 592, 950)
plate("pr-psma-mip", "pr-psma-mip.jpg", [(ES, ESB, ESB, None), (WA, WAB, (20, 64, 592, 950), None)], WH, [
    ("psma-node", "Pelvic Node (N1)", 0, *pct(ESB, 1395, 640), None),
    ("psma-ci", "Para-aortic Nodes (M1a)", 0, *pct(ESB, 1385, 520), None),
    ("psma-sc", "Supraclavicular / Mediastinal Nodes (M1a)", 0, *pct(ESB, 1398, 270), "Avid nodes above the diaphragm. Any node outside the true pelvis is M1a."),
    ("psma-bone", "Bone Metastasis (M1b)", 1, *pct(WAB, 230, 745), None),
    ("psma-salivary", "Salivary / Lacrimal Glands (Physiologic)", 1, *pct(WAB, 272, 160), None),
    ("psma-kidney", "Kidneys (Physiologic)", 0, *pct(ESB, 1336, 472), None),
    ("psma-bladder", "Bladder (Excreted Tracer)", 0, *pct(ESB, 1383, 700), None)],
    "PSMA PET maximum intensity projections. Left: 68Ga-PSMA-11 in high-risk disease showing avid nodes from the pelvis to the mediastinum (M1a) despite a negative CT and bone scan. Esperto F et al., Cancers 2026 (PMC13359636), Fig. 2B, CC BY 4.0. Right: 18F-PSMA-1007 with bone-only recurrence after prostatectomy. Wang Y et al., PLoS One 2026 (PMC13175320), Fig. 1A, CC BY 4.0.")
WD = "art/PMC13175320/p8_588.png"; WDB = (752, 735, 1282, 1046)
plate("pr-psma-bcr", "pr-psma-bcr.jpg", [(WD, WDB, WDB, None)], BL, [
    ("bcr-fossa", "Fossa Recurrence", 0, *pct(WDB, 1037, 885), None),
    ("bcr-bone", "Pubic Bone Metastases", 0, *pct(WDB, 1046, 815), None),
    ("bcr-isch", "Ischial Bone Metastasis", 0, *pct(WDB, 891, 898), "A second bone lesion in the right ischium. More than a few bone lesions means this is no longer a salvage-RT-alone situation."),
    ("bcr-rectum", "Rectum", 0, *pct(WDB, 1017, 940), "Directly behind the fossa. Rectal dose limits how hard you can push a fossa boost.")],
    "Fused axial PSMA PET/CT 40 months after prostatectomy (PSA 8.7): recurrence in the prostate bed plus bone metastases in the pubic bones and right ischium. Wang Y et al., PLoS One 2026 (PMC13175320), Fig. 2D, CC BY 4.0.")
QB = (0, 0, 1010, 1316)
plate("pr-bone-scan", "pr-bone-scan.jpg", [("art/PMC5314659/p1_102.png", QB, QB, None)], WH, [
    ("bs-spine", "Vertebral Metastasis", 0, *pct(QB, 497, 428), None),
    ("bs-pelvis", "Pelvic Metastasis", 0, *pct(QB, 546, 579), None),
    ("bs-rib", "Rib Lesion", 0, *pct(QB, 574, 401), None),
    ("bs-super", "Superscan (Diffuse Uptake)", 0, *pct(QB, 829, 329), "Diffuse, intense uptake through the axial skeleton. Looks deceptively 'clean' because there are no discrete spots."),
    ("bs-kidneys", "Kidneys (Faint = Superscan)", 0, *pct(QB, 855, 513), None),
    ("bs-bladder", "Bladder", 0, *pct(QB, 193, 575), None),
    ("bs-arthritis", "Degenerative Joint Uptake", 0, *pct(QB, 145, 895), None)],
    "Whole-body Tc-99m bone scans: normal (left), multiple metastases (middle), and a superscan (right). Qureshi AM et al., World J Nucl Med 2017 (PMC5314659), Fig. 1, CC BY-NC-SA.",
    "Bone Scan: Normal, Metastases, Superscan")

# =============== Gallery ===============
gallery_img("pr-g-zonal.jpg", "ep/PMC12248846_cancers-17-02137-g001.jpg")
gallery_img("pr-g-plan-ct.jpg", "art/PMC3083385/p2_44.png")
gallery_img("pr-g-postimplant.jpg", "ep/PMC13054528_roj-2025-00619f1.jpg", (252, 0, 500, 263))
gallery_img("pr-g-template.jpg", "cs/Diagram_showing_how_you_have_radioactive_seed_implants_as_a_treatment_for_prostate_cancer_CRUK_420.svg.png")
gallery_img("pr-g-psma-node.jpg", CAAC, (0, 975, 505, 1385))
gallery_img("pr-g-nodal-ctv.jpg", "art/PMC5543558/p2_37.png", (0, 0, 897, 642))
G = {
 ("anat-pr-gland", 0): ("pr-g-zonal.jpg", "T2 MRI: zonal anatomy", "Axial T2 MRI with the zones mapped: anterior stroma (AS), anterior and posterior transition zone (TZa, TZp), and peripheral zone sectors (PZa, PZpl, PZpm). Kania E et al., Cancers 2025 (PMC12248846), Fig. 1, CC BY 4.0."),
 ("anat-pr-gland", 1): ("pr-g-plan-ct.jpg", "Planning CT: prostate and OARs", "Axial and sagittal planning CT for prostate SBRT: target (red, dark blue), bladder (orange), rectum (green), bowel (yellow), membranous urethra (pink), penile bulb (light blue). Oermann EK et al., J Hematol Oncol 2011 (PMC3083385), Fig. 1, CC BY."),
 ("anat-pr-trus", 0): ("pr-g-postimplant.jpg", "Post-implant CT", "Day 0 CT after LDR seed implant: seeds are the bright dots, with the prostate and dose lines contoured for post-implant dosimetry. Choi H et al., Radiat Oncol J 2026 (PMC13054528), Fig. 1B, CC BY-NC 4.0."),
 ("anat-pr-trus", 1): ("pr-g-template.jpg", "Perineal template", "Seed implant setup: the TRUS probe in the rectum images the gland while needles pass through the perineal template and release seeds into the prostate. Cancer Research UK diagram (Wikimedia Commons), CC BY-SA 4.0."),
 ("anat-pr-nodes", 0): ("pr-g-psma-node.jpg", "PSMA PET: pelvic nodes", "Fused PSMA PET/CT showing avid bilateral pelvic side-wall nodes (N1). " + CAACC % "I"),
 ("anat-pr-nodes", 1): ("pr-g-nodal-ctv.jpg", "Elective pelvic nodal CTV", "Pelvic lymph node CTV drawn around the iliac vessels on axial planning CT (red: planning CT contour; cyan: contours from five daily cone-beam CTs; blue: their composite). Lyons CA et al., Radiat Oncol 2017 (PMC5543558), Fig. 1a, CC BY 4.0."),
}

if __name__ == "__main__":
    json.dump({k: dict(image=v[0], caption=v[1], title=v[2], hs=v[3]) for k, v in P.items()}, open(W + "prostate_plates.json", "w"), indent=1)
    json.dump({"%s|%d" % k: v for k, v in G.items()}, open(W + "prostate_gallery.json", "w"), indent=1)
    print("built", len(P), "plates,", len(G), "gallery images")
