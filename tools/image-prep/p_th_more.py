# Thoracic: Sophia's remaining images (Anatomy lobes / central-zone / IASLC plates, galleries, Imaging nodule + PET plates).
import os; os.environ["SITE"]="thoracic"
from imgtool import *
WHITE=(255,255,255)

# Lobes & fissures: simple frontal lung drawing; flatten the baked-in "transparent" checkerboard to white.
im = load("Lung anatomy.png")
h, w = im.shape[:2]; mask = np.zeros((h+2, w+2), np.uint8)
for seed in [(3,3),(w-4,3),(3,h-4),(w-4,h-4),(480,480),(470,990),(20,300),(940,300)]:
    if im[seed[1], seed[0]].min() > 200:
        cv2.floodFill(im, mask, seed, WHITE, (22,22,22), (22,22,22), cv2.FLOODFILL_FIXED_RANGE)
save(pad43(im, WHITE), "th-lobes.jpg", grid=True)

# Proximal bronchial tree / pleura: OpenStax-style figure with Portuguese labels. Crop off the side text, paint out the rest.
im = load("tracheobronchial tree.png")
lines = [[(612,242),(790,242)],[(643,298),(790,298)],[(700,373),(800,373)],[(745,488),(800,488)],[(690,540),(810,540)],
         [(650,598),(650,670)],[(296,352),(296,386)],[(296,358),(320,358)],[(320,358),(320,386)],
         [(262,470),(292,470)],[(215,487),(277,487)],[(277,470),(277,487)],[(290,497),(445,497)],[(370,497),(370,670)],[(487,40),(487,82)],[(262,349),(300,349)]]
im = inpaint_dark(im, lines, band=7, thr=80, grow=2)
for (x1,y0,y1) in [(266,338,362),(258,362,392),(112,392,420),(214,472,500),(233,500,528)]: im[y0:y1, 0:x1] = 255   # side text, stopping short of the chest wall
im = im[88:668, 228:762]
save(pad43(im, WHITE), "th-pbt.jpg", grid=True)

# IASLC stations drawing: keep the navy markers but blank their numbers; drop unused duplicate markers and side labels.
im = load("mediastinal lymph nodes.jpeg")
keep = [(292,222),(203,310),(370,303),(233,460),(352,450),(414,470),(212,525),(400,533),(308,575),(303,703),(173,813),(152,598),(572,748)]
drop = [(413,813),(519,630),(107,520)]
navy = tuple(int(c) for c in np.median(im[218:226, 270:276].reshape(-1,3), axis=0))
for (x,y) in keep: cv2.circle(im, (x,y), 27, navy, -1, cv2.LINE_AA)
m = np.zeros(im.shape[:2], np.uint8)
for (x,y) in drop: cv2.circle(m, (x,y), 36, 255, -1)
im = cv2.inpaint(im, m, 6, cv2.INPAINT_TELEA)
im = inpaint_dark(im, [[(430,342),(525,342)],[(500,502),(681,502)]], band=6, thr=90, grow=2)
m = np.zeros(im.shape[:2], np.uint8); cv2.rectangle(m,(528,318),(681,362),255,-1); cv2.rectangle(m,(655,515),(681,550),255,-1)
im = cv2.inpaint(im, m, 5, cv2.INPAINT_TELEA)
im = im[40:875, :]
save(pad43(im, WHITE), "th-iaslc.jpg", grid=True)

# Gallery: bronchopulmonary segment abbreviations (kept as is), chest wall drawing, nerves around the trachea.
save(load("bronchopulmonary segments.png")[40:700, 60:920], "th-g-segments.jpg")
save(load("coronal anatomy of ribs:clavicle:intercostals.jpg"), "th-g-chestwall.jpg")
im = load("vasculature aorund trachea.jpg"); im[0:30, 0:40] = 255   # red mark in the corner
save(im, "th-g-nerves.jpg")

# Lung-window CT with a spiculated left lower lobe cancer: panel a -> nodule plate, panel b (MIP) -> gallery.
im = load("chest ct lung cancer.png")
a = im[8:795, 0:960].copy(); a[0:52, 0:52] = a[60:112, 0:52]   # cover the panel letter with nearby background
save(pad43(a,(0,0,0)), "th-nodule.jpg", grid=True)
b = im[812:1607, 0:960].copy(); b[0:52, 0:52] = b[60:112, 0:52]
save(b, "th-g-mip.jpg")

# PET/CT: RUL tumor against the anterior chest wall. Remove crosshair ticks.
im = load("lung cancer abutting chest wall.png")
g = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
m = np.zeros(im.shape[:2], np.uint8)
m[168:190, 0:90] = 255; m[168:190, 845:960] = 255; m[685:741, 225:255] = 255; m[270:300, 945:960] = 255
m &= ((g[...,1] > 60) | (g[...,2] > 200)).astype(np.uint8)*255
im = cv2.inpaint(im, cv2.dilate(m, np.ones((5,5),np.uint8)), 5, cv2.INPAINT_TELEA)
save(pad43(im,(0,0,0)), "th-pet-chestwall.jpg", grid=True)

# PET/CT: left superior sulcus (Pancoast) tumor. Crop off the SUV bar and viewer text.
im = load("pet pancoast lung cancer.jpg")
g = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
m = np.zeros(im.shape[:2], np.uint8); m[120:260, 850:905] = 255; m[270:395, 0:165] = 255
B,G,R = [im[...,i].astype(int) for i in range(3)]
m &= ((R > 40) & (B < R + 15)).astype(np.uint8)*255   # anything not blue-tinted = viewer text      # orange viewer text ("L 250", "0.00", "50 % PET")
im = cv2.inpaint(im, cv2.dilate(m, np.ones((7,7),np.uint8)), 4, cv2.INPAINT_TELEA)
im = im[50:425, 95:905]
save(pad43(im,(0,0,0)), "th-pet-pancoast.jpg", grid=True)
