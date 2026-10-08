"""Image audit, October 2026: swaps schematic placeholders for real, sourced images
and removes empty or redundant slots. Images were prepared in a scratch folder and
copied into src/images/ before running this.

Run once. Hotspot coordinates below are percentages of the unpadded image. Plates
render in a fixed 4:3 box, so pad_plates() then pads each new plate image to 4:3
with black and remaps its hotspots. Rerunning would re-apply unpadded coordinates."""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
DATA = os.path.join(ROOT, "src", "data")


def load(rel):
    p = os.path.join(DATA, rel)
    s = open(p, encoding="utf8").read()
    indent = 2 if s.startswith('{\n  "') else 1
    return json.loads(s), p, indent


def save(d, p, indent):
    with open(p, "w", encoding="utf8") as f:
        f.write(json.dumps(d, indent=indent, ensure_ascii=False))


def plate(d, pid):
    for m in d.values():
        for p in m.get("plates", []):
            if p["id"] == pid:
                return m, p
    raise KeyError(pid)


def hs(*rows):
    return [{"id": i, "label": l, "x": x, "y": y, "blurb": b} for i, l, x, y, b in rows]


# ---------------- Breast ----------------
d, p, ind = load("imaging/breast.json")
m, pl = plate(d, "br-ct-sim")
pl.update({
    "title": "CT Simulation: Right Breast Plan",
    "image": "images/breast/br-ct-sim.jpg",
    "caption": "Planning CT for right breast radiation after lumpectomy, with the tumor bed, breast CTV, PTV, and organs at risk outlined. Text labels removed. Kolářová I et al., Curr Oncol 2024 (PMC10969207), Fig. 1, CC BY 4.0.",
    "hotspots": hs(
        ("ct-cavity", "Tumor Bed (Lumpectomy Cavity)", 15.8, 35.9, "The seroma and scar left by surgery. It defines the boost or partial breast target. Seroma is easiest to see in the first weeks after surgery."),
        ("ct-clips", "Surgical Clip", 19.8, 33.3, "Bright dot on the cavity wall. Clips placed by the surgeon make the tumor bed far easier to find on CT, especially once the seroma resolves."),
        ("ct-breast", "Breast CTV", 14, 42, "The glandular breast tissue to be treated, stopping a few mm under the skin and above the pectoralis and ribs."),
        ("ct-ptv", "PTV", 17.1, 51.2, "The CTV plus a margin for setup error and breathing. It is what the beams are shaped to cover."),
        ("ct-lung", "Ipsilateral Lung", 31.7, 57.6, "Tangent beams clip a thin slice of the lung behind the breast. Keeping that slice thin limits pneumonitis."),
        ("ct-heart", "Heart", 53.3, 37.1, "Far from a right breast target, which is why heart dose is mostly a left-sided problem. For left breast cancer, the LAD sits right under the breast and DIBH pulls it away."),
        ("ct-contra", "Contralateral Breast", 75, 17.9, "Contoured as an organ at risk. Keep its dose low, especially in young women, to limit second cancer risk."),
    ),
})
gal = d["img-breast-mammo"]["gallery"]
d["img-breast-mammo"]["gallery"] = [g for g in gal if g.get("image") != "images/breast/br-g-us-node.jpg"]
save(d, p, ind)

d, p, ind = load("anatomy/breast.json")
m = d["anat-breast-nodes"]
m["plates"] = [x for x in m["plates"] if x["id"] != "br-nodes-ct"]
for g in m["gallery"]:
    if g["title"].startswith("RTOG / ESTRO"):
        g.update({
            "title": "Nodal CTVs on a planning CT",
            "caption": "Left chest wall and regional nodal targets after mastectomy: (a) internal mammary (IMLN), chest wall (CW), and axillary (AXLN) volumes; (b) supraclavicular (SCF) and infraclavicular (ICF) volumes higher up. Pink is the PTV. Yu PC et al., Radiat Oncol 2018 (PMC6260755), Fig. 1a-b, CC BY 4.0.",
            "image": "images/breast/br-g-nodal-ctv.jpg",
        })
save(d, p, ind)

