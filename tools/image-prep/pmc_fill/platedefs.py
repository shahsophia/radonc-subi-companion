BL=(0,0,0); WH=(255,255,255)
def fill(im,rects,col=(0,0,0)):
    for (x0,y0,x1,y1) in rects: im[y0:y1,x0:x1]=col
    return im
def darkmask(im,rects,thr=60,bright=False):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); m=np.zeros(g.shape,np.uint8)
    for (x0,y0,x1,y1) in rects:
        sub=g[y0:y1,x0:x1]; m[y0:y1,x0:x1]=(((sub>thr) if bright else (sub<thr))*255).astype(np.uint8)
    return cv2.dilate(m,np.ones((3,3),np.uint8))
# ---------- Head & neck ----------
plate("hn-oc-mri","headneck","hn-oc-mri.jpg","ocmri2",(5,402,390,748),
  lambda im: fill(inpaint(im,lines=[[(168,548),(228,508)]],rects=[(5,405,42,442)],width=16),[(12,750,125,787)]),BL,
  [("oc-mri-primary","Primary Tumor (Enhancing)",225,512,"The enhancing mass in the left anterior oral tongue. MRI is the workhorse for the oral cavity primary because soft-tissue contrast is unmatched, which is essential for measuring depth of invasion, the biggest T-stage driver here."),
   ("oc-mri-doi","Depth of Invasion Plane",212,532,None),
   ("oc-mri-muscle","Extrinsic Tongue Musculature",195,590,"Genioglossus fibers fan out from the midline of the tongue. Invasion of the extrinsic muscles signals a deeply infiltrative tumor and often changes the surgical approach (partial vs. total glossectomy)."),
   ("oc-mri-mandible","Mandible",108,478,"The dark cortex and marrow of the mandible wrap around the tongue. MRI is more sensitive than CT for early marrow invasion (T1 marrow signal loss), even before cortical breakthrough is visible."),
   ("oc-mri-pni","Floor of Mouth / Lingual Nerve Region",265,575,"The lingual nerve runs along the floor of mouth beside the tongue. Perineural spread travels along CN V3 branches: look for nerve thickening, loss of perineural fat, and abnormal enhancement.")],
  "Axial contrast-enhanced T1 MRI of a clinical T2 left oral tongue cancer. Source: Radiologic evaluation of AJCC 8 oral cavity staging, J Korean Soc Radiol 2026 (PMC12883927), Fig. 2C, CC BY-NC 4.0; arrow and labels removed.")
plate("hn-oc-ct","headneck","hn-oc-ct.jpg","occt",(0,0,736,876),
  lambda im: inpaint(im,lines=[[(72,347),(182,347)]],polys=[[(150,330),(185,347),(150,365)]],rects=[(30,25,90,80)],width=14),BL,
  [("oc-ct-cortex","Mandibular Cortex Erosion",180,340,"The inner cortex of the right mandible is eroded next to the tumor. CT beats MRI for cortical bone, and frank cortical erosion defines T4a."),
   ("oc-ct-primary","Primary Tumor (Retromolar Trigone)",235,385,None),
   ("oc-ct-normal","Intact Mandible (Other Side)",548,380,"Compare with the normal contralateral mandible: a smooth, continuous white cortex. Side-to-side comparison is the easiest way to spot subtle erosion."),
   ("oc-ct-artifact","Teeth / Dental Hardware",345,120,"Dense teeth and fillings sit right next to the oral cavity. Dental hardware creates streak artifact that can hide the primary on CT and MRI, so check whether artifact limits your read before calling a study negative.")],
  "Axial contrast CT: retromolar trigone cancer eroding the right mandible. Source: Jones W et al., Oral Oncol Rep 2025 (PMC12199806), Fig. 1A, CC BY-NC 4.0; arrow and panel letter removed.")
