"""gi_fill.py WORKDIR : build the GI plate/gallery images from downloaded open-license sources
and write them (with hotspots + attribution captions) into src/data/{anatomy,imaging}/gi.json.
WORKDIR holds the downloaded sources (Commons files in cs/, Häggström CT slices in hgf/,
Europe PMC figures in ep/ and art/). Needs Pillow + opencv. Previews with numbered dots go to WORKDIR/prev/."""
import sys, os, json, glob, cv2, numpy as np
from PIL import Image
W = sys.argv[1].rstrip("/") + "/"
R = "/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"
OUT = R + "src/images/gi/"; os.makedirs(OUT, exist_ok=True); os.makedirs(W + "prev", exist_ok=True)
BL, WH = (0, 0, 0), (255, 255, 255)

def load(p):
    im = Image.open(W + p if not p.startswith("/") else p)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGB", im.size, WH); bg.paste(im, mask=im.split()[3]); im = bg
    return cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2BGR)

def fill(im, rects, col=BL):
    for (x0, y0, x1, y1) in rects: im[y0:y1, x0:x1] = col
    return im

def inpaint_red(im, rects):
    """paint out red annotation pixels inside rects"""
    b, g, r = [im[:, :, i].astype(int) for i in range(3)]
    red = ((r > 120) & (r - g > 60) & (r - b > 60)).astype(np.uint8) * 255
    m = np.zeros(im.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in rects: m[y0:y1, x0:x1] = red[y0:y1, x0:x1]
    return cv2.inpaint(im, cv2.dilate(m, np.ones((5, 5), np.uint8)), 4, cv2.INPAINT_TELEA)

def inpaint(im, rects):
    m = np.zeros(im.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in rects: m[y0:y1, x0:x1] = 255
    return cv2.inpaint(im, m, 5, cv2.INPAINT_TELEA)

# A panel: (src, grid frame (x0,y0,x1,y1) or None = whole image, crop in source px or None = grid frame, ops)
# Hotspot: (id, label, panel_index, x%, y% of that panel's grid frame, blurb or None to keep the old blurb)
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
    # pad to 4:3
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
    elif Ww < 700: can = cv2.resize(can, (round(Ww * 700 / Ww), round(Hh * 700 / Ww)), interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(OUT + name, can, [cv2.IMWRITE_JPEG_QUALITY, 86])
    pv = can.copy(); hh, ww = pv.shape[:2]
    for i, h_ in enumerate(out):
        c = (int(h_["x"] * ww / 100), int(h_["y"] * hh / 100))
        cv2.circle(pv, c, 9, (0, 0, 255), 2); cv2.putText(pv, str(i + 1), (c[0] + 10, c[1] + 5), 0, 0.6, (0, 255, 255), 2)
    cv2.imwrite(W + "prev/" + name, pv)
    return out

def gallery_img(name, src, crop=None, ops=None, maxw=1000):
    im = load(src)
    if ops: im = ops(im)
    if crop: im = im[crop[1]:crop[3], crop[0]:crop[2]]
    h, w = im.shape[:2]
    if w > maxw: im = cv2.resize(im, (maxw, round(h * maxw / w)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(OUT + name, im, [cv2.IMWRITE_JPEG_QUALITY, 86])

HG = lambda n: ("hgf/%d.png" % n, (0, 0, 520, 346), (0, 0, 520, 312), None)  # Häggström slice, scout/ruler cropped off
EP = lambda f: "ep/" + f
BOG = lambda n: "art/bog/PMC9849549_13244_2022_1348_Fig%d_HTML.jpg" % n
HAGG = "Häggström M, CT of a normal abdomen and pelvis (Wikimedia Commons), CC0."
CRUK = "Cancer Research UK diagram (Wikimedia Commons), CC BY-SA 4.0; labels removed."

P = {}  # plate id -> (image name, caption, title or None, hotspots)
def plate(pid, name, panels, color, hs, caption, title=None, rows=None):
    P[pid] = (name, caption, title, build(name, panels, color, hs, rows=rows))

# ---------------- Anatomy: organs ----------------
plate("gi-esoph", "gi-esoph.jpg", [("cs/clean_479.svg.png", None, (350, 280, 1050, 1290), None)], WH, [
    ("cric", "Cricopharyngeus (~15 cm)", 0, 39.5, 28.3, None),
    ("upper-t", "Upper Thoracic (20–25 cm)", 0, 37.4, 37.5, None),
    ("carina-e", "Carina Level (~25 cm)", 0, 37.4, 42.0, None),
    ("mid-t", "Middle Thoracic (25–30 cm)", 0, 37.4, 48.5, None),
    ("lower-t", "Lower Thoracic (30–40 cm)", 0, 38.0, 58.5, None),
    ("diaphragm-e", "Diaphragmatic Hiatus", 0, 37.6, 63.2, None),
    ("gej", "Gastroesophageal Junction (~40 cm)", 0, 40.2, 66.8, None)],
    "The esophagus from the cricopharyngeus to the stomach. The pale bands mark the upper, middle, and lower thirds. " + CRUK)
plate("gi-stomach", "gi-stomach.jpg", [("cs/clean_336.svg.png", None, (280, 30, 1200, 1200), None)], WH, [
    ("cardia", "Cardia", 0, 57.5, 27.0, None), ("fundus", "Fundus", 0, 67.0, 18.5, None),
    ("body", "Body", 0, 69.0, 40.0, None), ("antrum", "Antrum", 0, 44.0, 56.5, None),
    ("pylorus", "Pylorus", 0, 34.0, 51.5, None), ("lesser", "Lesser Curvature", 0, 51.5, 40.0, None),
    ("greater", "Greater Curvature", 0, 80.3, 44.0, None)],
    "The stomach and first part of the duodenum, front view. " + CRUK)
plate("gi-pancreas", "gi-pancreas.jpg", [("cs/Gray1099.png", None, None, None)], WH, [
    ("head", "Pancreatic Head", 0, 71.0, 55.0, None), ("uncinate", "Uncinate Process", 0, 58.0, 64.0, None),
    ("neck", "Neck", 0, 54.0, 42.0, None), ("body-p", "Body", 0, 35.0, 45.0, None), ("tail", "Tail", 0, 12.0, 42.0, None),
    ("sma", "Superior Mesenteric Artery (SMA)", 0, 61.3, 44.0, None), ("smv", "SMV / Portal Vein", 0, 66.0, 22.5, None),
    ("celiac", "Celiac Axis", 0, 58.5, 20.0, None), ("cbd", "Common Bile Duct", 0, 74.5, 36.0, None),
    ("duodenum", "Duodenum (C-loop)", 0, 62.0, 82.0, None)],
    "The pancreas and duodenum seen from BEHIND, so the head sits on the right of the picture and the tail on the left. Gray H, Anatomy of the Human Body (1918), Fig. 1099 (Wikimedia Commons), public domain.",
    "Pancreas & Its Vessels (Posterior View)")
plate("gi-liver", "gi-liver.jpg", [("cs/clean_376.svg.png", None, (100, 330, 1360, 1260), None)], WH, [
    ("right-lobe", "Right Lobe (Segments V–VIII)", 0, 20.0, 55.0, None), ("left-lobe", "Left Lobe (Segments II–IV)", 0, 80.0, 44.0, None),
    ("pv", "Portal Vein", 0, 45.8, 80.0, None), ("hv", "Hepatic Veins / IVC", 0, 57.0, 25.0, None),
    ("gb", "Gallbladder", 0, 32.0, 81.0, None), ("dome", "Liver Dome", 0, 38.0, 27.5, None),
    ("ha", "Hepatic Artery", 0, 49.5, 78.0, "Runs beside the portal vein. HCC gets most of its blood supply from the hepatic artery, which is why it lights up in the arterial phase and why TACE works."),
    ("cbd-l", "Common Bile Duct", 0, 38.0, 86.0, "Drains bile from the liver and gallbladder down to the duodenum. Central liver tumors near the hilum risk biliary stricture after SBRT.")],
    "The liver's right and left lobes with the portal vein (dark blue), hepatic artery (red), hepatic veins (light blue), and bile ducts (green). The caudate lobe (segment I) is not visible from this angle; see the Couinaud model below. " + CRUK,
    "Liver: Lobes & Vessels")
plate("gi-rectum", "gi-rectum.jpg", [(BOG(8), (0, 0, 400, 407), None, None), (BOG(4), None, (400, 0, 797, 425), None)], WH, [
    ("upper-r", "Upper Rectum (10–15 cm)", 0, 50.0, 25.0, None), ("pr", "Anterior Peritoneal Reflection", 0, 40.5, 47.0, None),
    ("mid-r", "Mid Rectum (5–10 cm)", 0, 53.0, 46.0, None), ("low-r", "Low Rectum (0–5 cm)", 0, 48.0, 62.0, None),
    ("mesorectum", "Mesorectum", 0, 61.0, 36.0, None), ("mrf", "Mesorectal Fascia (MRF)", 0, 66.5, 30.0, None),
    ("arj", "Anorectal Ring / Puborectalis", 1, 58.5, 57.0, None), ("dentate", "Dentate Line", 1, 70.0, 69.0, None),
    ("sphincters", "Internal & External Sphincters", 1, 59.0, 76.0, None), ("verge", "Anal Verge", 1, 70.5, 86.0, None)],
    "Left: sagittal drawing of the rectum with the mesorectal fascia (thick line), peritoneum (double line), and the high/mid/low levels. Right: coronal drawing of the anal canal. Bogveradze N et al., Insights Imaging 2023 (PMC9849549), Figs. 8 and 4, CC BY 4.0.",
    "Rectum & Anal Canal")

# ---------------- Anatomy: axial levels ----------------
TH = R + "src/images/thoracic/"
plate("ax-arch", "gi-ax-arch.jpg", [(TH + "th-ct-arch.jpg", None, None, None)], BL, [
    ("e1-esoph", "Esophagus", 0, 50.5, 55.0, None), ("e1-trachea", "Trachea", 0, 48.0, 47.0, None),
    ("e1-arch", "Aortic Arch", 0, 55.5, 42.0, None), ("e1-cord", "Spinal Cord", 0, 51.0, 71.5, None),
    ("e1-lungs", "Lungs", 0, 27.0, 45.0, None)],
    "Contrast-enhanced axial CT at the aortic arch. Hashmi R, Sectional Anatomy Quiz II, Asia Ocean J Nucl Med Biol (PMC5765337), CC BY 3.0; letter labels removed.")
plate("ax-heart", "gi-ax-heart.jpg", [(TH + "th-ct-heart.jpg", None, None, None)], BL, [
    ("e2-esoph", "Mid Esophagus", 0, 47.8, 54.5, None), ("e2-la", "Left Atrium", 0, 49.0, 43.5, None),
    ("e2-aorta", "Descending Aorta", 0, 52.5, 59.5, None), ("e2-azygos", "Azygos Vein", 0, 45.5, 60.5, None),
    ("e2-subcar", "Subcarinal Nodes", 0, 46.0, 50.0, None)],
    "Contrast-enhanced axial CT through the left atrium, where the esophagus lies right behind it. Hashmi R, Sectional Anatomy Quiz IV, Asia Ocean J Nucl Med Biol (PMC6661304), CC BY 3.0; letter labels removed.")
plate("ax-gej", "gi-ax-gej.jpg", [HG(73)], BL, [
    ("e3-gej", "GEJ / Cardia", 0, 61.0, 33.0, None), ("e3-liver", "Liver", 0, 28.0, 40.0, None),
    ("e3-spleen", "Spleen", 0, 80.0, 47.0, None), ("e3-crus", "Diaphragmatic Crura", 0, 47.5, 46.0, None),
    ("e3-celiac", "Celiac Axis / Nodes", 0, 53.0, 33.5, None), ("e3-aorta", "Aorta", 0, 54.0, 42.0, None)],
    "Contrast-enhanced axial CT at the gastroesophageal junction in a healthy adult. " + HAGG)
plate("ax-pancreas", "gi-ax-pancreas.jpg", [HG(109)], BL, [
    ("e4-head", "Pancreatic Head", 0, 45.0, 29.0, None), ("e4-sma", "SMA", 0, 55.0, 30.5, None),
    ("e4-smv", "SMV", 0, 51.0, 26.5, None), ("e4-duod", "Duodenum", 0, 40.0, 33.0, None),
    ("e4-kidneys", "Kidneys", 0, 34.0, 55.0, None), ("e4-bowel", "Stomach / Bowel", 0, 68.0, 30.0, None),
    ("e4-aorta", "Aorta", 0, 54.0, 38.5, "The SMA leaves the front of the aorta about 1 cm below the celiac axis and runs down behind the pancreatic neck.")],
    "Contrast-enhanced axial CT through the pancreatic head in a healthy adult. " + HAGG)
PIK = EP("PMC10493462_cureus-0015-00000045002-i01.jpg")
plate("ax-rectum", "gi-ax-rectum.jpg", [(PIK, (0, 0, 375, 250), (10, 10, 372, 248), lambda im: inpaint_red(im, [(225, 170, 290, 210), (15, 210, 45, 240)]))], BL, [
    ("e5-tumor", "Rectal Tumor", 0, 53.0, 83.0, None), ("e5-meso", "Mesorectal Fat", 0, 40.0, 79.0, None),
    ("e5-mrf", "Mesorectal Fascia (Involved)", 0, 64.0, 77.0, None), ("e5-ant", "Anterior Organs (Seminal Vesicles / Vagina)", 0, 52.0, 63.0, None),
    ("e5-bladder", "Bladder", 0, 52.0, 40.0, "Bright on T2 because it is full of urine. Anterior to the seminal vesicles in men.")],
    "Axial T2 MRI of a T3 mid-rectal cancer reaching the left mesorectal fascia (a threatened margin). Pikūnienė I et al., Cureus 2023 (PMC10493462), Fig. 1a, CC BY 4.0; arrow removed.",
    "Level 5: Mid Rectum (Pelvis, MRI)")
plate("ax-anus", "gi-ax-anus.jpg", [HG(267)], BL, [
    ("e6-anal", "Anal Canal", 0, 52.0, 63.0, None), ("e6-sphinct", "Sphincter Complex", 0, 52.0, 68.5, None),
    ("e6-ischio", "Ischioanal Fossa", 0, 44.5, 64.0, None), ("e6-ing", "Inguinal Nodes / Femoral Vessels", 0, 31.5, 33.0, None),
    ("e6-fh", "Femoral Heads", 0, 26.0, 56.0, None), ("e6-genital", "External Genitalia", 0, 52.0, 22.0, None)],
    "Contrast-enhanced axial CT at the top of the anal canal in a healthy adult male. " + HAGG)

# ---------------- Anatomy: nodes ----------------
LI = EP("PMC9743047_fonc-12-913960-g001.jpg")
plate("gi-nodes-esoph", "gi-nodes-esoph.jpg", [(LI, (0, 0, 350, 688), (0, 0, 340, 688), lambda im: fill(im, [(292, 0, 350, 195)], WH))], WH, [
    ("n-scv", "Supraclavicular Nodes (104)", 0, 24.9, 13.1, None), ("n-paratr", "Paratracheal Nodes (106rec)", 0, 28.0, 17.5, None),
    ("n-subcar", "Subcarinal Nodes (107)", 0, 42.0, 32.0, None), ("n-paraesoph", "Paraesophageal Nodes (108 / 110)", 0, 34.0, 39.5, None),
    ("n-leftgastric", "Left Gastric Nodes (7)", 0, 42.0, 72.0, None), ("n-celiac", "Celiac Nodes (9)", 0, 33.0, 73.5, None),
    ("n-perigastric", "Perigastric Nodes (1–6)", 0, 47.0, 77.5, None)],
    "Japanese Esophageal Society node stations along the esophagus and stomach (numbers are the JES/JGCA station names; colors show nodal grouping for GEJ cancers in the source, legend removed). Liang R et al., Front Oncol 2022 (PMC9743047), Fig. 1A, CC BY 4.0.")
CHO = EP("PMC9748447_jksr-83-1240-g022.jpg")
plate("gi-nodes-pancreas", "gi-nodes-pancreas.jpg", [(CHO, (0, 0, 793, 400), (5, 25, 785, 395), None)], WH, [
    ("np-peri", "Peripancreatic (Pancreaticoduodenal) Nodes", 0, 36.5, 70.0, None), ("np-hep", "Hepatic Artery Nodes", 0, 29.0, 38.0, None),
    ("np-celiac", "Celiac Nodes", 0, 41.5, 30.0, None), ("np-sma", "SMA Nodes", 0, 42.5, 48.0, None),
    ("np-pa", "Para-aortic Nodes", 0, 43.5, 84.0, None), ("np-splenic", "Splenic Hilar Nodes", 0, 77.0, 25.0, None)],
    "Schematic of the pancreatic node groups around the celiac axis, SMA, and splenic artery. Cho HS, Ahn JH, J Korean Soc Radiol 2022 (PMC9748447), Fig. 22A, CC BY-NC 4.0.")
plate("gi-nodes-pelvis", "gi-nodes-pelvis.jpg", [(BOG(12), None, None, None)], WH, [
    ("nr-meso", "Mesorectal Nodes (Mes)", 0, 19.5, 82.0, None), ("nr-sup", "Superior Rectal / IMA Nodes", 0, 27.5, 9.0, None),
    ("nr-ii", "Internal Iliac Nodes (II)", 0, 65.0, 73.0, None), ("nr-obt", "Obturator Nodes (O)", 0, 66.0, 25.0, None),
    ("nr-presac", "Presacral Nodes", 0, 73.0, 91.5, None), ("nr-ei", "External Iliac Nodes (EI)", 0, 10.5, 64.5, None)],
    "Rectal cancer node stations drawn on a 3D reconstruction (a) and axial T2 MRI at three levels (b to d): mesorectal (orange), obturator (green), internal iliac (yellow), external iliac (blue). Inguinal nodes sit below this field (see the anal canal level above). Bogveradze N et al., Insights Imaging 2023 (PMC9849549), Fig. 12, CC BY 4.0.")

# ---------------- Imaging ----------------
plate("rmri-ax", "gi-rmri-ax.jpg", [(BOG(1), None, (0, 0, 396, 264), None), (BOG(1), None, (401, 0, 797, 264), None)], BL, [
    ("r-tumor", "Tumor (Intermediate T2)", 0, 21.0, 50.0, None),
    ("r-fat", "Extramural Spread into Mesorectal Fat", 0, 29.5, 33.0, None),
    ("r-mrf", "Mesorectal Fascia", 0, 36.5, 55.0, None),
    ("r-mrfplus", "Tumor Reaching the MRF (MRF+)", 1, 75.0, 79.0, "Tumor within 1 mm of the mesorectal fascia means a threatened margin: this pushes the patient toward TNT and makes a negative TME margin harder.")],
    "Axial T2 MRI of two rectal cancers, with the mesorectal fascia traced as a dotted line. (a) T3ab tumor with short extramural spread (arrows), MRF clear. (b) T3cd tumor reaching the MRF (arrowheads). Bogveradze N et al., Insights Imaging 2023 (PMC9849549), Fig. 1, CC BY 4.0.", rows=[[0], [1]])
CUR = EP("PMC11394290_cancers-16-03111-g002.jpg")
plate("rmri-emvi", "gi-rmri-emvi.jpg", [(CUR, None, None, None)], BL, [
    ("r-emvi", "EMVI (Tumor in a Vein)", 0, 55.5, 58.5, None),
    ("r-emvi-cor", "EMVI (Coronal View)", 0, 22.0, 42.0, "On the coronal image the tumor signal grows along an enlarged mesorectal vein that stays attached to the primary."),
    ("r-td", "Tumor Deposit", 0, 82.0, 21.0, "Irregular tumor nodule that follows the course of a vein but is separate from the primary. Counted as N1c and a high-risk feature."),
    ("r-node", "Suspicious Mesorectal Node", 0, 72.5, 19.0, None)],
    "T2 MRI of a low rectal cancer in three planes: (A) coronal and (B) axial EMVI (red arrows), (C) tumor deposits (green) versus a malignant node (blue). Curcean S et al., Cancers 2024 (PMC11394290), Fig. 2, CC BY 4.0.",
    "Rectal MRI: EMVI, Tumor Deposits, and Nodes")
NAT = EP("PMC11989207_diagnostics-15-00913-g003.jpg")
plate("rmri-sag", "gi-rmri-sag.jpg", [(NAT, (0, 0, 372, 575), (8, 8, 372, 575), lambda im: inpaint(im, [(12, 525, 45, 560)]))], BL, [
    ("s-lower", "Lower Tumor Edge", 0, 69.0, 39.5, None), ("s-arj", "Anorectal Junction", 0, 57.0, 78.0, None),
    ("s-pr", "Peritoneal Reflection", 0, 44.0, 38.5, None), ("s-prost", "Prostate / Seminal Vesicles (or Vagina)", 0, 24.0, 60.0, None),
    ("s-sacrum", "Sacrum / Presacral Space", 0, 91.0, 32.0, None)],
    "Sagittal T2 MRI of a high rectal cancer (m, bracket) 10 cm from the anal verge (*), touching the anterior peritoneal reflection (red arrowhead). Natout M et al., Diagnostics 2025 (PMC11989207), Fig. 3a, CC BY 4.0.")
plate("pct", "gi-pct.jpg", [(EP("PMC11981547_cureus-0017-00000080356-i02.jpg"), None, None, None)], BL, [
    ("p-mass", "Hypoenhancing Head Mass", 0, 41.0, 41.5, None), ("p-smv", "SMV Contact", 0, 46.0, 37.5, None),
    ("p-sma", "SMA with Fat Collar", 0, 49.3, 43.5, None), ("p-cbd", "CBD Stent", 0, 38.0, 48.0, None),
    ("p-aorta", "Aorta", 0, 52.5, 55.0, "The SMA arises from the front of the aorta; follow it forward to judge arterial contact.")],
    "Portal venous phase CT of a hypoenhancing pancreatic head mass (red arrow) abutting, but not deforming, the SMV. A stent is in the common bile duct. Louis M et al., Cureus 2025 (PMC11981547), Fig. 2, CC BY 4.0.")
plate("eus", "gi-eus.jpg", [(EP("PMC11473974_jksr-85-883-g002.jpg"), None, None, None)], WH, [
    ("eus-muc", "Mucosa (Layers 1–4)", 0, 88.0, 25.5, None), ("eus-sub", "Submucosa (Layer 5, Bright)", 0, 88.0, 19.5, None),
    ("eus-mp", "Muscularis Propria (Layers 6–8)", 0, 88.0, 13.5, None), ("eus-adv", "Adventitia (Layer 9)", 0, 88.0, 8.0, None)],
    "High-frequency EUS of a normal esophageal wall (left, red box) with a schematic of its nine echo layers (right). Standard EUS shows these as five layers. Yun SM et al., J Korean Soc Radiol 2024 (PMC11473974), Fig. 2, CC BY-NC 4.0.",
    "EUS: Esophageal Wall Layers")
plate("epet", "gi-epet.jpg", [(EP("PMC12702577_scr-11-01-25-0603-g001.jpg"), None, None, None)], BL, [
    ("ep-primary", "Mid-Esophageal Primary", 0, 24.5, 26.0, None),
    ("ep-pet", "Primary on PET", 0, 77.5, 23.5, "The FDG-avid primary. PET/CT defines the length of the tumor for the GTV and screens for distant disease."),
    ("ep-node", "Lesser Curvature (Perigastric) Nodes", 0, 31.0, 64.0, None),
    ("ep-celiac", "Para-aortic Node", 0, 30.0, 84.5, "An avid node near the aorta below the diaphragm. Para-aortic nodes are distant (M1) for esophageal cancer.")],
    "(A) Coronal CT and (B) FDG PET/CT of a mid-esophageal cancer (white arrows) with avid lesser-curvature nodes (yellow arrows) and a para-aortic node (arrowheads). Tashiro H et al., Surg Case Rep 2025 (PMC12702577), Fig. 1, CC BY 4.0.")
plate("apet", "gi-apet.jpg", [(EP("PMC9179927_cancers-14-02668-g039.jpg"), None, (0, 0, 246, 196), None), (EP("PMC9179927_cancers-14-02668-g039.jpg"), None, (248, 0, 492, 196), None), (EP("PMC9179927_cancers-14-02668-g039.jpg"), None, (494, 0, 740, 196), None)], BL, [
    ("a-primary", "Anal Canal Primary", 0, 17.0, 64.0, None), ("a-ing", "Inguinal Node", 1, 43.0, 26.0, None),
    ("a-ei", "External Iliac Node", 2, 79.0, 40.0, None), ("a-bladder", "Bladder (Physiologic)", 1, 50.0, 55.0, None)],
    "Axial fused FDG PET/CT of anal cancer: (a) small primary in the anal canal, (b) avid right inguinal node, (c) right distal external iliac node. Koppula BR et al., Cancers 2022 (PMC9179927), Fig. 39, CC BY 4.0.", rows=[[0, 1], [2]])
plate("hcc", "gi-hcc.jpg", [(EP("PMC10035689_jlc-2021-08-26f1.jpg"), (0, 0, 495, 185), (0, 0, 492, 185), None)], BL, [
    ("h-ape", "Arterial Phase Hyperenhancement", 0, 13.5, 54.0, None), ("h-washout", "Washout (Delayed Phase)", 0, 62.0, 57.0, None),
    ("h-pvtt", "Portal Vein Tumor Thrombus", 0, 67.5, 40.0, None), ("h-spleen", "Spleen", 0, 91.0, 70.0, None)],
    "Multiphase CT of HCC in segment 6: (A) arterial phase hyperenhancement, (B) washout on the delayed phase, with tumor extending into the right portal vein (second arrow). Han JE et al., J Liver Cancer 2021 (PMC10035689), Fig. 1A–B, CC BY-NC 4.0.",
    "Multiphase CT: Hepatocellular Carcinoma")

# ---------------- Gallery ----------------
gallery_img("gi-g-barrett.jpg", EP("PMC5222925_10388_2016_556_Fig1_HTML.jpg"), (327, 274, 646, 542))
gallery_img("gi-g-couinaud.jpg", "cs/Liver_04_Couinaud_classification_inferior_view.png", (40, 230, 1100, 940))
gallery_img("gi-g-pet-inguinal.jpg", EP("PMC7837391_ac-2020-12-29f2.jpg"), (0, 0, 360, 487))
gallery_img("gi-g-rtog-atlas.jpg", EP("PMC6664500_12885_2019_5970_Fig1_HTML.jpg"))
G = {
 ("anat-gi-organs", 0): ("gi-g-barrett.jpg", "Endoscopy: Barrett's", "Salmon-colored columnar mucosa extending above the EGJ (arrows mark the top of the gastric folds). Japan Esophageal Society, Esophagus 2017 (PMC5222925), Fig. 2-1d, CC BY 4.0."),
 ("anat-gi-organs", 1): ("gi-g-couinaud.jpg", "Couinaud segments", "The liver from below with its functional segments numbered; segment 1 (caudate) sits next to the IVC. BodyParts3D/DBCLS (Wikimedia Commons), CC BY-SA 2.1 JP."),
 ("anat-gi-nodes", 0): ("gi-g-pet-inguinal.jpg", "PET/CT: inguinal node", "FDG-avid inguinal (yellow), external iliac (red), and lateral pelvic (dotted) nodes in anal cancer. Park IJ, Chang G, Ann Coloproctol 2020 (PMC7837391), Fig. 2A–B, CC BY-NC 4.0."),
 ("anat-gi-nodes", 1): ("gi-g-rtog-atlas.jpg", "RTOG anorectal atlas", "Elective nodal CTV (yellow) per RTOG guidance on axial CT slices for anal cancer, from L5 down to the inguinal nodes. Dapper H et al., BMC Cancer 2019 (PMC6664500), Fig. 1, CC BY 4.0."),
}

if __name__ == "__main__":
    json.dump({k: dict(image=v[0], caption=v[1], title=v[2], hs=v[3]) for k, v in P.items()}, open(W + "gi_plates.json", "w"), indent=1)
    json.dump({"%s|%d" % k: v for k, v in G.items()}, open(W + "gi_gallery.json", "w"), indent=1)
    print("built", len(P), "plates,", len(G), "gallery images")
