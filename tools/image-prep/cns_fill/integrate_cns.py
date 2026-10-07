import json, shutil, os
R = "/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"
IMG = R + "src/images/cns/"; os.makedirs(IMG, exist_ok=True)
exec(open("hs.py").read())  # HS (OpenNeuro MRI plates, % coords)
SRC = json.load(open("plates_src.json"))
MR = "Source: OpenNeuro ds003653 (Manelis A et al.), 3T MRI of a healthy adult volunteer, CC0 public domain."
CAP = {
 "cns-lobes": "Lateral view of the left hemisphere, anterior on the left: frontal lobe (red), parietal lobe (gray), temporal lobe (blue), occipital lobe (green), cerebellum and brainstem (tan). Source: OpenStax Anatomy and Physiology (Wikimedia Commons, 1306 Lobes of Cerebral Cortex), CC BY 4.0; labels and leader lines removed.",
 "cns-ventricles": "Midsagittal diagram of CSF flow (arrows): made by the choroid plexus in the ventricles, CSF passes through the 3rd ventricle, aqueduct, and 4th ventricle into the subarachnoid space and is absorbed at the arachnoid granulations. Source: OpenStax Anatomy and Physiology (Wikimedia Commons, 1317 CFS Circulation), CC BY 4.0; labels and leader lines removed.",
 "cor-sella": "Coronal T1 MRI of a normal pituitary gland (patient's right on your left). Source: Mannion P, Jude E, Endocrinol Diabetes Metab Case Rep 2026 (PMC13454250), Fig. 1B, CC BY 4.0.",
 "ax-orbit": "Axial T2 MRI through the mid-orbits (vitreous is bright, lens is dark). Source: Nagesh CP et al., Indian J Ophthalmol 2021 (PMC8597479), Fig. 11a, CC BY-NC-SA 4.0; labels and arrows removed.",
 "gbm-t1c": "Axial T1 post-contrast MRI: left temporal glioblastoma with a thick, irregular enhancing rim around a necrotic center. Source: Armed Forces Institute of Pathology (Wikimedia Commons, AFIP-00405558), public domain.",
 "gbm-flair": "Axial FLAIR MRI of a different patient: left temporal glioblastoma with extensive surrounding FLAIR signal and mass effect. Source: Tiwari S, Gyawali I, Cureus 2024 (PMC10944577), Fig. 5B, CC BY 4.0.",
 "lgg-flair": "Axial FLAIR MRI: grade 2 astrocytoma in the left anterior insula and frontal white matter, non-enhancing. Source: Vail M et al., Cureus 2026 (PMC12947947), Fig. 3, CC BY 4.0; arrow removed.",
 "mets-mri": "Axial T1 post-contrast MRI: many small enhancing brain metastases from lung cancer. Source: Hellerhoff (Wikimedia Commons, BC - Hirnmetastasen MRT T1KM ax), CC BY-SA 3.0.",
 "srs-plan": "Fractionated SRS plan: left frontal resection cavity (24 Gy in 3 fractions) and a right-sided intact metastasis, axial (left) and coronal (right); prescription isodose in green, low-dose spill in blue, optic structures in orange. Source: Lewis J et al., Cureus 2025 (PMC12414254), Fig. 2A, CC BY 4.0; orientation letters removed.",
 "mening": "Coronal T1 post-contrast MRI: homogeneously enhancing parasagittal meningioma. Source: James Heilman, MD (Wikimedia Commons, MRIMeningioma), CC BY-SA 4.0; arrow removed.",
 "vs": "Axial T1 post-contrast MRI: right vestibular schwannoma at the cerebellopontine angle (patient's right on your left). Source: Hellerhoff (Wikimedia Commons, Akustikus-Schwannom rechts MRT T1KM axial 001), CC BY-SA 3.0.",
 "pit": "Coronal T1 post-contrast MRI: pituitary macroadenoma expanding the sella and rising into the suprasellar cistern to abut the optic chiasm. Source: Iyer C et al., JCEM Case Rep 2026 (PMC13198944), Fig. 1A, CC BY 4.0; arrow removed.",
 "ct-head": "Non-contrast axial CT: acute left basal ganglia hemorrhage (bright) with surrounding hypodense edema. Source: Elsherif Y et al., Radiol Case Rep 2025 (PMC12098020), Fig. 6, CC BY 4.0.",
 "post-tx": "Treated glioblastoma with a new enhancing lesion (left: T1 post-contrast) that was pathology-proven radiation necrosis; perfusion map (right) shows the lesion is not hyperperfused. Source: Mohamedbaqer Easa A et al., Cureus 2025 (PMC12393895), Fig. 2A-B, CC BY 4.0; circles and panel letters removed.",
 "spine-mri": "Sagittal T2 MRI of the thoracic spine: pathologic T5 fracture from metastatic rectal cancer with epidural extension compressing the cord. Source: Kuah T et al., Cancers 2022 (PMC9265325), Fig. 10a, CC BY 4.0.",
}
TITLE = {}
LABEL = {("srs-plan", "srs-chiasm"): ("Optic Nerves / Chiasm", "Orange contours: the optic apparatus is an OAR for every SRS plan. Single-fraction chiasm limit ~8–10 Gy."),
         ("post-tx", "pt-rcbv"): (None, "High rCBV = tumor (lots of new vessels). Low rCBV = treatment effect, as in this proven radiation necrosis."),
         ("srs-plan", "srs-v12"): (None, "Normal brain getting 12 Gy in a single fraction: >~5–10 cc raises radionecrosis risk. The blue wash here is the low-dose spill around the target.")}
