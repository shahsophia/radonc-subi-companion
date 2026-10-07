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
"Epidemiology & Risk Factors": [
 "Brain metastases are the most common brain tumor, meningioma is the most common primary tumor, and glioblastoma is the most common malignant primary.",
 "IDH-mutant gliomas occur in younger patients, often present with seizures, and have much longer survival than IDH-wildtype glioblastoma.",
 "The only established environmental risk factor is ionizing radiation, and immunosuppression raises the risk of primary CNS lymphoma.",
 "NF1 causes optic gliomas, NF2 causes bilateral vestibular schwannomas and meningiomas, and VHL causes hemangioblastomas.",
 "Brain tumors have no TNM staging; they are classified by WHO type and grade, driven by IDH and 1p/19q status.",
],
"Neuroanatomy": [
 "The frontal lobe controls personality and movement, the parietal lobe sensation, the temporal lobe hearing, language, and memory, the occipital lobe vision, and the cerebellum coordination on the same side.",
 "The brainstem runs from the midbrain (CN III and IV) to the pons (CN V to VIII) to the medulla (CN IX to XII), and it is one of the most important organs at risk.",
 "The tentorium divides the skull into the supratentorial space, where most adult tumors arise, and the infratentorial posterior fossa, where most childhood tumors arise.",
 "CSF flows from the lateral ventricles to the third ventricle and through the aqueduct to the fourth ventricle, so posterior fossa masses cause hydrocephalus.",
 "The spinal cord ends at L1 to L2 and the thecal sac ends at S2, which sets the bottom of a craniospinal field.",
],
"Imaging": [
 "MRI with contrast is the main test for almost every brain tumor, and CT is used for bleeding, hydrocephalus, bone, and simulation.",
 "Enhancement on T1 post-contrast is the tumor (GTV), and T2/FLAIR signal shows edema and infiltrating tumor.",
 "Glioblastoma shows thick ring enhancement with central necrosis, while metastases are round, sit at the gray-white junction, and have a lot of edema.",
 "Meningiomas have a dural tail, vestibular schwannomas look like an ice cream cone, and pituitary macroadenomas look like a snowman pushing up on the chiasm.",
 "After treatment, pseudoprogression (early) and radiation necrosis (late) can both look like tumor growth, and perfusion imaging helps tell them apart.",
],
"Workup & Classification": [
 "Brain tumors have no TNM, so ask what the tumor is, where it is and how big it is, and how functional the patient is (KPS).",
 "Workup is MRI with contrast, steroids for symptoms (but not before a lymphoma biopsy), and maximal safe resection or biopsy for tissue and molecular markers.",
 "In the WHO 2021 system, IDH-wildtype is glioblastoma, IDH-mutant with 1p/19q codeletion is oligodendroglioma, and IDH-mutant without codeletion is astrocytoma.",
 "MGMT promoter methylation predicts benefit from temozolomide.",
 "For brain metastases, count and measure the lesions, stage the rest of the body, and estimate prognosis with the GPA.",
],
"Treatment Paradigms": [
 "Limited brain metastases get SRS alone, and a resected metastasis gets SRS to the cavity.",
 "Many brain metastases get hippocampal-avoidant whole-brain RT with memantine to protect memory.",
 "Glioblastoma gets maximal safe resection, then 60 Gy in 30 fractions with temozolomide followed by adjuvant temozolomide (Stupp), with shorter courses for older or frail patients.",
 "Lower-grade gliomas can be observed after surgery or treated with RT plus chemo (PCV or temozolomide), which improves survival.",
 "Benign tumors (meningioma, vestibular schwannoma, pituitary adenoma) are observed, resected, or treated with SRS or fractionated RT, and spinal cord compression gets steroids plus surgery and/or RT.",
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
 "Cervical cancer is caused by HPV, and smoking, immunosuppression, and missed screening raise the risk.",
 "Endometrial cancer is driven by unopposed estrogen (obesity, PCOS, tamoxifen) and Lynch syndrome, and postmenopausal bleeding with a thick endometrial stripe gets a biopsy.",
 "Endometrial cancer is now classified by molecular group: POLE-mutant (best), MMR-deficient, p53-abnormal (worst), and no specific profile.",
 "Vulvar cancer comes from HPV in younger women or lichen sclerosus in older women, and the lichen sclerosus type has a worse prognosis.",
],
"Anatomy & Lymphatics": [
 "The uterus has a fundus, body, and cervix, and endometrial cancer starts in the lining and grows outward through the muscle wall.",
 "Cervical cancer starts at the transformation zone, where the glandular cells of the canal meet the squamous cells of the outer cervix.",
 "The cardinal ligaments and parametria run from the cervix to the pelvic side wall and carry the uterine artery, the ureter, and lymphatics, so tumor spreading sideways can block the ureter.",
 "The upper two-thirds of the vagina drain to the pelvic nodes, while the lower third drains to the groins like the vulva.",
 "Cervical and endometrial cancers spread to pelvic and then para-aortic nodes, while vulvar cancer spreads to the groins first and pelvic nodes count as distant.",
],
"Imaging": [
 "MRI shows the local extent of cervical, endometrial, vaginal, and vulvar cancer, and PET/CT finds nodes and distant disease.",
 "On T2 MRI, cervical tumor is intermediate signal and normal stroma is dark, so an intact dark stromal ring rules out parametrial invasion.",
 "For endometrial cancer, MRI shows the depth of myometrial invasion and whether the cervical stroma is involved.",
 "PET-positive pelvic or para-aortic nodes change the RT plan by adding a nodal boost or an extended para-aortic field.",
 "Brachytherapy is planned on MRI with the applicator in place, aiming for an HR-CTV D90 of at least 85 Gy EQD2 while limiting bladder, rectum, and sigmoid dose.",
],
"Workup & Staging": [
 "Every GYN site is staged as four shells: confined to the organ (I), next door (II), side wall or nodes (III), and bladder or rectal mucosa or distant spread (IV).",
 "A positive regional node makes any GYN cancer at least stage III, no matter how small the primary tumor is.",
 "Cervix and vagina are staged clinically with exam and imaging, while endometrium and vulva are staged surgically from the specimen.",
 "In the cervix, depth cutoffs are 3 and 5 mm and size cutoffs are 2 and 4 cm; parametria is IIB, lower vagina IIIA, side wall or hydronephrosis IIIB, and nodes IIIC.",
 "Bullous edema of the bladder is not stage IV; stage IVA requires biopsy-proven bladder or rectal mucosal invasion.",
],
"Treatment Paradigms": [
 "Cervical cancer is treated with surgery or chemoradiation, not both: early tumors get radical hysterectomy or RT, and stage IB3 to IVA gets chemoradiation plus brachytherapy.",
 "Definitive cervical treatment is 45 Gy pelvic RT with weekly cisplatin followed by a brachytherapy boost, all finished within 8 weeks, and brachytherapy cannot be skipped.",
 "After radical hysterectomy, Sedlis criteria lead to pelvic RT, and Peters criteria (positive nodes, margins, or parametria) lead to chemoradiation.",
 "After hysterectomy for endometrial cancer, low-risk patients are observed, intermediate-risk patients get vaginal brachytherapy, and high-risk patients get pelvic RT and/or chemo.",
 "Vulvar cancer gets wide excision with groin staging, adjuvant groin and pelvic RT for 2 or more positive nodes or extranodal extension, and chemoradiation when it can't be resected.",
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
 "Prostate cancer is usually found by PSA in men without symptoms, and most cases are localized and curable.",
 "Risk factors are age, Black race, family history, and germline mutations, especially BRCA2, which causes more aggressive disease.",
 "Germline testing is recommended for high-risk, very high-risk, node-positive, and metastatic disease.",
 "PSA screening is a shared decision for men 55 to 69, because it lowers prostate cancer deaths but also causes overdiagnosis.",
 "Finasteride and dutasteride cut the PSA in half, so double the PSA value in men taking them.",
],
"Anatomy & Lymphatics": [
 "Most cancers start in the posterior peripheral zone, which is why a DRE can feel them, while the transition zone is where BPH grows.",
 "The rectum sits directly behind the prostate and is the main dose-limiting organ, which is why a hydrogel spacer can help.",
 "Lymph drains first to the obturator and internal iliac nodes, then to the external iliac and common iliac nodes.",
 "True pelvic nodes are N1, while common iliac, para-aortic, and inguinal nodes are distant (M1a).",
 "The elective pelvic nodal field runs from L5/S1 down to the top of the pubic symphysis.",
],
"Imaging": [
 "MRI looks inside the gland to find, target, and locally stage the cancer, while PSMA PET (or CT plus bone scan) looks outside the gland for nodes and bone metastases.",
 "Prostate cancer is dark on T2 and dark on the ADC map; DWI decides the score in the peripheral zone and T2 decides it in the transition zone.",
 "PI-RADS 4 and 5 lesions get a targeted biopsy.",
 "Extraprostatic extension (T3a) and seminal vesicle invasion (T3b) on MRI raise the risk group.",
 "PSMA PET is more accurate than CT and bone scan and finds recurrences at low PSA levels.",
],
"Workup & Staging": [
 "The workup goes in order: PSA and DRE, MRI, targeted plus systematic biopsy, Gleason score and Grade Group, T stage, risk group, and then staging imaging if needed.",
 "Gleason 3+3 is Grade Group 1, 3+4 is Grade Group 2, 4+3 is Grade Group 3, a score of 8 is Grade Group 4, and 9 to 10 is Grade Group 5.",
 "Clinical T stage comes from the DRE, with T3a for extraprostatic extension and T3b for seminal vesicle invasion.",
 "Intermediate-risk features are T2b to T2c, Grade Group 2 to 3, or PSA 10 to 20, and high-risk features are T3a, Grade Group 4 to 5, or PSA over 20.",
 "Staging imaging (PSMA PET, or CT plus bone scan) starts at unfavorable intermediate risk.",
],
"Treatment Paradigms": [
 "Very low and low-risk disease gets active surveillance.",
 "Favorable intermediate risk gets RT alone or prostatectomy, with no ADT.",
 "Unfavorable intermediate risk gets RT plus 4 to 6 months of ADT, and high or very high risk gets RT plus 18 to 36 months of ADT with pelvic nodal RT.",
 "After prostatectomy, early salvage RT to the prostate bed when the PSA starts rising is as effective as routine adjuvant RT and spares many men treatment.",
 "Prostate cancer has a low alpha/beta ratio, so hypofractionated and SBRT courses work well.",
],
},
"thoracic": {
"Epidemiology & Risk Factors": [
 "Lung cancer is divided into non-small cell (adenocarcinoma and squamous) and small cell, which spreads early and is staged as limited or extensive.",
 "Adenocarcinoma is peripheral and the type seen in never-smokers, while squamous and small cell cancers are central and almost always in smokers.",
 "Smoking is the main risk factor, and radon is the leading cause in never-smokers.",
 "Every nonsquamous NSCLC is tested for driver mutations (EGFR, ALK, and others) and PD-L1, because the results change systemic therapy.",
 "Low-dose CT screening is offered to adults 50 to 80 with at least 20 pack-years who still smoke or quit within the last 15 years.",
],
"Anatomy & Lymphatics": [
 "The right lung has three lobes and two fissures, the left has two lobes and the lingula, and the lower lobes move the most with breathing.",
 "A central tumor is within 2 cm of the proximal bronchial tree and an ultracentral tumor touches it, and location changes the SBRT dose.",
 "Hilar and intrapulmonary nodes (stations 10 to 14) are N1, ipsilateral mediastinal nodes (stations 2 to 9) are N2, and contralateral or supraclavicular nodes are N3.",
 "Station 7 (subcarinal) is always N2, and stations 5 and 6 sit on the left side.",
 "EBUS reaches stations 2, 4, 7, 10, and 11, while stations 5 and 6 need a Chamberlain procedure or VATS.",
],
"Imaging": [
 "CT chest stages the primary, PET/CT stages the nodes and distant disease, and brain MRI is needed for stage II and above and for all small cell lung cancer.",
 "A suspicious nodule is spiculated, in an upper lobe, larger, part-solid, or growing, and in a part-solid nodule the solid part sets the T stage.",
 "PET finds suspicious nodes, but they need tissue (usually by EBUS) to prove them, because infection and sarcoid can light up too.",
 "Planning uses a 4D-CT to capture breathing motion and build an ITV that covers the tumor through the whole breathing cycle.",
 "After SBRT, fibrosis is expected, while growth after 12 months, a bulging margin, or lost air bronchograms suggest recurrence.",
],
"Workup & Staging": [
 "Workup is CT chest and upper abdomen, PET/CT, brain MRI for stage II and above, a tissue diagnosis, EBUS for suspicious nodes, PFTs, and biomarkers.",
 "T stage breaks at 1, 2, 3, 4, 5, and 7 cm, with chest wall invasion as T3 and mediastinum, heart, great vessels, or carina invasion as T4.",
 "A separate nodule in the same lobe is T3, in another ipsilateral lobe is T4, and in the other lung is M1a.",
 "N1 is hilar nodes, N2a is one ipsilateral mediastinal station, N2b is several stations, and N3 is contralateral or supraclavicular nodes.",
 "Small cell lung cancer is staged as limited (fits in one RT field) or extensive.",
],
"Treatment Paradigms": [
 "Early-stage, node-negative NSCLC gets a lobectomy if the patient is operable or SBRT if not.",
 "SBRT dose depends on location: 54 Gy in 3 fractions for peripheral tumors, 50 Gy in 5 for central tumors, and longer courses for ultracentral tumors.",
 "Unresectable stage III NSCLC gets 60 Gy in 30 fractions with concurrent chemo, followed by durvalumab (or osimertinib if EGFR-mutant).",
 "Metastatic disease is treated with systemic therapy, plus SBRT for oligometastases, SRS for limited brain metastases, and short palliative courses for symptoms.",
 "Limited-stage small cell gets concurrent chemo with 45 Gy twice daily (or 60 to 66 Gy daily) followed by durvalumab, and extensive stage gets chemo-immunotherapy.",
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