# ---------------- CNS ----------------
d, p, ind = load("imaging/cns.json")
m, pl = plate(d, "sag-spine")
pl.update({
    "title": "Sagittal T2 Spine: Cord Compression",
    "image": "images/cns/cns-spine-mri.jpg",
    "caption": "Sagittal T2 MRI of the thoracic spine: a pathologic T5 fracture from metastatic rectal cancer, with epidural tumor compressing the cord. Kuah T et al., Cancers 2022 (PMC9265325), Fig. 10a, CC BY 4.0.",
    "hotspots": hs(
        ("sp-cord", "Spinal Cord", 52.4, 31, "Intermediate gray on T2, outlined by bright CSF in front and behind. The cord usually ends at L1-L2 (conus), so a cord compression level is always above that."),
        ("sp-csf", "CSF Around the Cord", 57, 62, "Bright on T2. Losing this CSF rim around the cord is what separates high-grade compression (Bilsky 2-3) from lower grades."),
        ("sp-vb", "Normal Vertebral Body", 47, 60, "Square, with flat endplates and a normal height. Compare it with the collapsed level above."),
        ("sp-met", "Collapsed Vertebral Body (Metastasis)", 48.5, 45.5, "Pathologic fracture: the body has lost height and the marrow signal is abnormal. Most spinal metastases start in the vertebral body."),
        ("sp-epi", "Epidural Tumor Compressing the Cord", 54, 44, "Tumor pushing back from the vertebral body into the canal. With neurologic deficits this is an emergency: dexamethasone now, then surgery and/or radiation."),
        ("sp-post", "Posterior Elements", 62, 52, "Lamina and spinous processes. Tumor here, or a fracture involving both front and back, adds to spinal instability (SINS score)."),
    ),
})
adv = d["img-cns-advanced"]
adv["gallery"] = [g for g in adv["gallery"] if g.get("image") != "images/cns/cns-spine-mri.jpg"]
save(d, p, ind)

# ---------------- GYN ----------------
d, p, ind = load("imaging/gyn.json")
m, pl = plate(d, "gyn-mri-cx-ax")
pl.update({
    "image": "images/gyn/gyn-mri-cx-ax.jpg",
    "caption": "Axial T2 MRI of a large cervical cancer with right parametrial invasion. The patient's right is on the image left; the original arrow has been removed. Alshakankery SM et al., Cureus 2025 (PMC11866034), Fig. 2, CC BY 4.0.",
    "hotspots": hs(
        ("cx-tumor", "Cervical Tumor", 50, 60, "Intermediate (gray) signal replacing the normally dark cervical stroma. Size over 4 cm makes it at least IB3."),
        ("ring-broken", "Parametrial Invasion (Right)", 36, 52, "Tumor breaks through the edge of the cervix into the parametrial fat with spiculated strands. That is IIB, and the standard treatment becomes chemoradiation."),
        ("ring-intact", "Normal Parametrial Fat (Left)", 64, 49, "Bright fat with small vessels and a clean interface with the cervix. Compare the two sides on every scan."),
        ("cx-rectum", "Rectum", 50, 81, "Directly behind the cervix. Mucosal invasion of the bladder or rectum is IVA; a preserved fat plane argues against it."),
    ),
})
m, pl = plate(d, "gyn-mri-endo")
pl.update({
    "title": "Endometrial MRI: Sagittal T2 and DWI",
    "image": "images/gyn/gyn-mri-endo.jpg",
    "caption": "Endometrial cancer with deep (50% or more) myometrial invasion: sagittal T2 (left) and axial DWI (right). Arrows and panel letters removed. Raja S et al., Cureus 2024 (PMC11238663), Fig. 3a and 3c, CC BY 4.0.",
    "hotspots": hs(
        ("en-tumor", "Endometrial Tumor", 25, 38, "Intermediate signal filling and expanding the endometrial cavity, slightly darker than the surrounding myometrium on T2."),
        ("en-deep", "Thinned Outer Myometrium", 37, 40, "Only a thin rim of myometrium is left outside the tumor. Invasion of 50% or more of the myometrium is IB."),
        ("en-cx", "Cervix", 30, 60, "Check for tumor in the cervical stroma. Stromal invasion is stage II and changes surgery and adjuvant therapy."),
        ("en-bladder", "Bladder", 18, 58, "Sits in front of the uterus. Bladder mucosal invasion is IVA."),
        ("en-dwi", "Restricted Diffusion (DWI)", 73, 60, "Tumor is bright on high b-value DWI and dark on the ADC map. DWI makes the deepest point of invasion easier to see than T2 alone."),
    ),
})
m, pl = plate(d, "gyn-brachy-mri")
pl.update({
    "image": "images/gyn/gyn-brachy-mri.jpg",
    "caption": "Para-sagittal T2 MRI with a tandem and ring in place, contoured for MRI-guided brachytherapy: HR-CTV in cyan, bladder in yellow, rectum in magenta. Owrangi AM et al., J Contemp Brachytherapy 2015 (PMC4663219), Fig. 2, CC BY-NC-SA.",
    "hotspots": hs(
        ("tandem", "Tandem", 47, 25, "The dark line running up the uterine canal. It goes through the cervical os, and dose falls off steeply around it."),
        ("hrctv", "HR-CTV", 56, 22, "Whole cervix plus any residual tumor at the time of brachytherapy. Goal D90 of at least 85 Gy EQD2 (EBRT plus brachy)."),
        ("bladder-b", "Bladder (Foley Balloon)", 72, 36, "The dark circle is the Foley balloon. Bladder D2cc is kept under about 80-90 Gy EQD2."),
        ("rectum-b", "Rectum and Sigmoid", 25, 52, "Behind the applicator. Rectal D2cc is kept under about 65-75 Gy EQD2; the sigmoid can drape over the tandem tip."),
        ("packing", "Vaginal Packing", 50, 52, "Gauze packed around the applicator holds it in place and pushes the rectum and bladder away from the high-dose region."),
    ),
})
save(d, p, ind)