plate("hn-mri-skull-base","headneck","hn-np-mri.jpg","npc1",(397,0,789,396),
  lambda im: inpaint(im,rects=[(400,4,462,36)]),BL,
  [("fossa-rosenmuller-mri","Fossa of Rosenmüller",561,262,None),
   ("torus","Torus Tubarius",546,244,"The cartilage bump around the eustachian tube opening. The fossa of Rosenmüller sits just behind and above it."),
   ("retropharyngeal-node","Lateral Retropharyngeal (Rouvière) Node Region",532,289,None),
   ("parapharyngeal","Parapharyngeal Space",497,273,"Fat-filled space lateral to the nasopharynx. Tumor extension into it is T2 for nasopharyngeal cancer."),
   ("prevertebral","Prevertebral (Longus) Muscles",590,305,"Just behind the nasopharynx and in front of the skull base. Involvement is T2 in the AJCC 9th edition.")],
  "Axial T2 MRI of a normal nasopharynx. Source: Recent AJCC version 9 staging of nasopharyngeal cancer, J Korean Soc Radiol 2026 (PMC12883944), Fig. 1 (T2 panel), CC BY-NC 4.0.",
  "Nasopharynx & Retropharyngeal Nodes: MRI")
plate("hn-ct-laryngeal-invasion","headneck","hn-lx-invasion.jpg","larinv",None,
  lambda im: inpaint(im,lines=[[(68,183),(130,242)],[(128,108),(182,160)],[(184,68),(218,122)],[(265,28),(292,102)],[(358,28),(358,108)],[(505,86),(470,110),(440,157)],[(530,500),(505,445),(455,420)]],rects=[(428,138,472,172),(440,405,482,442),(445,110,485,150),(455,425,495,462)],width=17),BL,
  [("thyroid-cartilage-outer","Thyroid Cartilage: Destroyed (Right)",300,165,"Tumor has broken through the thyroid cartilage on the right. Breakthrough of the outer cortex means extralaryngeal spread: T4a."),
   ("thyroid-cartilage-inner","Thyroid Cartilage: Intact Left Lamina",548,300,"The normal left thyroid lamina: a continuous ossified plate. Compare both sides; inner-cortex erosion or sclerosis alone correlates with T3."),
   ("cricoid-cartilage","Cricoid Cartilage",430,395,None),
   ("extralaryngeal","Extralaryngeal Spread",150,235,"Tumor in the soft tissues and strap muscles outside the larynx. Any spread through cartilage into the neck is T4a."),
   ("subglottis","Subglottic Airway",395,305,"The airway below the true cords. Subglottic extension raises the risk of level VI (paratracheal) nodes.")],
  "Axial contrast CT through the subglottis: advanced subglottic cancer destroying the cricoid and thyroid cartilages. Source: Joshi VM et al., Imaging in laryngeal cancers, Indian J Radiol Imaging 2012 (PMC3624744), Fig. 16, CC BY-NC-SA 3.0; arrows removed.")
# ---------- Breast ----------
def tdlu_ops(im):
    b,g,r=[im[:,:,i].astype(int) for i in range(3)]
    blue=((b>100)&(b-r>25)&(b-g>10)).astype(np.uint8)*255
    blue=cv2.dilate(blue,np.ones((3,3),np.uint8))
    im=inpaint(im,mask=blue|darkmask(im,[(345,196,400,214)],thr=120),radius=3)
    reg=im[140:220,365:400]; red=(reg[:,:,2].astype(int)-reg[:,:,1]>60); reg[~red]=255
    return im
