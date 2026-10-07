# Thoracic CT level-by-level plates (Imaging > "CT Chest: The Mediastinum Level by Level").
# PMC source figures are downloaded into PMC_DIR first (see docs/build-notes.md for URLs/licenses).
import os, sys; os.environ["SITE"]="thoracic"
from imgtool import *
PMC_DIR = sys.argv[1] if len(sys.argv) > 1 else "pmc/"
def pmc(name): return cv2.imread(os.path.join(PMC_DIR, name))

# 1) Great vessels T2-T3: Hashmi, Sectional Anatomy Quiz III, Fig 1 (CC BY 3.0). Paint out letters A-G and rib numbers 1-4.
im = pmc("q3f1.jpg")
g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
m = np.zeros(g.shape, np.uint8)
dark_on = [(255,118,277,146),(325,106,346,130),(364,106,386,132),(390,86,416,112),(414,168,434,197),(371,166,390,194)]  # A-F: black glyphs
def glyph(sub, dark=True, thr=90):
    """Dark (or bright) blobs inside a box that don't touch its edge = the letter, not the lung around it."""
    b = ((sub < thr) if dark else (sub > thr)).astype(np.uint8)
    n, lab = cv2.connectedComponents(b)
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:,0]) | set(lab[:,-1])
    return np.isin(lab, [i for i in range(1, n) if i not in edge]).astype(np.uint8)*255
for (x0,y0,x1,y1) in dark_on:
    x0,y0,x1,y1 = x0-5,y0-5,x1+5,y1+5
    m[y0:y1, x0:x1] |= glyph(g[y0:y1, x0:x1])
nums = [(158,115,180,140),(36,180,59,207),(22,262,44,289),(144,353,167,380)]  # rib numbers 1-4: white glyphs, black outline
for (x0,y0,x1,y1) in nums:
    sub = g[y0:y1, x0:x1]
    m[y0:y1, x0:x1] |= (((sub > 200) | (sub < 70)) * 255).astype(np.uint8)
m = cv2.dilate(m, np.ones((3,3), np.uint8))
im = cv2.inpaint(im, m, 3, cv2.INPAINT_TELEA)
# "G" sits in the tracheal air column: flatten its glyph to air
gm = np.zeros(g.shape, np.uint8); gm[143:167, 325:348] = ((g[143:167, 325:348] > 45)*255).astype(np.uint8)
gm &= cv2.dilate(((g < 45)*255).astype(np.uint8), np.ones((7,7),np.uint8))   # only glyph pixels surrounded by air
im[cv2.dilate(gm, np.ones((3,3),np.uint8)) > 0] = 3
im = im[4:-7, 4:-4]   # white border in the source figure
save(pad43(im,(0,0,0)), "th-ct-greatvessels.jpg", grid=True)

# 2) Aortic arch T4: Hashmi, Sectional Anatomy Quiz II, Fig 1 (CC BY 3.0). Paint out letters and arrows.
im = pmc("AOJNMB-6-75-g001.jpg")
im = inpaint(im, rects=[(321,188,343,212),(430,131,452,156),(402,214,425,239),(377,272,400,297),
                        (291,292,313,317),(355,236,378,262),(582,80,604,105),(695,131,718,156)],
             lines=[[(376,145),(426,145)],[(312,302),(366,302)]], width=6, radius=5)
save(pad43(im,(0,0,0)), "th-ct-arch.jpg", grid=True)

# 3) Pulmonary arteries / main bronchi (~T5-T6): Sophia's "T2 level axial.jpeg" (actually below the carina).
im = load("T2 level axial.jpeg")
im = im[100:868, :]
save(pad43(im,(0,0,0)), "th-ct-pa.jpg", grid=True)

# 4) Heart T7-T8: Hashmi, Sectional Anatomy Quiz IV, Fig 1 (CC BY 3.0). Sophia's "t8 axial ct.jpeg" was not used
#    (synthesized: airways at the ventricle level, plus a lung mass and effusion).
im = pmc("AOJNMB-7-188-g001.jpg")
g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
m = np.zeros(g.shape, np.uint8)
for (x0,y0,x1,y1) in [(293,152,324,190),(398,103,427,137),(453,126,480,154),(456,173,487,207),(345,226,377,260),(368,316,399,350)]:
    m[y0:y1, x0:x1] |= glyph(g[y0:y1, x0:x1])                       # A B * D C E (black glyphs)
m[288:318, 283:307] |= ((g[288:318, 283:307] > 190)*255).astype(np.uint8)   # F (white)
near = np.zeros(g.shape, np.uint8)
for pts in [[(305,300),(356,300)],[(309,40),(337,78)],[(518,31),(505,76)],[(622,238),(580,212)]]:
    cv2.polylines(near, [np.array(pts,np.int32)], False, 255, 16)
cv2.rectangle(m, (546,229), (559,242), 255, -1)   # last dot of the dotted line
m |= ((near > 0) & (g > 190)).astype(np.uint8)*255                   # white arrows / leader
near[:] = 0; cv2.polylines(near, [np.array([(516,209),(564,237)],np.int32)], False, 255, 10)
m |= ((near > 0) & (g < 70) & (cv2.blur(g,(15,15)) > 110)).astype(np.uint8)*255   # dotted line on the LV wall
m = cv2.dilate(m, np.ones((3,3), np.uint8))
im = cv2.inpaint(im, m, 4, cv2.INPAINT_TELEA)
save(pad43(im,(0,0,0)), "th-ct-heart.jpg", grid=True)

# 5) Coronal through the carina: Itazawa et al., JLCS-JASTRO CT atlas, J Radiat Res 2017, Fig 1 (CC BY-NC 4.0).
#    Kept as published: its colored IASLC station overlays could not be removed cleanly, and they teach the stations.
im = pmc("rrw076f01.jpg")
save(pad43(im,(0,0,0)), "th-ct-coronal.jpg", grid=True)
