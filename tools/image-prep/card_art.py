"""card_art.py COMMONS_DIR : build the home-page card images (src/images/cards/) and src/data/cards.json.
Site cards reuse images already in the app; the Background cards and Prostate use Wikimedia Commons
photos downloaded into COMMONS_DIR. Each image is center-cropped to 16:9 at 720x405."""
import sys, os, json
from PIL import Image
R = "/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"
CS = sys.argv[1].rstrip("/") + "/"
OUT = R + "src/images/cards/"; os.makedirs(OUT, exist_ok=True)
W, H = 720, 405
# id -> (source path, focus x 0-1, focus y 0-1, credit)
CARDS = {
 "headneck": (R + "src/images/headneck/hn-np-mri.jpg", .5, .45, "Axial T2 MRI of the nasopharynx. J Korean Soc Radiol 2026 (PMC12883944), CC BY-NC 4.0."),
 "breast": (R + "src/images/breast/br-g-mammo-cc.jpg", .45, .5, "Mammogram of a spiculated breast mass. Razdan S et al., Cureus 2025 (PMC12791182), CC BY 4.0."),
 "thoracic": (R + "src/images/thoracic/th-g-pet7.jpg", .5, .45, "PET/CT of a subcarinal node. Khosa J, Cho RJ, Diagnostics 2026 (PMC13206069), CC BY 4.0."),
 "prostate": (CS + "Radiation_therapy_for_cancer.jpg", .5, .55, "Pelvic radiotherapy on a linac. Jakembradford (Wikimedia Commons), CC BY-SA 4.0."),
 "gyn": (R + "src/images/gyn/gyn-mri-cx-sag.jpg", .5, .45, "Sagittal T2 MRI of cervical cancer. Otero-García et al., Insights Imaging 2019 (PMC6375059), CC BY 4.0."),
 "cns": (R + "src/images/cns/cns-gbm-t1c.jpg", .5, .5, "T1 post-contrast MRI of glioblastoma. Armed Forces Institute of Pathology (Wikimedia Commons), public domain."),
 "gi": (R + "src/images/gi/gi-pct.jpg", .5, .45, "Pancreatic-protocol CT. Louis M et al., Cureus 2025 (PMC11981547), CC BY 4.0."),
 "rad-onc-101": (CS + "External_beam_radiotherapy_NCI.jpg", .55, .55, "External beam radiotherapy. National Cancer Institute (Wikimedia Commons), public domain."),
 "how-rt-works": (CS + "Radiation_therapy.jpg", .5, .5, "Patient on a linac. Dina Wakulchik (Wikimedia Commons), CC BY 2.0."),
 "machines-modalities": (CS + "Tomotherapy_nci-vol-4478-300.jpg", .5, .55, "TomoTherapy unit. Rhoda Baer, National Cancer Institute (Wikimedia Commons), public domain."),
 "presenting-patients": (CS + "CP25_Leukemia_Patient_Consultation_(9123626).jpg", .5, .45, "Clinicians reviewing a chart. U.S. Navy photo by Jonas Womack (Wikimedia Commons), public domain."),
 "the-consult": (CS + "CP25_Leukemia_Patient_Consultation_(9123625).jpg", .5, .5, "A patient consultation. U.S. Navy photo by Jonas Womack (Wikimedia Commons), public domain."),
 "treatment-planning": (R + "src/images/cns/cns-srs-plan.jpg", .3, .5, "Radiosurgery plan with isodose lines. Lewis J et al., Cureus 2025 (PMC12414254), CC BY 4.0."),
}
out = {}
for cid, (src, fx, fy, credit) in CARDS.items():
    im = Image.open(src).convert("RGB")
    w, h = im.size
    if w / h > W / H: cw, ch = round(h * W / H), h
    else: cw, ch = w, round(w * H / W)
    x0 = min(max(0, round(fx * w - cw / 2)), w - cw); y0 = min(max(0, round(fy * h - ch / 2)), h - ch)
    im = im.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.LANCZOS)
    im.save(OUT + cid + ".jpg", quality=78, optimize=True, progressive=True)
    out[cid] = {"image": "images/cards/" + cid + ".jpg", "credit": credit}
json.dump(out, open(R + "src/data/cards.json", "w"), indent=1, ensure_ascii=False)
print("cards:", len(out), sum(os.path.getsize(OUT + f) for f in os.listdir(OUT)) // 1024, "KB")