plate("br-tdlu","breast","br-tdlu.jpg","tdlu",(0,20,395,300),tdlu_ops,WH,
  [("lobule","Lobule (Acini)",238,262,None),("tdlu","Terminal Duct Lobular Unit",305,238,None),
   ("terminal-duct","Terminal Duct",272,212,None),("duct","Segmental (Major) Duct",160,110,"Larger ducts leading to the nipple. DCIS fills and spreads along ducts, which is why it often shows up as linear or branching calcifications."),
   ("sinus","Lactiferous Sinus",160,42,None),("stroma","Intralobular Stroma",330,262,"Loose connective tissue inside and around the lobule. Invasive cancer grows into the stroma: IDC forms a firm, spiculated mass; ILC infiltrates in single-file lines without a clear mass.")],
  "Schematic of a breast lobe from the nipple (top) down to the terminal duct lobular units (circled). Source: Banik U et al., J Exp Clin Cancer Res 2017 (PMC5517797), Fig. 1, CC BY 4.0; labels and pointer lines removed.")
plate("br-axillary-levels","breast","br-axillary-levels.jpg","axlev",(270,0,653,432),
  lambda im: inpaint_dark(im,[[(212,198),(160,290)],[(348,250),(210,322)],[(250,376),(412,376)]],band=7,thr=110,
                          rects=[(42,282,212,308),(3,318,238,348),(62,360,252,388)]),WH,
  [("l1","Level I (Lateral to Pec Minor)",318,262,None),("l2","Level II (Behind Pec Minor)",392,205,None),
   ("l3","Level III (Medial to Pec Minor)",448,175,None),("pecminor","Pectoralis Minor",385,330,None),("axv","Axillary Vein",290,183,None)],
  "Drawing of the right axilla: level I nodes (red) lateral to the pectoralis minor, level II (purple) behind it, level III (blue) medial to it. Source: Lu Q et al., PLoS One 2013 (PMC3702586), Fig. 1, CC BY 4.0; labels and legend removed.")
# ---------- Thoracic ----------
gray_lines=[[(170,68),(215,72)],[(158,122),(178,128)],[(70,214),(240,216)],[(395,157),(290,158)],[(404,196),(300,203)],[(404,236),(292,232)],[(404,262),(295,258)],[(404,266),(300,288)],[(404,302),(318,302)],[(410,388),(318,390)]]
def lungonly(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); m=((g<200)*255).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
    n,lab,st_,_=cv2.connectedComponentsWithStats(m); k=1+int(np.argmax(st_[1:,4]))
    keep=cv2.dilate(((lab==k)*255).astype(np.uint8),np.ones((5,5),np.uint8))
    im[keep==0]=255; return im
plate("th-hilum","thoracic","th-hilum.jpg","gray972",None,
  lambda im: cv2.inpaint(inpaint_dark(im,gray_lines,band=4,thr=110),darkmask(im,[(0,40,172,82),(55,98,156,136),(0,186,70,228),(400,142,500,168),(402,180,500,218),(402,222,500,258),(402,252,500,288),(402,288,500,318),(408,372,500,408)],thr=150),3,cv2.INPAINT_TELEA) if False else lungonly(cv2.inpaint(inpaint_dark(im,gray_lines,band=4,thr=110),darkmask(im,[(0,40,172,82),(55,98,156,136),(0,186,70,228),(400,142,500,168),(402,180,500,218),(402,222,500,258),(402,252,500,288),(402,288,500,318),(408,372,500,408)],thr=150),3,cv2.INPAINT_TELEA)),WH,
  [("rpa","Right Pulmonary Artery",240,213,None),("ruv","Right Upper Lobe (Eparterial) Bronchus",282,198,None),("rb","Right Main / Intermediate Bronchus",280,232,None),
   ("spv","Superior Pulmonary Vein",255,258,None),("ipv","Inferior Pulmonary Vein",292,283,None),("hilar-nodes","Hilar Nodes (Station 10R)",262,180,None),
   ("pulm-lig","Pulmonary Ligament",318,380,None),("azygos-groove","Azygos Arch (Groove)",300,155,None)],
  "Mediastinal (medial) surface of the right lung, showing the hilum. Gray's Anatomy (1918), Fig. 972, public domain; labels and pointer lines removed.")
