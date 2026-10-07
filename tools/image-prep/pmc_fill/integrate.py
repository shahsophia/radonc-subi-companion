import json,shutil,os
R="/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"; S=os.path.dirname(os.path.abspath(__file__))+"/"
plates=json.load(open(S+"plates.json"))
GAL=[ # (site, kind, group, plate_id or None, index, file, newtitle or None, caption)
("headneck","anatomy","anat-oral-cavity",None,2,"hn-g-oc-nerves.jpg",None,"Mandibular nerve branches: the lingual nerve with the submandibular ganglion in the floor of mouth, and the inferior alveolar nerve entering the mandible to exit as the mental nerve. Gray's Anatomy (1918), Fig. 778, public domain."),
("headneck","anatomy","anat-nasopharynx",None,0,"hn-g-np-endo.jpg",None,"PT = pharyngeal tubercle, TT = torus tubarius, OS = eustachian tube opening. The fossa of Rosenmüller is the recess just behind the torus. Zucca B et al., Neurosurg Rev 2026 (PMC12783318), CC BY 4.0."),
("headneck","anatomy","anat-larynx",None,1,"hn-g-lx-axial.jpg","Axial anatomy at the glottis","Thyroid and arytenoid cartilages, vocalis muscle, and cricoid lamina at the level of the true vocal folds. Montoya S et al., Insights Imaging 2019 (PMC6861408), CC BY 4.0."),
("headneck","anatomy","anat-larynx",None,2,"hn-g-lx-scope.jpg",None,"Glottic cancer of the left vocal cord with impaired cord motion. Crosetti E et al., Curr Oncol Rep 2024 (PMC11168980), CC BY 4.0."),
("headneck","anatomy","anat-lymph-by-site","hn-lymph-oral-cavity",0,"hn-g-ln-oc-ct.jpg","Axial CT: level I node","Enlarged necrotic right level I (submandibular) node. Sumawe JA, SAGE Open Med Case Rep 2026 (PMC13305278), CC BY-NC 4.0."),
("headneck","anatomy","anat-lymph-by-site","hn-lymph-oral-cavity",1,"hn-g-ln-oc-photo.jpg",None,"Ulcerative cancer of the anterior floor of mouth and mandibular gingiva (level Ia/Ib risk). Yang JY et al., J Korean Assoc Oral Maxillofac Surg 2021 (PMC8249190), CC BY-NC 4.0."),
("headneck","anatomy","anat-lymph-by-site","hn-lymph-oropharynx",0,"hn-g-ln-op-cystic.jpg",None,"Cystic metastatic level II node (arrows) deep to the sternocleidomastoid, next to the internal jugular vein. Chengazi HU, Bhatt AA, Insights Imaging 2019 (PMC6377693), CC BY 4.0."),
("breast","anatomy","anat-breast-regions",None,0,"br-g-peau.jpg",None,"Right inflammatory breast cancer: diffuse erythema and peau d'orange skin edema (T4d). Levine PH et al., Cancers 2010 (PMC3827596), CC BY 3.0."),
("breast","anatomy","anat-breast-nodes",None,1,"br-g-axilla-dissection.jpg","Cadaveric dissection: the axilla","Pectoralis major (P Maj) cut and reflected to show the pectoralis minor (P Min) and the axillary fat and nodes (arrowheads). Cocco G et al., Insights Imaging 2023 (PMC10175532), CC BY 4.0."),
("breast","anatomy","anat-breast-nodes",None,2,"br-g-lsg.jpg",None,"Planar lymphoscintigraphy and SPECT/CT sentinel node mapping for a left breast cancer, showing drainage to the axilla and beyond. Israel O et al., Eur J Nucl Med Mol Imaging 2019 (PMC6667427), CC BY 4.0."),
("breast","imaging","img-breast-mammo",None,0,"br-g-mammo-cc.jpg",None,"Irregular, spiculated high-density mass in the upper inner left breast. Razdan S et al., Cureus 2025 (PMC12791182), CC BY 4.0."),
("breast","imaging","img-breast-mri",None,2,"br-g-mri-nact.jpg",None,"Dynamic contrast MRI before (left) and after (right) neoadjuvant therapy for ER-positive, HER2-negative cancer. Matsubayashi RN, Iwakuma N, Jpn J Radiol 2026 (PMC13038685), CC BY 4.0."),
("breast","imaging","img-breast-ct",None,0,"br-g-dibh.jpg",None,"Same patient: free breathing (left, heart 3.1 cm from the chest wall) vs voluntary DIBH (right, 4.1 cm). M A et al., Cureus 2025 (PMC12579725), CC BY 4.0."),
("breast","imaging","img-breast-ct",None,1,"br-g-drr.jpg",None,"Beam's-eye view of a medial tangent: breast target (orange), heart (brown), left ventricle (yellow), LAD (blue), lung (green). Park S et al., Radiat Oncol 2021 (PMC8056628), CC BY 4.0."),
("breast","imaging","img-breast-pet",None,0,"br-g-pet-mip.jpg",None,"Right breast primary (arrow) with axillary and internal mammary nodal disease. Nyamieri D et al., Front Nucl Med 2025 (PMC12868128), CC BY 4.0."),
("breast","imaging","img-breast-pet",None,1,"br-g-bone.jpg",None,"A pitfall: bone scan uptake in the left clavicle (a) that CT and SPECT/CT (b, c) show is a fracture, not a metastasis. Suppiah S et al., Indian J Nucl Med 2023 (PMC10348494), CC BY-NC-SA 4.0."),
("thoracic","anatomy","anat-th-lung",None,2,"th-g-rml.jpg",None,"Right middle lobe collapse (arrow) silhouetting the right heart border. Sultan S et al., Cureus 2026 (PMC13170401), CC BY 4.0."),
("thoracic","anatomy","anat-th-nodes",None,0,"th-g-ebus.jpg",None,"Stations reachable by EBUS only (blue), EUS-B only (light blue), or both (green). The clot and tumor labels come from the authors' case. Biondini D et al., Diagnostics 2023 (PMC10417616), CC BY 4.0."),
("thoracic","anatomy","anat-th-nodes",None,1,"th-g-pet7.jpg",None,"FDG-avid subcarinal (station 7) node on fused PET/CT. Khosa J, Cho RJ, Diagnostics 2026 (PMC13206069), CC BY 4.0."),
("thoracic","imaging","img-th-ct-levels",None,2,"th-g-sagittal-ct.jpg","Sagittal CT: ITMIG compartments","Prevascular (orange), visceral (green), and paravertebral (purple) compartments. Ahuja J et al., Diagnostics 2023 (PMC10606219), CC BY 4.0."),
]
data={}
def D(site,kind):
    k=(site,kind)
    if k not in data: data[k]=json.load(open(R+f"src/data/{kind}/{site}.json"))
    return data[k]
