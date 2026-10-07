#!/usr/bin/env python3
"""
Rewrites the High-Yield Summary box at the end of every disease-site doc
section. Style (per Sophia, Oct 2026): 4-5 bullets, full sentences, no arrows,
no bolding, no incidence/frequency stats. These are the essentials a student
could read alone before clinic.

Usage:  python3 tools/hy_summaries.py   (then python3 build.py)
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HY = {
"breast": {
"Epidemiology & Risk Factors": [
 "In practice, breast cancer falls into three groups by ER/PR and HER2: HR-positive/HER2-negative, HER2-positive, and triple-negative, and the group decides the systemic therapy.",
 "HER2-positive and triple-negative cancers are more aggressive but respond best to neoadjuvant systemic therapy.",
 "Invasive lobular carcinoma loses E-cadherin, grows in single-file lines, and is often multicentric and subtle on a mammogram.",
 "The key risk factors are longer estrogen exposure, a family history or germline variant, chest radiation at a young age, prior atypia, DCIS, or LCIS, and alcohol and postmenopausal obesity.",
 "BRCA status alone does not rule out radiation, but Li-Fraumeni (TP53) patients should avoid it when a reasonable alternative exists.",
],
"Anatomy & Lymphatics": [
 "The upper outer quadrant is the most common tumor location, and medial or central tumors can also drain to the internal mammary nodes.",
 "The pectoralis minor defines the axillary levels: level I is lateral to it, level II is behind it, and level III is medial to it.",
 "Infraclavicular nodes are N3a, internal mammary plus axillary nodes are N3b, and supraclavicular nodes are N3c, but all of these are regional and still curable.",
 "A breast plan starts with the breast or chest wall and adds nodal basins outward: levels I and II, then level III and the supraclavicular fossa, then the internal mammary nodes.",
 "Each added basin brings an organ at risk: the internal mammary nodes bring the heart, the supraclavicular field brings the brachial plexus, and a treated axilla raises lymphedema risk.",
],
"Imaging": [
 "The mammogram finds the cancer: a spiculated mass, pleomorphic or linear calcifications, or architectural distortion is suspicious, and BI-RADS 4 or 5 means biopsy.",
 "Ultrasound characterizes a mass, guides the biopsy, and checks the axilla, and a biopsied positive node gets a clip so it can be found after neoadjuvant therapy.",
 "MRI is the most sensitive test and is used for high-risk screening, extent of disease (especially lobular cancer), response to neoadjuvant therapy, and an occult primary.",
 "On the planning CT, find the lumpectomy cavity and clips, the breast or chest wall, the nodal regions, and the heart and lung that limit the plan.",
 "Deep inspiration breath hold moves the heart away from the chest wall and lowers heart dose for many left-sided patients.",
],
"Workup & Staging": [
 "Workup is a diagnostic mammogram and ultrasound, a core biopsy with a clip, ER/PR/HER2 and grade, and an exam of the axilla and supraclavicular nodes.",
 "Systemic staging imaging is for higher-risk or locally advanced disease, or for symptoms or findings that suggest metastases.",
 "T stage breaks at 2 cm and 5 cm, and clinical N1 is movable axillary nodes, N2 is fixed axillary or internal mammary nodes alone, and N3 is infraclavicular, internal mammary plus axillary, or supraclavicular nodes.",
 "After neoadjuvant therapy the patient has both a clinical stage and a ypT/ypN stage, and the initial clinical stage still matters for radiation decisions.",
 "Prognostic stage adds grade, ER, PR, and HER2 to predict outlook, but radiation fields follow the anatomic extent of disease, not the prognostic stage alone.",
],
"Treatment Paradigms": [
 "Every breast radiation decision starts with what operation the patient had and how much risk remains in the breast, chest wall, and nodes.",
 "After lumpectomy the breast gets whole-breast RT (40 Gy in 15 fractions or 26 Gy in 5), with a boost when local recurrence risk is higher, such as young age or high grade.",
 "Z0011 means 1 to 2 positive sentinel nodes can skip an axillary dissection, while the decision to treat the regional nodes is a separate question based on nodal burden, biology, and location.",
 "After mastectomy, RT treats the chest wall and nodes for T4 disease, 4 or more positive nodes, T3 with positive nodes, or a positive margin, and is strongly considered for 1 to 3 nodes.",
 "After neoadjuvant therapy, radiation is planned from both the stage at diagnosis and the response, and locally advanced disease gets comprehensive RT even after a complete response.",
],
},
"cns": {
"Tumor Biology & Risk Factors": [
 "The first question for any CNS lesion is whether it started in the CNS or spread there, because primary tumors and metastases follow different workups.",
 "Brain metastases are the most common intracranial tumor, meningioma is the most common primary tumor, and glioblastoma is the most common malignant primary.",
 "Prior radiation is the only established environmental risk factor, and immunosuppression raises the risk of primary CNS lymphoma.",
 "Adult diffuse gliomas are classified by IDH and 1p/19q status, and an IDH-wildtype tumor is called glioblastoma only when it meets specific criteria.",
 "MGMT promoter methylation is prognostic and associated with greater benefit from temozolomide, although that link is not absolute.",
],
"Neuroanatomy": [
 "Localize a lesion from its symptoms by lobe, remembering that the cerebellum controls the same side and brainstem lesions cause crossed signs.",
 "Intra-axial tumors grow inside the brain and extra-axial tumors grow from its coverings or nerves, which narrows the differential quickly.",
 "A posterior fossa mass can block CSF flow and cause obstructive hydrocephalus, and tumors that seed the CSF put the whole brain and spine at risk.",
 "Skull base tumors sit next to the optic chiasm, cavernous sinus nerves, cochlea, and brainstem, which is why they are hard to remove and carefully planned.",
 "Each organ at risk protects a function: the optic apparatus protects vision, the cochlea hearing, the hippocampus memory, and the pituitary hormones.",
],
"Imaging": [
 "MRI with contrast answers where the lesion is, what it looks like, and how many there are, while CT shows blood, bone, calcium, and hydrocephalus.",
 "T1 post-contrast shows enhancing tumor and T2/FLAIR shows edema and infiltrating tumor.",
 "Enhancement means a broken blood-brain barrier, not necessarily viable tumor.",
 "Pseudoprogression appears early after chemoradiation, while radionecrosis appears months to years later, and both can look like progression.",
 "The planning CT is fused with the MRI so the target drawn on the MRI can be used to calculate dose.",
],
"Workup & Decision-Making": [
 "Adult CNS tumors have no TNM stage, so ask what the tumor is, where it is and how big it is, and how the patient is doing.",
 "Primary tumors, brain metastases, and spine metastases follow three different workflows, so decide which one you are in first.",
 "For primary tumors, tissue gives the integrated diagnosis from histology plus molecular markers such as IDH, 1p/19q, and MGMT.",
 "For brain metastases, lesion number matters, but total volume, location, symptoms, performance status, and systemic disease also shape the plan.",
 "For spine metastases, neurologic status, Bilsky compression, SINS stability, and tumor radiosensitivity decide between surgery and radiation.",
],
"Treatment Paradigms": [
 "Symptomatic or large brain metastases need prompt local therapy, often surgery followed by SRS to the cavity.",
 "SRS alone is preferred for many patients with limited, safely treatable brain metastases, and whole-brain RT is not routinely added.",
 "Extensive brain metastases with a reasonable prognosis get hippocampal-avoidance whole-brain RT with memantine, while a poor prognosis may call for supportive care instead.",
 "Glioblastoma is treated with maximal safe resection followed by RT with concurrent and adjuvant temozolomide, with shorter courses for older or frail patients.",
 "Meningiomas and other benign tumors are observed, removed, or treated with radiation when they cannot be safely removed, and spinal cord compression gets steroids plus surgery and RT or urgent RT alone.",
],
"Radiation Planning & Toxicity": [
 "Every CNS plan fuses the MRI to a planning CT, defines the target, identifies the nearby organs at risk, and chooses a technique.",
 "Small focal targets get SRS, infiltrative tumors get fractionated RT, diffuse intracranial disease gets whole-brain RT, and CSF spread gets craniospinal RT.",
 "A glioma plan includes a CTV for microscopic infiltration, while an intact metastasis treated with SRS usually does not.",
 "Fractionation protects nearby nerves, which is why tumors close to the optic chiasm are treated over several weeks.",
 "Late effects include radionecrosis, cognitive decline, hypopituitarism, and hearing or vision loss, and symptomatic radionecrosis is treated first with steroids.",
],
},
"gi": {
"Epidemiology & Risk Factors": [
 "Esophageal squamous cell carcinoma is in the upper or mid esophagus and linked to smoking and alcohol, while adenocarcinoma is distal or at the GEJ and linked to Barrett's, obesity, and GERD.",
 "Pancreatic cancer classically presents with painless jaundice or new diabetes with weight loss, and smoking is the main modifiable risk factor.",
 "Rectal cancer is an adenocarcinoma with surgery as the backbone of treatment, and Lynch syndrome (MSI-high) tumors respond to immunotherapy.",
 "Anal cancer is a squamous cancer driven by HPV, with higher risk in HIV, and chemoradiation cures most patients without surgery.",
 "Hepatocellular carcinoma arises in cirrhotic livers (hepatitis B or C, alcohol, fatty liver), so patients with cirrhosis are screened every 6 months.",
],
"Anatomy & Lymphatics": [
 "The esophagus is described by distance from the incisors, with the GEJ at about 40 cm, and because it has no serosa and spreads along its length, RT fields use long margins.",
 "Rectal tumors are called low, mid, or upper by distance from the anal verge, and the mesorectal fascia is the surgical (TME) plane.",
 "The dentate line splits anal drainage, so tumors below it drain to the inguinal nodes.",
 "Inguinal and external iliac nodes are regional for anal cancer but distant (M1) for rectal cancer.",
 "Pancreatic resectability depends on the SMA, celiac axis, common hepatic artery, and SMV/portal vein, so learn where each one sits.",
],
"Imaging": [
 "Rectal MRI is the key staging test because it shows T stage, the distance to the mesorectal fascia (1 mm or less is threatened), EMVI, and involved nodes.",
 "Pancreatic-protocol CT shows the mass and how much it touches the major vessels, which decides resectability.",
 "Esophageal cancer is staged with EUS for depth of invasion and PET/CT for nodes and metastases.",
 "Anal cancer response is judged up to 26 weeks after chemoradiation, because tumors keep shrinking for months.",
 "HCC can be diagnosed on multiphase CT or MRI without a biopsy when it shows arterial enhancement with washout (LI-RADS 5).",
],
"Workup & Staging": [
 "Across most GI sites, T stage is depth through the wall, N stage is the number of involved nodes, and M is distant spread, but anal cancer uses tumor size for T and node location for N.",
 "Pancreatic cancer is treated by resectability, based on how much the tumor touches the SMA, celiac axis, hepatic artery, and SMV/portal vein on pancreatic-protocol CT.",
 "HCC is staged with BCLC, which combines tumor burden, liver function (Child-Pugh), and performance status and points to a treatment.",
 "Positive peritoneal cytology is M1 in stomach cancer, which is why laparoscopy with washings comes before curative surgery.",
 "Rectal cancer with T4 disease, a threatened mesorectal fascia, EMVI, N2, or lateral nodes is high risk and gets total neoadjuvant therapy, and dMMR tumors get immunotherapy first.",
],
"Treatment Paradigms": [
 "Anal cancer gets definitive chemoradiation with 5-FU (or capecitabine) and mitomycin, always including the groins, with surgery saved for salvage.",
 "Locally advanced rectal cancer gets total neoadjuvant therapy (short-course or long-course RT plus chemo), then TME surgery or watch-and-wait after a complete response, and dMMR tumors get immunotherapy.",
 "Locally advanced esophageal cancer gets chemoradiation to 41.4 Gy followed by surgery (CROSS), or definitive chemoradiation to 50 to 50.4 Gy for squamous cancers or unfit patients.",
 "Pancreatic cancer treatment is driven by chemo, with RT used selectively for borderline resectable or locally advanced disease.",
 "Liver SBRT is an option for HCC that can't be resected or ablated, in patients with good liver function (Child-Pugh A to B7).",
],
},
"gyn": {
"Epidemiology & Risk Factors": [
 "Cervical cancer is caused by HPV, presents with abnormal or postcoital bleeding, and when locally advanced is usually treated with definitive chemoradiation plus brachytherapy.",
 "Endometrioid endometrial cancer is driven by obesity and unopposed estrogen, but serous and p53-abnormal tumors are not estrogen-driven and behave more aggressively.",
 "Endometrial cancer usually presents early with postmenopausal bleeding, so surgery is the foundation and radiation or systemic therapy is added based on recurrence risk.",
 "The endometrial molecular groups (POLE-mutated, MMR-deficient, p53-abnormal, and no specific profile) increasingly change the recurrence-risk assessment and the choice of adjuvant therapy.",
 "Vulvar cancer comes from HPV in younger women or lichen sclerosus in older women, and the lichen sclerosus type has a worse prognosis.",
],
"Anatomy & Lymphatics": [
 "The uterus has a fundus, body, and cervix, and endometrial cancer starts in the lining and grows outward through the muscle wall.",
 "Cervical cancer starts at the transformation zone, where the glandular cells of the canal meet the squamous cells of the outer cervix.",
 "The cardinal ligaments and parametria run from the cervix to the pelvic side wall and carry the uterine artery, the ureter, and lymphatics, so tumor spreading sideways can block the ureter.",
 "The upper two-thirds of the vagina drain to the pelvic nodes, while the lower third drains to the groins like the vulva.",
 "Cervical and endometrial cancers drain mainly along pelvic and para-aortic pathways, while vulvar cancer spreads to the groins first and pelvic nodes count as distant.",
],
"Imaging": [
 "MRI answers where the tumor is locally, PET/CT answers where it has spread, and CT simulation answers how to treat it safely.",
 "On T2 MRI, an intact dark cervical stromal ring means the tumor is still contained, and tumor crossing that ring means parametrial invasion.",
 "For endometrial cancer, MRI shows the depth of myometrial invasion and whether the cervical stroma is involved.",
 "PET changes the radiation map: a positive pelvic node gets a boost, a para-aortic node means an extended field, and distant disease can change the treatment intent.",
 "For cervical brachytherapy, an MRI or CT with the applicator in place is used to contour the residual tumor and the bladder, rectum, and sigmoid, then cover the tumor while respecting those organs.",
],
"Workup & Staging": [
 "Stage any GYN cancer by identifying the organ, then the local extent, nodes, and distant disease, and only then applying that site's FIGO system.",
 "A positive regional node makes a cervical, endometrial, vulvar, or vaginal cancer at least stage III, no matter how small the primary tumor is.",
 "Cervix and vagina are staged clinically with exam and imaging, while endometrium and vulva are staged surgically from the specimen.",
 "In the cervix, depth cutoffs are 3 and 5 mm and size cutoffs are 2 and 4 cm; parametria is IIB, lower vagina IIIA, side wall or hydronephrosis IIIB, and nodes IIIC.",
 "Modern FIGO endometrial staging adds histology, LVSI, and molecular group to the older anatomic stages, so the 2009 IA and IB system is the backbone, not the complete picture.",
],
"Treatment Paradigms": [
 "Choose the definitive local treatment that avoids unnecessary multimodality toxicity, and add adjuvant RT or chemoradiation after surgery only when the pathology warrants it.",
 "Locally advanced cervical cancer gets pelvic EBRT with concurrent cisplatin plus brachytherapy, and brachytherapy is essential because it puts a high dose into the cervix with rapid falloff.",
 "After radical hysterectomy, intermediate-risk pathology (Sedlis) leads to pelvic RT, and positive nodes, margins, or parametria (Peters) lead to chemoradiation.",
 "Endometrial cancer radiation is decided after surgery by recurrence risk: observation, vaginal brachytherapy, pelvic EBRT, or systemic therapy with or without RT, adjusted by molecular group.",
 "Vulvar cancer drains to the groins, gets excision with groin staging, adjuvant groin and pelvic RT for adverse nodes, and definitive chemoradiation when surgery would be mutilating.",
],
},
"headneck": {
"Epidemiology & Risk Factors": [
 "Start with the subsite, because it predicts the cause, the pattern of spread, the staging system, and the treatment.",
 "Oral cavity, larynx, and hypopharynx cancers are driven by tobacco and alcohol, and resectable oral cavity cancer usually goes to surgery first.",
 "Oropharyngeal cancer is now two diseases: HPV-positive (younger, lighter smokers, better prognosis) and HPV-negative (older, heavy smokers and drinkers).",
 "p16 staining is the clinical surrogate for HPV, and it decides which staging system an oropharynx cancer uses.",
 "Nasopharyngeal carcinoma is driven by EBV, sits under the skull base, spreads to nodes on both sides early, and is treated mainly with radiation.",
],
"Anatomy": [
 "The circumvallate papillae divide the oral tongue (oral cavity, surgery first) from the base of tongue (oropharynx, often HPV-driven).",
 "The nasopharynx sits under the skull base and most cancers start in the fossa of Rosenm&uuml;ller, so a one-sided ear effusion or a cranial nerve palsy is a red flag.",
 "The glottis has almost no lymphatics, so early glottic cancer is treated without the neck, while supraglottic cancer is not.",
 "Local spread maps to stage: a fixed cord or paraglottic invasion is T3 in the larynx, trismus from the masticator space is T4b in the oral cavity, and a cranial nerve palsy is T4 in the nasopharynx.",
 "On a planning CT, you should be able to find the mandible, parotids, submandibular glands, constrictors, larynx, spinal cord, brainstem, carotids, thyroid, and brachial plexus.",
],
"Lymph Nodes": [
 "The hyoid separates level II from III, the cricoid separates III from IV, and the clavicle is the bottom of IV.",
 "Lymph spreads in a predictable order by site: oral cavity to I, II, and III; oropharynx to II, III, IV, and the retropharyngeal nodes; nasopharynx to the retropharyngeal nodes, II, and V on both sides.",
 "Levels II to IV are common parts of elective neck treatment, but the exact volume depends on the site, its extent, the involved nodes, and the risk of occult disease.",
 "Midline primaries and bilateral nodes get both sides of the neck treated, while a well-lateralized tonsil cancer can often be treated on one side.",
 "Gross nodes (GTVn) get the full dose, elective levels at risk for microscopic disease get a lower dose, and the PTV adds a margin for setup.",
],
"Imaging": [
 "Pick the scan by the question: CT or MRI for the primary, CT especially for bone and cartilage, MRI for skull base and perineural spread, and PET/CT for occult nodes, distant disease, and response after treatment.",
 "Read every scan in the same order: the primary, the structures next to it, the nodes, distant disease, and what it all means for treatment.",
 "A suspicious node is larger than 10 mm in short axis, has lost its fatty hilum, or is cystic or necrotic.",
 "A cystic level II node with a small or hidden primary is a classic HPV-positive oropharynx presentation.",
 "In the larynx, inner thyroid cartilage invasion is T3 and outer cortex breakthrough or cricoid invasion is T4a.",
],
"Workup & Staging": [
 "The workup runs from exam and scope to biopsy with p16 when needed, imaging, pathology, a functional assessment with dental evaluation, staging, and a tumor board decision.",
 "For non-HPV sites, N1 is a single ipsilateral node 3 cm or less, N2 is larger, multiple, or bilateral nodes, and N3 is a node over 6 cm or clinically obvious ENE.",
 "In the oral cavity, depth of invasion drives T-stage, with cutoffs at 5 mm and 10 mm.",
 "In the oropharynx, check p16 first, and in the nasopharynx, T-stage follows where the tumor spread and N-stage follows side and height.",
 "Stage is not treatment: the plan depends on the stage plus the site, resectability, function, pathology, and the patient.",
],
"Treatment Paradigms": [
 "Ask four questions for every patient: where is the primary, is it resectable, what are the adverse features after surgery, and what does the radiation need to treat.",
 "After surgery, adverse features such as pT3 to T4, multiple nodes, PNI, LVSI, or a close margin call for radiation to about 60 Gy, and a positive margin or ENE adds concurrent cisplatin.",
 "Definitive treatment is about 70 Gy in 35 fractions to gross disease, with lower doses to high-risk and elective volumes, while sparing the parotids, constrictors, mandible, cord, and brainstem.",
 "Early oropharynx cancer can be treated with TORS or radiation, and the team should avoid triple therapy; HPV-positive disease is not de-escalated off trial.",
 "The larynx question is whether a functional larynx can be preserved, and the nasopharynx is treated with radiation and chemo because surgery has a limited role.",
],
},
"prostate": {
"Epidemiology & Risk Factors": [
 "Prostate cancer is very common but often indolent, so the goal is to find and treat the cancers that matter and leave alone the ones that don't.",
 "The risk of developing prostate cancer (age, family history, Black ancestry, germline mutations such as BRCA2) is different from the risk that a diagnosed cancer will progress, which the NCCN risk group captures.",
 "An elevated PSA is not a diagnosis: repeat it, assess risk, get a prostate MRI with or without biomarkers, and biopsy only if concerning.",
 "Screening is an individualized shared decision, started earlier for men at increased risk.",
 "Germline results matter to a radiation oncologist because they signal aggressive disease, affect family counseling, and open systemic options such as PARP inhibitors.",
],
"Anatomy & Lymphatics": [
 "Most cancers start in the posterior peripheral zone, which is why a DRE can feel them, while the transition zone is where BPH grows.",
 "Local spread runs through the capsule near the neurovascular bundles and into the seminal vesicles from the base, and each step enlarges the radiation target.",
 "The rectum is one of the principal dose-limiting organs, along with the bladder, urethra, and bowel depending on the technique and volume.",
 "Lymph drains first to the obturator and internal iliac nodes, then to the external iliac and presacral nodes, then up the common iliac chain.",
 "True pelvic nodes are N1, while common iliac, para-aortic, and inguinal nodes are distant (M1a).",
],
"Imaging": [
 "MRI looks inside the gland to find, target, and locally stage the cancer, while PSMA PET (or CT plus bone scan) looks outside the gland for nodes and bone metastases.",
 "DWI and ADC matter most for peripheral zone lesions, T2 for transition zone lesions and local extension, and PI-RADS 4 and 5 lesions get a targeted biopsy.",
 "MRI changes the biopsy and the radiation plan, but clinical T stage for risk grouping still comes from the DRE.",
 "PSMA PET is more sensitive than conventional imaging and can change the radiation targets, but a negative scan does not exclude microscopic disease.",
 "Simulation uses bladder and rectal preparation, fiducials when used, a planning CT, and MRI fusion, and daily image guidance corrects for prostate motion.",
],
"Workup & Staging": [
 "The workup goes in order: PSA and DRE, MRI, targeted plus systematic biopsy, Grade Group, clinical T stage, NCCN risk group, and staging imaging when indicated.",
 "Gleason 3+3 is Grade Group 1, 3+4 is Grade Group 2, 4+3 is Grade Group 3, a score of 8 is Grade Group 4, and 9 to 10 is Grade Group 5.",
 "Intermediate-risk features are T2b to T2c, Grade Group 2 to 3, or PSA 10 to 20, and high-risk features are T3a, Grade Group 4 to 5, or PSA over 20.",
 "The AJCC stage describes anatomic extent, while the NCCN risk group is the treatment-oriented classification, and the two are not interchangeable.",
 "Before choosing a treatment, ask whether the patient has enough life expectancy to benefit from curative therapy.",
],
"Treatment Paradigms": [
 "Risk group sets the treatment framework, and life expectancy, baseline function, anatomy, imaging, and patient preference shape the final plan.",
 "Low-risk disease is usually managed with active surveillance, favorable intermediate risk with one local treatment generally without ADT, and unfavorable intermediate risk with RT plus short-term ADT.",
 "High and very high risk gets dose-escalated RT with long-term ADT, with pelvic nodes when the estimated nodal risk is high enough.",
 "After prostatectomy, follow the PSA and give early salvage RT when it rises, even if the PSMA PET is negative.",
 "A prostate plan is built from simulation, targets, organs at risk, technique, and daily image guidance, and toxicity is experienced on top of baseline urinary and sexual function.",
],
},
"thoracic": {
"Epidemiology & Risk Factors": [
 "Lung cancer is divided into non-small cell (mainly adenocarcinoma and squamous) and small cell, a high-grade neuroendocrine cancer that spreads early and is treated very differently.",
 "Adenocarcinoma is often peripheral and is the usual type in never-smokers, while squamous and small cell cancers are often central and strongly tied to smoking.",
 "Smoking is the main risk factor, and radon is the leading cause in never-smokers.",
 "Nonsquamous NSCLC is tested for driver mutations and PD-L1, because an actionable driver often makes targeted therapy the main systemic strategy, and PD-L1 helps guide immunotherapy when there is none.",
 "Low-dose CT screening finds earlier, often peripheral tumors, so more patients can be cured with surgery or SBRT.",
],
"Anatomy & Lymphatics": [
 "Tumor location predicts both what the tumor can invade and which organs the radiation plan must protect.",
 "Peripheral tumors bring the lung and chest wall into the plan, central tumors bring the airway, esophagus, heart, and great vessels, apical tumors bring the brachial plexus and spinal cord, and lower lobe tumors move the most with breathing.",
 "Central and ultracentral tumors are defined by how close they sit to the proximal bronchial tree and mediastinal structures, and exact definitions vary by protocol.",
 "Hilar and intrapulmonary nodes (stations 10 to 14) are N1, ipsilateral mediastinal nodes (stations 2 to 9) are N2, and contralateral or supraclavicular nodes are N3, with station 7 always N2 and stations 5 and 6 on the left.",
 "If nodal status would change management, a suspicious mediastinal node needs tissue, usually by EBUS.",
],
"Imaging": [
 "Each scan answers one question: CT asks whether a lesion is cancer and where it is, PET/CT asks about nodes and distant disease, brain MRI looks for brain metastases, and 4D-CT shows how the tumor moves.",
 "A suspicious nodule is growing, spiculated, larger, part-solid, or in an upper lobe, and in a part-solid nodule the solid part sets the T stage.",
 "PET finds suspicious nodes, but a PET-positive node that would change treatment needs tissue, because infection and sarcoid can light up too.",
 "Thoracic radiation has to cover where the tumor will be throughout the breathing cycle, so the GTV from each phase of the 4D-CT is combined into an ITV, and a setup margin makes the PTV.",
 "Fibrosis after SBRT is expected, while a new or growing mass-like opacity, a bulging margin, or lost air bronchograms raise concern for recurrence and may prompt PET/CT or biopsy.",
],
"Workup & Staging": [
 "Workup is a tissue diagnosis with molecular testing, CT chest and upper abdomen, PET/CT, brain MRI for stage II and above, mediastinal staging when it would change management, and PFTs.",
 "In T staging, size matters, but invasion of the chest wall, mediastinum, or other structures can upstage a small tumor.",
 "The N stage most often changes treatment: N0 disease gets local therapy, N1 disease gets multimodality therapy, and N2 or N3 disease changes both the local and systemic strategy.",
 "Stage, resectability, and operability are different questions, and a multidisciplinary tumor board decides between surgery-based treatment and definitive chemoradiation.",
 "Small cell lung cancer is staged as limited (fits in one tolerable radiation field) or extensive.",
],
"Treatment Paradigms": [
 "Early-stage, node-negative NSCLC gets surgery if it is resectable and the patient is operable, and SBRT is a standard curative option for medically inoperable patients or those who decline surgery.",
 "SBRT fractionation is adjusted to location, with more fractions as the tumor gets closer to the chest wall, airway, esophagus, and great vessels.",
 "Unresectable stage III NSCLC gets 60 Gy in 30 fractions with concurrent chemo, followed by consolidation durvalumab, or osimertinib if EGFR-mutant.",
 "NSCLC radiation treats the primary and involved nodes without routine elective nodal irradiation, while protecting the lungs, esophagus, heart, spinal cord, and brachial plexus.",
 "Limited-stage small cell gets platinum and etoposide with early concurrent thoracic radiation, consolidation immunotherapy, and a brain plan, while extensive stage starts with chemo-immunotherapy.",
],
},
}

PEARL = re.compile(r"<div class=['\"]pearl(?: hy-summary)?['\"]>\s*<strong>High-Yield Summary</strong>\s*<ul[^>]*>.*?</ul>\s*</div>", re.S)

def block(items):
    lis = "\n".join(f"<li>{t}</li>" for t in items)
    return f"<div class='pearl hy-summary'>\n<strong>High-Yield Summary</strong>\n<ul style='margin-bottom:0;'>\n{lis}\n</ul>\n</div>"

for site, sections in HY.items():
    p = os.path.join(ROOT, "src", "data", "docs", site + ".json")
    d = json.load(open(p, encoding="utf8"))
    for cat, items in sections.items():
        assert 4 <= len(items) <= 5, (site, cat)
        assert not any(("&rarr;" in t or "<strong>" in t or "—" in t) for t in items), (site, cat)
        html = d[cat]["html"]
        new, n = PEARL.subn(lambda m: block(items), html)
        assert n == 1, (site, cat, n)
        d[cat]["html"] = new
    with open(p, "w", encoding="utf8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    print(site, "updated", len(sections), "summaries")