st=lambda im,pts: cv2.inpaint(im,yellow_labels(im,pts),3,cv2.INPAINT_TELEA)
A3=[(266,239),(232,310),(357,361),(284,388)]
plate("th-nodes-ax-arch","thoracic","th-nodes-ax-upper.jpg","at3",None,
  lambda im: inpaint(st(im,A3),rects=[(45,240,178,282)]),BL,
  [("a3a","Station 3a",266,239,None),("a2r","Station 2R",232,310,None),("a2l","Station 2L",357,361,None),("a3p","Station 3p",284,388,None)],
  "Upper mediastinal CT (above the arch) with station contours. Source: JLCS-JASTRO CT atlas of regional lymph node stations, J Radiat Res 2017 (PMC5321185), Fig. 3, CC BY-NC 4.0; station labels removed. The dashed blue line (Line A) separates 3a from 2R/2L.",
  "Axial CT: Above the Arch")
A5=[(324,147),(393,229),(268,314),(357,332),(421,348),(352,423)]
plate("th-nodes-ax-ap","thoracic","th-nodes-ax-ap.jpg","at5",None,
  lambda im: inpaint(fill(st(im,A5),[(420,384,500,430),(500,234,628,292),(468,236,500,272)]),rects=[(374,384,422,430)]),BL,
  [("b3a","Station 3a",324,147,"Prevascular, behind the sternum and in front of the great vessels."),("b6","Station 6",393,229,None),("b4r","Station 4R",268,314,None),
   ("b4l","Station 4L",357,332,None),("b5","Station 5",421,348,None),("b3p","Station 3p",352,423,"Behind the trachea, beside the esophagus.")],
  "CT at the azygos arch / AP window with station contours. Source: JLCS-JASTRO CT atlas, J Radiat Res 2017 (PMC5321185), Fig. 5, CC BY-NC 4.0; station labels removed. The dashed red and blue lines (Lines B and C) are the atlas's boundaries for station 5.",
  "Axial CT: Azygos Arch / AP Window")
A10=[(472,276),(136,337),(297,374),(422,397),(230,400),(353,445)]
def st2(im,pts,bx=26,by=16):
    b,g,r=[im[:,:,i].astype(int) for i in range(3)]
    m=((r>120)&(g>110)&(r-b>35)).astype(np.uint8)*255; keep=np.zeros_like(m)
    for (x,y) in pts: keep[max(0,y-by):y+by,max(0,x-bx):x+bx]=255
    return cv2.inpaint(im,cv2.dilate(m&keep,np.ones((3,3),np.uint8)),3,cv2.INPAINT_TELEA)
plate("th-nodes-ax-sub","thoracic","th-nodes-ax-carina.jpg","at10",None,
  lambda im: st2(im,A10),BL,
  [("c7","Station 7",297,374,None),("c8","Station 8",353,445,None),("c11r","Station 11R",136,337,None),
   ("c10r","Station 10R",230,400,"Right hilar nodes along the right main bronchus. Ipsilateral station 10 = N1."),("c10l","Station 10L",422,397,"Left hilar nodes along the left main bronchus. Ipsilateral = N1; for a right-sided tumor, contralateral hilar = N3.")],
  "CT at the subcarinal level with station contours. Source: JLCS-JASTRO CT atlas, J Radiat Res 2017 (PMC5321185), CC BY-NC 4.0; station labels removed.",
  "Axial CT: At & Below the Carina")
plate("th-compartments","thoracic","th-compartments.jpg","itmig",(0,0,768,1130),None,WH,
  [("prevascular","Prevascular Compartment",175,470,"Pink: behind the sternum, in front of the heart and great vessels. Thymus, fat, and station 3a nodes. Anterior mediastinal masses: thymoma, lymphoma, germ cell tumor, thyroid."),
   ("visceral","Visceral Compartment",300,560,"Blue: heart, pericardium, great vessels, trachea, carina, main bronchi, esophagus, and most mediastinal nodes. Where most lung cancer nodal disease lives."),
   ("paravertebral","Paravertebral Compartment",565,600,"Yellow: along the spine. Sympathetic chain and nerve roots; neurogenic tumors arise here."),
   ("superior","Great Vessels & Trachea (Upper Mediastinum)",330,160,"The upper part of the visceral compartment: trachea, esophagus, and great vessels. In the classic scheme this is the superior mediastinum, above the sternal angle (T4-T5)."),
   ("heart","Heart & Pericardium",230,600,None),("diaphragm","Diaphragm",250,705,None)],
  "Sagittal diagram of the ITMIG mediastinal compartments: prevascular (pink), visceral (blue), paravertebral (yellow). Source: Zhao M et al., Front Oncol 2026 (PMC13056659), Fig. 1, CC BY 4.0.")
