# Image Audit (October 2026)

Implementation audit for the repository, not shown on the site. Every plate, gallery item, doc figure, and placeholder was classified as KEEP, REMOVE, or REPLACE. The script that applied the data changes is `tools/image-prep/image_audit_2026_10.py`.

## Changes

| Image / ID | Disease site | Current purpose | Decision | Reason |
|---|---|---|---|---|
| br-ct-sim | Breast | Imaging plate: planning CT | REPLACE | Schematic placeholder. Now a real right-breast planning CT with tumor bed, CTV, PTV, and OAR contours (text labels removed). |
| br-nodes-ct | Breast | Anatomy plate: nodal contours | REMOVE | Schematic placeholder with no image. Nodal basins and axillary levels are already taught by two plates; a real nodal-CTV CT now sits in the gallery. |
| RTOG / ESTRO contouring atlas slice | Breast | Anatomy gallery | REPLACE | Empty gallery slot. Replaced with a real planning CT showing IMN, chest wall, axillary, SCV, and ICF volumes (Yu PC et al. 2018). |
| Ultrasound of an axillary node | Breast | Imaging gallery | REMOVE | Node, cortex, and hilum cannot be made out at gallery size; text covers the criteria. |
| br-mammo-mlo | Breast | Imaging plate: mammogram | KEEP | Strong image. Padded to 4:3 so its existing hotspots land on the breast (two markers were sitting on black). |
| gyn-mri-cx-ax | GYN | Imaging plate: parametria | REPLACE | Schematic placeholder. Now a real axial T2 with right parametrial invasion (arrow removed). |
| gyn-mri-endo | GYN | Imaging plate: myometrial invasion | REPLACE | Schematic placeholder. Now real sagittal T2 plus DWI of deep myometrial invasion. |
| gyn-brachy-mri | GYN | Imaging plate: brachytherapy MRI | REPLACE | Schematic placeholder. Now a real para-sagittal T2 with tandem and ring, HR-CTV, bladder, and rectum contoured. |
| sag-spine | CNS | Imaging plate: spinal cord | REPLACE | Schematic placeholder. Reuses the existing real cord-compression MRI with new hotspots. |
| MRI Spine: Cord Compression | CNS | Imaging gallery | REMOVE | Redundant: the same image now drives the sagittal spine plate on the same page. |
| hn-oc-pet | Head & Neck | Imaging plate: oral cavity PET | REPLACE | Schematic placeholder. Now real staging PET/CT and matching CT for a T4aN2b buccal cancer (arrows removed). |
| Nerves of the neck (doc figure) | Head & Neck | Anatomy reading figure | REPLACE | Placeholder in the Anatomy reading. Now Gray's Anatomy Fig. 794 (public domain). |
| hn-larynx | Head & Neck | Anatomy plate: laryngoscopic view | KEEP | Considered replacing. Open-access laryngoscopy photos found were frothy or blurry and no clearer for labeling structures than the drawing. |
| hn-nasopharynx | Head & Neck | Anatomy plate: nasopharynx close-up | KEEP | Considered replacing. A midline sagittal MRI cannot show the torus, fossa of Rosenmuller, or eustachian orifice that this plate teaches. |
| pr-mri-t2 | Prostate | Imaging plate: axial T2 | KEEP | Considered replacing (pr-mri-t2b.jpg). Candidates found were no clearer; the Imaging reading already has a T2 plus ADC PI-RADS 5 figure. |
| th-img-4dct | Thoracic | Imaging plate: planning CT | REPLACE | Schematic placeholder. Now a real lung SBRT planning CT with ITV, PTV, isodoses, and OARs. |
| gyn-c-igabt.jpg | GYN | Case figure: CT-based brachy plan | KEEP | Useful plan image; trimmed slivers of the next figure row along the bottom edge. |
| th-img-postsbrt | Thoracic | Imaging plate: post-SBRT CT | REPLACE | Schematic placeholder. Now a real 4-year CT series of mass-like fibrosis after SBRT. |
| Endoscopic view of base of tongue | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| Axial CT at the hyoid | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| Contouring atlas slice | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| Axial CT: retropharyngeal node | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| Axial CT: level VI | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| Laryngoscopy | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| Axial MRI: retropharyngeal node | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| Axial CT: level V node | Head & Neck | Anatomy gallery | REMOVE | Empty placeholder slot with no image; the plate above it already teaches the concept. |
| br-g-us-node.jpg | br | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| cns-anat-optic.jpg | cns | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| cns-g-territories.jpg | cns | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| hn-g-lx-coronal.jpg | hn | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| pr-g-plan-ct.jpg | pr | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| pr-g-zonal.jpg | pr | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| pr-mri-dwi.jpg | pr | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| pr-mri-t2.jpg | pr | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| pr-zones.jpg | pr | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |
| th-g-nerves.jpg | th | Unreferenced file | REMOVE | Not used by any page; deleted from src/images. |