GAL = {("anatomy", "anat-cns-overview", 0): ("cns-g-territories.jpg", "Vascular territories", "ACA (yellow: medial frontal/parietal), MCA (red: most of the lateral hemisphere), PCA (blue: occipital, inferior temporal). Source: Frank Gaillard, derivative work (Wikimedia Commons, Cerebral vascular territories), CC BY 2.5."),
       ("anatomy", "anat-cns-overview", 1): ("cns-g-homunculus.jpg", "Homunculus", "Sensory homunculus on the postcentral gyrus; the motor strip just in front follows the same map: leg medial, arm and face lateral. Source: OpenStax College (Wikimedia Commons, 1421 Sensory Homunculus), CC BY 3.0."),
       ("anatomy", "anat-cns-special", 0): ("cns-g-hawbrt.jpg", "HA-WBRT dose", "Hippocampal-avoidance whole-brain plan: the two cool spots in the middle are the spared hippocampi. Source: Yang X et al., Eur J Med Res 2023 (PMC9841677), Fig. 1B, CC BY 4.0."),
       ("anatomy", "anat-cns-special", 1): ("cns-g-csi.jpg", "Craniospinal field", "VMAT craniospinal plan (sagittal): the whole brain and spinal canal down to the thecal sac are treated. Source: Agdi B et al., Cureus 2026 (PMC13354313), Fig. 3, CC BY 4.0.")}
data = {k: json.load(open(R + f"src/data/{k}/cns.json")) for k in ("anatomy", "imaging")}
done = []
def setplate(pid, file, hs, caption, drop=()):
    for k, d in data.items():
        for g in d.values():
            for p in g["plates"]:
                if p["id"] != pid: continue
                old = {h["id"]: h for h in p["hotspots"]}
                assert set(hs) <= set(old), (pid, set(hs) - set(old))
                new = []
                for h in p["hotspots"]:
                    if h["id"] not in hs: continue
                    x, y = hs[h["id"]]; h = dict(h, x=float(x), y=float(y))
                    lab = LABEL.get((pid, h["id"]))
                    if lab:
                        if lab[0]: h["label"] = lab[0]
                        if lab[1]: h["blurb"] = lab[1]
                    new.append(h)
                p["hotspots"] = new; p["image"] = "images/cns/" + file; p["caption"] = caption
                if pid in TITLE: p["title"] = TITLE[pid]
                shutil.copy("out/" + file, IMG + file); done.append(pid); return
    raise KeyError(pid)
for pid, v in HS.items(): setplate(pid, v["file"], v["hs"], v["caption"])
for pid, v in SRC.items(): setplate(pid, v["file"], v["hs"], CAP[pid])
for (k, gid, i), (f, title, cap) in GAL.items():
    it = data[k][gid]["gallery"][i]; it.update(image="images/cns/" + f, title=title, caption=cap)
    shutil.copy("out/" + f, IMG + f)
for k, d in data.items():
    p = R + f"src/data/{k}/cns.json"; ind = len(open(p).read().split("\n")[1]) - len(open(p).read().split("\n")[1].lstrip())
    open(p, "w").write(json.dumps(d, indent=ind, ensure_ascii=False) + "\n")
print(len(done), "plates;", len(GAL), "gallery;", sorted(done))
left = [p["id"] for d in data.values() for g in d.values() for p in g["plates"] if not p.get("image")]
print("still placeholder:", left)