plate("th-img-nodes","thoracic","th-img-nodes.jpg","mednodes",(20,20,722,470),
  lambda im: inpaint(fill(im,[(343,220,398,252),(474,178,545,208),(474,220,550,252)]),rects=[(398,222,418,250),(458,180,474,206),(458,222,474,250)],radius=4),BL,
  [("n4l","Enlarged 4L Node",428,238,"Left lower paratracheal node. On CT, a short axis over 1 cm is suspicious, but CT alone misses many involved nodes and overcalls others. Ipsilateral for a left tumor = N2."),
   ("n5","AP Window (5) Node",455,240,None),("n6","Para-Aortic (6) Node",452,192,"Lateral to the aortic arch. For a left upper lobe tumor this is ipsilateral N2; for a right-sided tumor it is N3."),
   ("arch","Aortic Arch",412,160,"The landmark for the AP window: station 5 sits just under the arch, lateral to the ligamentum arteriosum."),
   ("dao","Descending Aorta",412,283,"Posterior, beside the spine. Station 8 (paraesophageal) nodes lie between it and the esophagus lower down.")],
  "Axial contrast CT at the level of stations 4L, 5, and 6. Source: Arias S et al., Can Respir J 2016 (PMC5183797), Fig. 5, CC BY 4.0; arrows and labels removed.")
plate("th-img-mri-brain","thoracic","th-mri-brain.jpg","brmets",(0,0,778,845),
  lambda im: fill(im,[(566,794,762,844)]),BL,
  [("met-ring","Ring-Enhancing Metastasis",450,190,"A 3.5 cm left frontal metastasis with an enhancing rim and necrotic center. Brain mets = M1b (single) or M1c; large ones like this are resected or treated with SRS."),
   ("edema","Vasogenic Edema",430,360,None),("small-met","Second Metastasis",525,530,"A smaller ring-enhancing lesion. Contrast MRI finds lesions that CT and PET miss, and the number of lesions guides SRS vs whole-brain RT."),
   ("midline","Mass Effect / Midline Shift",320,420,None)],
  "Axial T1 post-contrast MRI: brain metastases from squamous cell lung cancer. Source: Jeon J et al., Cancers 2026 (PMC13163019), Fig. 2A, CC BY 4.0; label removed.")
plate("th-img-mri-pancoast","thoracic","th-mri-pancoast.jpg","pancoast",None,
  lambda im: cv2.inpaint(im,darkmask(im,[(78,268,166,356)],thr=35),5,cv2.INPAINT_TELEA),BL,
  [("apical-mass","Apical Mass",150,520,None),("plexus","Brachial Plexus / Superior Sulcus",165,360,"The thoracic inlet above the tumor, where the lower trunk (C8-T1) crosses the first rib. Here the fat plane is preserved: MRI is the best test for plexus invasion (T4)."),
   ("canal","Spinal Canal",285,430,"Bright CSF around the cord on T2. Tumor tracking through the neural foramina toward the canal threatens the cord."),
   ("vb","Vertebral Body",285,545,None)],
  "Coronal T2 MRI of a right superior sulcus tumor with the superior sulcus structures intact. Source: Manenti G et al., Case Rep Radiol 2013 (PMC3626318), Fig. 4, CC BY 3.0; arrow removed.")