## Everything else: KEEP

All remaining slots were kept: real or clearly drawn, sourced, readable at display size, and teaching a distinct point. Drawings reused across several drainage plates (H&N neck levels, GYN nodal map) are intentional, since each plate carries its own hotspots.

| Image / ID | Disease site | Current purpose | Decision | Reason |
|---|---|---|---|---|
| br-sagittal.jpg | breast | anatomy plate: Breast Side View (Sagittal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| br-tdlu.jpg | breast | anatomy plate: Duct & Lobule (TDLU) | KEEP | Clean anatomy drawing that carries the hotspots. |
| br-g-peau.jpg | breast | anatomy gallery: Clinical photo: peau d'orange | KEEP | Clinical photo or drawing with a distinct teaching point. |
| br-g-idc.jpg | breast | anatomy gallery: Histology: IDC | KEEP | Clinical photo or drawing with a distinct teaching point. |
| br-g-ilc.jpg | breast | anatomy gallery: Histology: ILC | KEEP | Clinical photo or drawing with a distinct teaching point. |
| br-nodal-basins.jpg | breast | anatomy plate: Regional Nodal Basins | KEEP | Clean anatomy drawing that carries the hotspots. |
| br-axillary-levels.jpg | breast | anatomy plate: Axillary Levels I-III | KEEP | Clean anatomy drawing that carries the hotspots. |
| br-g-axilla-dissection.jpg | breast | anatomy gallery: Cadaveric dissection: the axilla | KEEP | Clinical photo or drawing with a distinct teaching point. |
| br-g-lsg.jpg | breast | anatomy gallery: Lymphoscintigraphy | KEEP | Clinical photo or drawing with a distinct teaching point. |
| cns-lobes.jpg | cns | anatomy plate: Lobes & Functional Areas (Lateral) | KEEP | Clean anatomy drawing that carries the hotspots. |
| cns-anat-midline.jpg | cns | anatomy plate: Midline Structures (Sagittal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| cns-anat-inferior.jpg | cns | anatomy plate: The Underside: Cranial Nerves | KEEP | Clean anatomy drawing that carries the hotspots. |
| cns-g-homunculus.jpg | cns | anatomy gallery: Homunculus | KEEP | Clinical photo or drawing with a distinct teaching point. |
| cns-anat-coronal.jpg | cns | anatomy plate: Deep Structures (Coronal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| cns-ventricles.jpg | cns | anatomy plate: Ventricles & CSF Flow | KEEP | Clean anatomy drawing that carries the hotspots. |
| cns-anat-tentorium.jpg | cns | anatomy plate: Compartments: Above and Below the Tentorium | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-esoph.jpg | gi | anatomy plate: Esophagus: Segments by Distance | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-stomach.jpg | gi | anatomy plate: Stomach & GEJ Regions | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-pancreas.jpg | gi | anatomy plate: Pancreas & Its Vessels (Posterior View) | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-liver.jpg | gi | anatomy plate: Liver: Lobes & Vessels | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-rectum.jpg | gi | anatomy plate: Rectum & Anal Canal | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-g-barrett.jpg | gi | anatomy gallery: Endoscopy: Barrett's | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-g-couinaud.jpg | gi | anatomy gallery: Couinaud segments | KEEP | Clinical photo or drawing with a distinct teaching point. |
| gi-nodes-esoph.jpg | gi | anatomy plate: Esophagus & Stomach Nodes | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-nodes-pancreas.jpg | gi | anatomy plate: Pancreas Nodes | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-nodes-pelvis.jpg | gi | anatomy plate: Rectal & Anal Nodes | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-sagittal.jpg | gyn | anatomy plate: Female Pelvis (Sagittal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-uterus.jpg | gyn | anatomy plate: Uterus, Cervix & Adnexa (Coronal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-vagina.jpg | gyn | anatomy plate: The Vagina: Thirds & Walls | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-vulva.jpg | gyn | anatomy plate: Vulva & Perineum | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-nodes-map.jpg | gyn | anatomy plate: Pelvic & Para-aortic Nodal Map | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-groin.jpg | gyn | anatomy plate: Inguinofemoral (Groin) Nodes | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-nodes-map.jpg | gyn | anatomy plate: Cervix | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-nodes-map.jpg | gyn | anatomy plate: Endometrium | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-nodes-map.jpg | gyn | anatomy plate: Vagina | KEEP | Clean anatomy drawing that carries the hotspots. |
| gyn-nodes-map.jpg | gyn | anatomy plate: Vulva | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-oral-cavity.jpg | headneck | anatomy plate: Oral Cavity Subsites | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-g-oc-photo.jpg | headneck | anatomy gallery: Clinical photo: oral tongue | KEEP | Clinical photo or drawing with a distinct teaching point. |
| hn-g-oc-mri.jpg | headneck | anatomy gallery: Axial / coronal MRI | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-g-oc-nerves.jpg | headneck | anatomy gallery: Nerve illustration | KEEP | Clinical photo or drawing with a distinct teaching point. |
| hn-oropharynx.jpg | headneck | anatomy plate: Oropharynx Subsites | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-g-op-photo.jpg | headneck | anatomy gallery: Clinical photo: transoral view | KEEP | Clinical photo or drawing with a distinct teaching point. |
| hn-g-op-mri.jpg | headneck | anatomy gallery: Axial MRI at the tonsil level | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-nasopharynx-wide.jpg | headneck | anatomy plate: Step 1: Where Is It? | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-g-np-endo.jpg | headneck | anatomy gallery: Endoscopic view | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-g-np-mri.jpg | headneck | anatomy gallery: Axial MRI at the nasopharynx | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-g-np-skullbase.jpg | headneck | anatomy gallery: Skull base foramina diagram | KEEP | Clinical photo or drawing with a distinct teaching point. |
| hn-g-np-pet.jpg | headneck | anatomy gallery: PET/CT: nasopharyngeal primary | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-larynx-coronal.jpg | headneck | anatomy plate: Coronal View | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-g-lx-axial.jpg | headneck | anatomy gallery: Axial anatomy at the glottis | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-g-lx-scope.jpg | headneck | anatomy gallery: Laryngoscopy: vocal cord lesion | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-neck-levels.jpg | headneck | anatomy plate: Neck Levels I-VII (Overview) | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-g-ln-lateral.jpg | headneck | anatomy gallery: Lateral neck diagram | KEEP | Clinical photo or drawing with a distinct teaching point. |
| hn-g-ln-pet.jpg | headneck | anatomy gallery: PET: FDG-avid neck node | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-neck-levels.jpg | headneck | anatomy plate: Oral Cavity Drainage | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-g-ln-oc-ct.jpg | headneck | anatomy gallery: Axial CT: level I node | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-g-ln-oc-photo.jpg | headneck | anatomy gallery: Clinical photo | KEEP | Clinical photo or drawing with a distinct teaching point. |
| hn-neck-levels.jpg | headneck | anatomy plate: Oropharynx Drainage | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-g-ln-op-cystic.jpg | headneck | anatomy gallery: Axial CT: cystic level II node | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-neck-levels.jpg | headneck | anatomy plate: Larynx Drainage | KEEP | Clean anatomy drawing that carries the hotspots. |
| hn-neck-levels.jpg | headneck | anatomy plate: Nasopharynx Drainage | KEEP | Clean anatomy drawing that carries the hotspots. |
| pr-anat-zones.jpg | prostate | anatomy plate: The Zones (McNeal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| pr-anat-sagittal.jpg | prostate | anatomy plate: Sagittal View: Neighbors | KEEP | Clean anatomy drawing that carries the hotspots. |
| pr-anat-levels.jpg | prostate | anatomy plate: Base, Mid-Gland, Apex | KEEP | Clean anatomy drawing that carries the hotspots. |
| pr-nodes-map.jpg | prostate | anatomy plate: Pelvic Nodal Map (Frontal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| th-lobes.jpg | thoracic | anatomy plate: Lobes & Fissures (Frontal) | KEEP | Clean anatomy drawing that carries the hotspots. |
| th-pbt.jpg | thoracic | anatomy plate: Central vs Peripheral (SBRT Zones) | KEEP | Clean anatomy drawing that carries the hotspots. |
| th-hilum.jpg | thoracic | anatomy plate: Right Hilum (Medial View) | KEEP | Clean anatomy drawing that carries the hotspots. |
| th-g-segments.jpg | thoracic | anatomy gallery: Bronchopulmonary segments | KEEP | Clinical photo or drawing with a distinct teaching point. |
| th-g-chestwall.jpg | thoracic | anatomy gallery: Chest wall and pleura | KEEP | Clinical photo or drawing with a distinct teaching point. |
| th-g-rml.jpg | thoracic | anatomy gallery: CXR: right middle lobe collapse | KEEP | Real imaging, clear at display size, distinct finding. |
| th-iaslc.jpg | thoracic | anatomy plate: IASLC Map (Frontal View) | KEEP | Clean anatomy drawing that carries the hotspots. |
| th-g-ebus.jpg | thoracic | anatomy gallery: EBUS reach | KEEP | Clinical photo or drawing with a distinct teaching point. |
| th-g-pet7.jpg | thoracic | anatomy gallery: PET/CT: subcarinal node | KEEP | Real imaging, clear at display size, distinct finding. |
| br-us.jpg | breast | imaging plate: Breast Ultrasound | KEEP | Real imaging, clear at display size, distinct finding. |
| br-density.jpg | breast | imaging gallery: Breast density (BI-RADS A to D) | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-mammo-cc.jpg | breast | imaging gallery: Mammogram: CC view | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-calcs.jpg | breast | imaging gallery: Magnification view of calcifications | KEEP | Real imaging, clear at display size, distinct finding. |
| br-mri-dce.jpg | breast | imaging plate: Breast MRI: Contrast-Enhanced Axial | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-mri-nact.jpg | breast | imaging gallery: MRI before and after neoadjuvant chemo | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-mri-sag.jpg | breast | imaging gallery: Sagittal contrast-enhanced MRI | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-dibh.jpg | breast | imaging gallery: Free breathing vs deep inspiration breath hold (DIBH) | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-drr.jpg | breast | imaging gallery: Tangent beam's-eye view (DRR) | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-pet-mip.jpg | breast | imaging gallery: Coronal PET MIP | KEEP | Real imaging, clear at display size, distinct finding. |
| br-g-bone.jpg | breast | imaging gallery: Bone scan | KEEP | Clinical photo or drawing with a distinct teaching point. |
| cns-sagittal.jpg | cns | imaging plate: Midline Sagittal | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ax-vertex.jpg | cns | imaging plate: Level 1: Centrum Semiovale (High Convexity) | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ax-ventricles.jpg | cns | imaging plate: Level 2: Bodies of the Lateral Ventricles | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ax-bg.jpg | cns | imaging plate: Level 3: Basal Ganglia & Thalamus | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ax-midbrain.jpg | cns | imaging plate: Level 4: Midbrain & Suprasellar Cistern | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ax-pons.jpg | cns | imaging plate: Level 5: Pons & Cerebellopontine Angle | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ax-medulla.jpg | cns | imaging plate: Level 6: Medulla & Foramen Magnum | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-cor-sella.jpg | cns | imaging plate: Coronal: Sella & Cavernous Sinus | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ax-orbit.jpg | cns | imaging plate: Axial: Orbits & Optic Pathway | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-g-hawbrt.jpg | cns | imaging gallery: HA-WBRT dose | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-g-csi.jpg | cns | imaging gallery: Craniospinal field | KEEP | Clinical photo or drawing with a distinct teaching point. |
| cns-gbm-t1c.jpg | cns | imaging gallery: Glioblastoma: T1 Post-Contrast | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-gbm-flair.jpg | cns | imaging gallery: Glioblastoma: FLAIR | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-lgg-flair.jpg | cns | imaging gallery: Low-Grade Glioma: FLAIR (Non-Enhancing) | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-mets-mri.jpg | cns | imaging gallery: Brain Metastases: T1 Post-Contrast | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-srs-plan.jpg | cns | imaging gallery: SRS Plan: Targets & Dose | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-mening.jpg | cns | imaging gallery: Meningioma: T1 Post-Contrast | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-vs.jpg | cns | imaging gallery: Vestibular Schwannoma: T1 Post-Contrast | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-pit.jpg | cns | imaging gallery: Pituitary Macroadenoma: Coronal T1 | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-ct-head.jpg | cns | imaging gallery: CT Head: What to Look For | KEEP | Real imaging, clear at display size, distinct finding. |
| cns-post-tx.jpg | cns | imaging gallery: After Treatment: Progression or Treatment Effect? | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-ax-arch.jpg | gi | imaging plate: Normal CT: Upper Chest (Aortic Arch) | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-ax-heart.jpg | gi | imaging plate: Normal CT: Mid Chest (Left Atrium) | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-eus.jpg | gi | imaging plate: EUS: Esophageal Wall Layers | KEEP | Clean anatomy drawing that carries the hotspots. |
| gi-epet.jpg | gi | imaging plate: PET/CT: Esophageal Cancer Staging | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-ax-gej.jpg | gi | imaging plate: Normal CT: GEJ / Upper Abdomen (T11-T12) | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-ax-pancreas.jpg | gi | imaging plate: Normal CT: Pancreatic Head (L1-L2) | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-pct.jpg | gi | imaging plate: Pancreatic-Protocol CT (Portal Venous Phase) | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-hcc.jpg | gi | imaging plate: Multiphase CT: Hepatocellular Carcinoma | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-ax-rectum.jpg | gi | imaging plate: Axial T2 MRI: Mid Rectum | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-rmri-ax.jpg | gi | imaging plate: Rectal MRI: Axial T2 (Perpendicular to the Tumor) | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-rmri-emvi.jpg | gi | imaging plate: Rectal MRI: EMVI, Tumor Deposits, and Nodes | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-rmri-sag.jpg | gi | imaging plate: Rectal MRI: Sagittal T2 | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-ax-anus.jpg | gi | imaging plate: Normal CT: Anal Canal & Groins | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-apet.jpg | gi | imaging plate: PET/CT: Anal Cancer | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-g-pet-inguinal.jpg | gi | imaging gallery: PET/CT: inguinal node | KEEP | Real imaging, clear at display size, distinct finding. |
| gi-g-rtog-atlas.jpg | gi | imaging gallery: RTOG anorectal atlas | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-mri-cx-sag.jpg | gyn | imaging plate: Cervix MRI: Sagittal T2 | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-nodes-ax-upper.jpg | gyn | imaging plate: Axial CT: Para-aortic & Common Iliac (L3-L5) | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-nodes-ax-lower.jpg | gyn | imaging plate: Axial CT: Pelvic Nodes (Acetabulum) | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-g-pet-paraaortic.jpg | gyn | imaging gallery: PET/CT: para-aortic node | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-g-groin-ct.jpg | gyn | imaging gallery: Groin CT | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-pet.jpg | gyn | imaging plate: PET/CT: Nodal and Distant Staging | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-ct-staging.jpg | gyn | imaging plate: CT Abdomen/Pelvis: Staging Findings | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-ct-sim.jpg | gyn | imaging plate: CT Simulation: Pelvic IMRT | KEEP | Real imaging, clear at display size, distinct finding. |
| gyn-ct-groin.jpg | gyn | imaging plate: CT Simulation: Vulva & Groins | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-oc-mri.jpg | headneck | imaging plate: Oral Cavity - MRI | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-oc-ct.jpg | headneck | imaging plate: Oral Cavity - CT | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-np-mri.jpg | headneck | imaging plate: Nasopharynx & Retropharyngeal Nodes: MRI | KEEP | Real imaging, clear at display size, distinct finding. |
| hn-lx-invasion.jpg | headneck | imaging plate: Laryngeal Cartilage Invasion - Axial CT | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-sagittal.jpg | prostate | imaging plate: MRI: Sagittal T2 (Neighbors) | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-levels.jpg | prostate | imaging plate: MRI: Coronal T2 (Base, Mid-Gland, Apex) | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-mri-sag.jpg | prostate | imaging plate: MRI: Seminal Vesicle Invasion (Axial & Coronal T2) | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-nodes-ax-high.jpg | prostate | imaging plate: Axial CT: L5-S1 (Top of Pelvic Field) | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-nodes-ax-mid.jpg | prostate | imaging plate: Axial CT: Mid-Pelvis (Iliac Vessels) | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-nodes-ax-low.jpg | prostate | imaging plate: Axial CT: Femoral Heads (Obturator Level) | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-g-psma-node.jpg | prostate | imaging gallery: PSMA PET: pelvic nodes | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-g-nodal-ctv.jpg | prostate | imaging gallery: Elective pelvic nodal CTV | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-ct-sim.jpg | prostate | imaging plate: CT Simulation: Targets & OARs | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-ct-postop.jpg | prostate | imaging plate: CT: Prostate Bed (After Prostatectomy) | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-trus-ax.jpg | prostate | imaging plate: TRUS: Transverse (Axial) View | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-trus-sag.jpg | prostate | imaging plate: TRUS: Sagittal (Longitudinal) View | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-g-postimplant.jpg | prostate | imaging gallery: Post-implant CT | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-g-template.jpg | prostate | imaging gallery: Perineal template | KEEP | Clinical photo or drawing with a distinct teaching point. |
| pr-psma-mip.jpg | prostate | imaging plate: PSMA PET: Whole-Body MIP | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-psma-bcr.jpg | prostate | imaging plate: PSMA PET/CT: Recurrence After Prostatectomy | KEEP | Real imaging, clear at display size, distinct finding. |
| pr-bone-scan.jpg | prostate | imaging plate: Bone Scan: Normal, Metastases, Superscan | KEEP | Clean anatomy drawing that carries the hotspots. |
| th-ct-greatvessels.jpg | thoracic | imaging plate: Axial: Great Vessels (T2-T3) | KEEP | Real imaging, clear at display size, distinct finding. |
| th-ct-arch.jpg | thoracic | imaging plate: Axial: Aortic Arch (T4) | KEEP | Real imaging, clear at display size, distinct finding. |
| th-ct-pa.jpg | thoracic | imaging plate: Axial: Pulmonary Arteries & Main Bronchi (T5-T6) | KEEP | Real imaging, clear at display size, distinct finding. |
| th-ct-heart.jpg | thoracic | imaging plate: Axial: Heart (T7-T8) | KEEP | Real imaging, clear at display size, distinct finding. |
| th-ct-coronal.jpg | thoracic | imaging plate: Coronal: Subcarinal Plane (IASLC Stations) | KEEP | Real imaging, clear at display size, distinct finding. |
| th-compartments.jpg | thoracic | imaging gallery: Mediastinal compartments (lateral drawing) | KEEP | Clinical photo or drawing with a distinct teaching point. |
| th-g-sagittal-ct.jpg | thoracic | imaging gallery: Sagittal CT: the same three compartments | KEEP | Real imaging, clear at display size, distinct finding. |
| th-nodes-ax-upper.jpg | thoracic | imaging plate: Axial CT: Above the Arch | KEEP | Real imaging, clear at display size, distinct finding. |
| th-nodes-ax-ap.jpg | thoracic | imaging plate: Axial CT: Azygos Arch / AP Window | KEEP | Real imaging, clear at display size, distinct finding. |
| th-nodes-ax-carina.jpg | thoracic | imaging plate: Axial CT: At & Below the Carina | KEEP | Real imaging, clear at display size, distinct finding. |
| th-iaslc.jpg | thoracic | imaging gallery: IASLC map (frontal view) | KEEP | Clinical photo or drawing with a distinct teaching point. |
| th-img-nodes.jpg | thoracic | imaging gallery: Enlarged nodes on CT (stations 4L, 5, 6) | KEEP | Real imaging, clear at display size, distinct finding. |
| th-nodule.jpg | thoracic | imaging gallery: Lung window: a spiculated nodule | KEEP | Real imaging, clear at display size, distinct finding. |
| th-g-mip.jpg | thoracic | imaging gallery: MIP of the same nodule | KEEP | Real imaging, clear at display size, distinct finding. |
| th-pet-chestwall.jpg | thoracic | imaging plate: PET/CT: Tumor Against the Chest Wall | KEEP | Real imaging, clear at display size, distinct finding. |
| th-pet-pancoast.jpg | thoracic | imaging plate: PET/CT: Superior Sulcus (Pancoast) Tumor | KEEP | Real imaging, clear at display size, distinct finding. |
| th-mri-brain.jpg | thoracic | imaging plate: MRI Brain: Metastases (T1 Post-Contrast) | KEEP | Real imaging, clear at display size, distinct finding. |
| th-mri-pancoast.jpg | thoracic | imaging plate: MRI: Superior Sulcus (Pancoast) | KEEP | Real imaging, clear at display size, distinct finding. |

Case figures (`src/data/cases/`) reuse the plate and gallery images above plus case-only photos; all were reviewed on contact sheets and kept.

## Credits still missing

These kept images have no source line in their captions and the prep scripts only record local filenames, so the original source could not be confirmed. Add credits if you know them; do not guess.

`br-g-ilc.jpg`, `br-nodal-basins.jpg`, `br-us.jpg`, `br-mri-dce.jpg`, `hn-oral-cavity.jpg`, `hn-g-oc-photo.jpg`, `hn-g-op-photo.jpg`, `hn-g-op-mri.jpg`, `hn-nasopharynx-wide.jpg`, `hn-nasopharynx.jpg`, `hn-g-np-mri.jpg`, `hn-g-np-skullbase.jpg`, `hn-g-np-pet.jpg`, `hn-larynx-coronal.jpg`, `hn-neck-levels.jpg`, `hn-g-ln-lateral.jpg`, `hn-g-ln-pet.jpg`, `th-lobes.jpg`, `th-pbt.jpg`, `th-g-segments.jpg`, `th-g-chestwall.jpg`, `th-iaslc.jpg`, `th-nodule.jpg`, `th-ct-pa.jpg`, `th-g-mip.jpg`, `th-pet-chestwall.jpg`, `th-pet-pancoast.jpg`

## Notes

- Plates render in a fixed 4:3 box and hotspots are percentages of that box, so every plate image must be padded to 4:3 before placing hotspots.
- Heaviest JPEGs were downsized to 800 px wide (hotspots are percentages, so they still line up). dist/index.html is about 15.5 MB, under the 16 MB artifact limit.
- The repository contains no em dash characters. The only matches are two guard checks in `tools/` that look for them by escape sequence.