# ---------------- Head & Neck ----------------
d, p, ind = load("imaging/headneck.json")
m, pl = plate(d, "hn-oc-pet")
pl.update({
    "image": "images/headneck/hn-oc-pet.jpg",
    "caption": "Staging FDG PET/CT for a T4aN2b left buccal mucosa cancer: fused PET/CT on top, matching CT below. Arrows and panel letters removed. Marcus C, Cancers 2025 (PMC12523320), Fig. 1A-D, CC BY 4.0.",
    "hotspots": hs(
        ("oc-pet-primary", "Primary Tumor (FDG-Avid)", 42, 14, "Intense uptake in the left buccal mass. PET confirms active tumor but blurs its edges, so MRI or CT still defines the extent."),
        ("oc-pet-primary-ct", "Primary on CT", 44, 63, "The same buccal mass on CT. Read PET and CT together: CT shows the anatomy, PET shows which tissue is active."),
        ("oc-pet-bone", "Mandible", 37, 66, "Check the cortex next to the tumor. Invasion through cortical bone makes an oral cavity cancer T4a."),
        ("oc-pet-nodes", "FDG-Avid Level IB Node", 86, 16, "Small but avid submandibular node. PET often catches nodes that are not yet enlarged on CT."),
        ("oc-pet-nodes-ct", "Same Node on CT", 86, 66, "Under 1 cm on CT, so size alone would miss it. Avid ipsilateral nodes upstage the neck (here N2b)."),
    ),
})
save(d, p, ind)

d, p, ind = load("anatomy/headneck.json")
for m in d.values():
    if m.get("gallery"):
        m["gallery"] = [g for g in m["gallery"] if g.get("image")]
    for pl in m.get("plates", []):
        if pl.get("gallery") is not None:
            pl["gallery"] = [g for g in pl["gallery"] if g.get("image")]
            if not pl["gallery"]:
                del pl["gallery"]
save(d, p, ind)