n=0
for site,kind,grp,pid,i,f,title,cap in GAL:
    g=D(site,kind)[grp]
    lst=next(p for p in g["plates"] if p["id"]==pid)["gallery"] if pid else g["gallery"]
    it=lst[i]; assert not it.get("image"),(grp,i)
    it["image"]=f"images/{site}/{f}"; it["caption"]=cap
    if title: it["title"]=title
    shutil.copy(S+"out/"+f,R+f"src/images/{site}/{f}"); n+=1
for pid,r in plates.items():
    site=r["site"]; found=False
    for kind in ("anatomy","imaging"):
        for g in D(site,kind).values():
            for p in g["plates"]:
                if p["id"]!=pid: continue
                old={h["id"]:h for h in p["hotspots"]}
                hs=[]
                for h in r["hs"]:
                    b=h["blurb"] or old[h["id"]]["blurb"]
                    hs.append(dict(id=h["id"],label=h["label"],x=h["x"],y=h["y"],blurb=b))
                p["hotspots"]=hs; p["caption"]=r["caption"]; p["image"]=f"images/{site}/{r['out']}"
                if r["title"]: p["title"]=r["title"]
                found=True
    assert found,pid
    shutil.copy(S+"out/"+r["out"],R+f"src/images/{site}/{r['out']}"); n+=1
for (site,kind),d in data.items():
    p=R+f"src/data/{kind}/{site}.json"; ind=len(open(p).read().split("\n")[1])-len(open(p).read().split("\n")[1].lstrip()); open(p,"w").write(json.dumps(d,indent=ind,ensure_ascii=False)+"\n")
print("filled",n)