# ---------------- Thoracic ----------------
d, p, ind = load("imaging/thoracic.json")
m, pl = plate(d, "th-img-4dct")
pl.update({
    "title": "SBRT Planning CT: Targets & Dose",
    "image": "images/thoracic/th-sbrt-plan.jpg",
    "caption": "Axial slice of a lung SBRT plan (50 Gy in 5 fractions) for a peripheral right lung metastasis. Red is the ITV, orange the PTV, and the green and blue lines are lower isodoses. Wegner RE et al., Front Oncol 2019 (PMC6514183), Fig. 1, CC BY 4.0.",
    "hotspots": hs(
        ("itv", "ITV (Motion Envelope)", 23, 51, "The tumor on every phase of the 4D-CT, combined. It covers where the tumor moves as the patient breathes."),
        ("ptv", "PTV", 26.5, 50, "ITV plus a setup margin, about 5 mm for SBRT. The prescription dose covers this ring."),
        ("iso10", "Low-Dose Spill (10 Gy)", 10, 60, "The star-shaped outline is the low-dose bath from many beam angles. It spreads dose thinly instead of piling it on one path."),
        ("chestwall", "Chest Wall (Rib)", 21, 57, "Peripheral tumors sit against the chest wall. High dose here causes chest wall pain and rib fractures."),
        ("heart", "Heart", 54, 37, "Contoured for every lung plan. Mean heart dose predicted survival in RTOG 0617."),
        ("liver", "Liver Dome", 31, 40, "At the lung bases the liver rises into the slice. It moves with breathing, like the tumor."),
        ("cord", "Spinal Cord", 48, 70, "Serial organ with a strict maximum dose. Every plan reports its hottest point."),
    ),
})
m, pl = plate(d, "th-img-postsbrt")
pl.update({
    "title": "CT After SBRT: Mass-Like Fibrosis",
    "image": "images/thoracic/th-postsbrt.jpg",
    "caption": "Right upper lobe cancer treated with SBRT (70 Gy in 10 fractions), followed for 4 years: (A) before treatment, (B) plan, (C) 3 months, (D) 9 months, (E) 3 years, (F) 4 years. Strange TA et al., Diagnostics 2023 (PMC10606648), Fig. 9, CC BY 4.0.",
    "hotspots": hs(
        ("pre", "Tumor Before SBRT", 17, 26, "Spiculated right upper lobe cancer (asterisk) before treatment. This is the baseline for every later scan."),
        ("plan", "SBRT Plan", 42, 24, "The tumor sits inside the highest isodose lines. Later fibrosis takes the shape of this high-dose region."),
        ("m3", "3 Months", 85, 23, "Slight shrinkage with minimal pneumonitis next to it. Early scans can look worse before they look better."),
        ("m9", "9 Months: Retraction", 14, 70, "The treated area pulls toward the pleura with a solid rim around it. Expected fibrosis conforms to the dose and keeps its air bronchograms."),
        ("y3", "3 Years: Mass-Like Opacity", 46, 60, "A triangular opacity at the treated site. Fibrosis can keep changing for 2 to 4 years."),
        ("y4", "4 Years: Stable Scar", 83, 60, "Stable compared with year 3. Growth after the first year, a bulging margin, or craniocaudal growth would raise concern for recurrence; PET or biopsy settles it."),
    ),
})
m["intro"] = "<p>The scans radiation oncologists make themselves: the <strong>planning CT</strong> for lung SBRT, and the <strong>follow-up CT after SBRT</strong>, where you need to tell expected fibrosis from recurrence.</p>"
save(d, p, ind)


# ---------------- Pad new plate images to 4:3 ----------------
def pad_plates():
    from PIL import Image
    todo = {
        "imaging/breast.json": ["br-ct-sim", "br-mammo-mlo"],  # mammogram was portrait with image-relative hotspots
        "imaging/gyn.json": ["gyn-mri-cx-ax", "gyn-mri-endo", "gyn-brachy-mri"],
        "imaging/headneck.json": ["hn-oc-pet"],
        "imaging/thoracic.json": ["th-img-4dct", "th-img-postsbrt"],
    }
    for rel, ids in todo.items():
        d, p, ind = load(rel)
        for pid in ids:
            _, pl = plate(d, pid)
            f = os.path.join(ROOT, "src", pl["image"])
            im = Image.open(f).convert("RGB")
            w, h = im.size
            if abs(w / h - 4 / 3) < 0.01:
                continue
            W, H = (w, round(w * 3 / 4)) if w / h > 4 / 3 else (round(h * 4 / 3), h)
            ox, oy = (W - w) // 2, (H - h) // 2
            c = Image.new("RGB", (W, H), (0, 0, 0))
            c.paste(im, (ox, oy))
            if W > 1000:
                c = c.resize((1000, 750), Image.LANCZOS)
            c.save(f, quality=74, optimize=True, progressive=True)
            for s_ in pl["hotspots"]:
                s_["x"] = round((ox + s_["x"] / 100 * w) / W * 100, 1)
                s_["y"] = round((oy + s_["y"] / 100 * h) / H * 100, 1)
        save(d, p, ind)


pad_plates()
print("done")
