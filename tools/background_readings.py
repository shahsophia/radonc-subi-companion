"""Source of truth for the six "Before You Start" readings.

Writes src/data/background.json (id, num, title, question, objectives, html).
Rerun after editing:  python3 tools/background_readings.py && python3 build.py

The six readings teach one workflow that every disease-site module reuses:
understand radiation -> understand the tools -> present the patient ->
decide whether radiation helps -> design the treatment.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "background.json")


def vflow(phases):
    """Vertical numbered workflow. phases = [(phase label or None, [(title, text), ...]), ...]"""
    out, n = ["<div class='v-flow'>"], 0
    for label, steps in phases:
        if label:
            out.append(f"<div class='vf-phase'>{label}</div>")
        for title, text in steps:
            n += 1
            out.append(f"<div class='vf-step'><span class='vf-num'>{n}</span><div class='vf-body'><strong>{title}</strong><p>{text}</p></div></div>")
    out.append("</div>")
    return "\n".join(out)


def cards(items, numbered=True):
    out = ["<div class='card-grid'>"]
    for i, (title, body) in enumerate(items, 1):
        num = f"<div class='card-num'>{i}</div>" if numbered else ""
        out.append(f"<div class='card'>{num}<div class='card-title'>{title}</div><p>{body}</p></div>")
    out.append("</div>")
    return "\n".join(out)


def summary(items):
    lis = "".join(f"<li>{t}</li>" for t in items)
    return f"<div class='pearl'>\n<strong>High-Yield Summary</strong>\n<ul style='margin-bottom:0;'>{lis}</ul>\n</div>"


def table(head, rows):
    th = "".join(f"<th>{h}</th>" for h in head)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"<div class='table-wrap'><table>\n<thead><tr>{th}</tr></thead>\n<tbody>{trs}</tbody>\n</table></div>"


# ---------------------------------------------------------------------------
# 01  RADIATION 101
# ---------------------------------------------------------------------------
RAD101 = f"""
<p>Radiation oncology is a <strong>local</strong> cancer treatment: like surgery, it treats one part of the body. This page answers one question, <strong>what actually happens when a patient gets radiation?</strong>, and gives you the language of dose that every attending assumes you already speak.</p>
<p>Don't worry about machine physics yet. The workflow below matters far more on day one.</p>

<h3 id='fits'>Where Radiation Fits</h3>
<p>Nearly every cancer patient is treated with some combination of three specialties:</p>
{cards([
    ("Surgical Oncology", "Removes the tumor and samples or removes lymph nodes. A <strong>local</strong> therapy."),
    ("Medical Oncology", "Chemotherapy, immunotherapy, targeted and hormone therapy. <strong>Systemic</strong> therapy that reaches cancer cells anywhere in the body."),
    ("Radiation Oncology", "Treats a defined region with radiation instead of a scalpel. <strong>Local</strong>, and able to reach places that are hard or risky to operate on."),
])}
<p>Plans are made together, often at a <strong>multidisciplinary tumor board</strong>. Radiation can be the main treatment, can come before or after surgery, can be combined with chemotherapy, or can be given purely to relieve symptoms. Naming that role (the <strong>treatment intent</strong>) is the first job of the consult, covered in <em>The Rad Onc Consult</em>.</p>

<h3 id='workflow'>From Consultation to Treatment</h3>
<p>Every radiation patient moves through the same pipeline. When you're unsure what's happening in clinic, ask where the patient is in this sequence.</p>
{vflow([
    ("Before treatment", [
        ("Consult", "Why radiation? What are we treating? Is the goal cure or symptom relief?"),
        ("Simulation", "Put the patient in a reproducible position (masks, cushions, breath-hold) and obtain planning imaging, usually a CT. <strong>Simulation is not treatment.</strong>"),
        ("Contouring", "Define the tumor, the areas at risk for microscopic spread, and the organs at risk (OARs) on the planning images."),
        ("Planning", "Design beams or arcs that cover the target while minimizing dose to normal tissue."),
        ("QA", "The physician approves the plan and physics verifies that it can actually be delivered safely and accurately."),
    ]),
    ("During treatment", [
        ("Treatment", "Deliver the prescribed dose over one or more fractions, with imaging on the machine to confirm position."),
        ("On-treatment visits (OTVs)", "Usually weekly: monitor toxicity, symptoms, weight, labs when relevant, and any treatment interruptions."),
    ]),
    ("After treatment", [
        ("Follow-up", "Assess response, watch for recurrence, and manage late toxicity, often for years."),
    ]),
])}
<p>Steps 2 through 5 usually take about one to two weeks for a curative plan. An urgent palliative case (for example, spinal cord compression) can be simulated, planned, and treated the same day.</p>
<div class='big-idea'>Consult &rarr; Simulation &rarr; Contouring &rarr; Planning &rarr; QA &rarr; Treatment &rarr; OTVs &rarr; Follow-up. Knowing this sequence matters more than knowing how the machine works.</div>

<h3 id='dose'>Dose, Fractions, and the Treatment Course</h3>
<div class='big-idea'>Radiation dose is measured in <strong>gray (Gy)</strong>, not in &ldquo;number of treatments.&rdquo;</div>
<dl class='spec-list'>
<div class='spec-row'><dt>Total dose</dt><dd>The dose for the whole course, in Gy.</dd></div>
<div class='spec-row'><dt>Fraction</dt><dd>One treatment session. Most courses give one fraction per weekday.</dd></div>
<div class='spec-row'><dt>Dose per fraction</dt><dd>Total dose divided by the number of fractions.</dd></div>
<div class='spec-row'><dt>Treatment course</dt><dd>All of the fractions together: a single day to about seven or eight weeks.</dd></div>
</dl>
<div class='script-box'>
<span class='script-label'>Read it like this</span>
&ldquo;60 Gy in 30 fractions&rdquo; = 2 Gy per fraction, once daily on weekdays, about six weeks.
</div>
<p>You'll hear four broad patterns:</p>
{cards([
    ("Conventional", "About 1.8-2 Gy per fraction, usually over five to eight weeks."),
    ("Hypofractionation", "Fewer, larger fractions. Example: 40 Gy in 15 fractions for breast."),
    ("Stereotactic (SRS / SBRT)", "One to five large, highly precise fractions to a small target."),
    ("Single fraction", "One treatment. Example: 8 Gy once for a painful bone metastasis."),
], numbered=False)}
<details class='reveal quiz'>
<summary>Try it: read three prescriptions<span class='chev'>&#9662;</span></summary>
<div class='reveal-body'>
<p>Work out the dose per fraction before you look.</p>
<ul>
<li><strong>50.4 Gy in 28 fractions</strong> = 1.8 Gy per fraction (conventional).</li>
<li><strong>40 Gy in 15 fractions</strong> = about 2.67 Gy per fraction (hypofractionated).</li>
<li><strong>54 Gy in 3 fractions</strong> = 18 Gy per fraction (SBRT).</li>
</ul>
<p>Notice that two courses with the same total dose are <em>not</em> equivalent if the fraction size differs. The next reading explains why.</p>
</div>
</details>

<h3 id='why-fractions'>Why Fractions?</h3>
<div class='big-idea'>Radiation is often divided into fractions so normal tissues can repair between treatments while damage to the tumor accumulates.</div>
<p>A single dose large enough to sterilize most tumors would also badly injure the normal tissue around them. Splitting it up lets normal tissue recover a little each day while the tumor falls further behind. That's why a curative course is often weeks long, and why missed treatments matter.</p>
<p>SRS and SBRT are the exception. When the target is small and can be hit very precisely, little normal tissue sits in the high-dose region, so a few large fractions become possible.</p>

<h3 id='path'>Where the Next Five Readings Go</h3>
<p>These six readings build one workflow. Every disease-site module applies the same framework to one cancer.</p>
{table(["Reading", "The question it answers"], [
    ["01 Radiation 101", "What happens when a patient gets radiation?"],
    ["02 How Radiation Works", "Why does radiation kill cancer cells, and why does normal tissue get hurt?"],
    ["03 Radiation Modalities", "What tools does a radiation oncologist have?"],
    ["04 How to Give a Presentation", "How do I communicate the patient?"],
    ["05 The Rad Onc Consult", "How do I decide whether, and how, radiation should be used?"],
    ["06 Treatment Planning", "How do I turn that decision into a safe radiation plan?"],
    ["Disease sites", "Now apply all six to breast, thoracic, CNS, GI, GU, GYN, and head and neck."],
])}

{summary([
    "Radiation oncology is a local therapy that works alongside surgery and systemic therapy, usually planned at a multidisciplinary tumor board.",
    "Every patient follows the same pipeline: consult, simulation, contouring, planning, QA, treatment, on-treatment visits, and follow-up.",
    "Simulation is a planning scan in the treatment position, not the first treatment.",
    "Dose is measured in gray; a prescription gives the total dose and the number of fractions, so 60 Gy in 30 fractions is 2 Gy per fraction.",
    "Fractionation lets normal tissue repair between treatments while tumor damage accumulates.",
])}
"""

# ---------------------------------------------------------------------------
# 02  HOW RADIATION WORKS
# ---------------------------------------------------------------------------
HOWRT = f"""
<p>You don't need a radiobiology course for this rotation. You need one sequence and one idea: <strong>radiation damages DNA in every cell it passes through</strong>, and <strong>fractionation exploits the differences between tumor and normal tissue</strong>. Everything else on this page hangs off those two.</p>

<h3 id='sequence'>The Core Sequence</h3>
<div class='flow-diagram'>
<div class='flow-step'><div class='flow-num'>1</div><div class='flow-label'>Radiation deposits energy</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>2</div><div class='flow-label'>DNA damage</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>3</div><div class='flow-label'>Cell death or loss of reproductive capacity</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>4</div><div class='flow-label'>Tumor response</div></div>
</div>
<p>Most irradiated cells don't die on the spot. They lose the ability to divide successfully and die when they try. That's why tumors usually shrink over <strong>weeks to months</strong>, and why a scan taken right after treatment can underestimate how well it worked.</p>
<div class='big-idea'>Normal tissue in the beam gets the same kind of DNA damage. That's where side effects come from.</div>

<h3 id='dna'>How Radiation Damages DNA</h3>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>Direct</span>
<h5>Radiation hits DNA</h5>
<p>Energy is deposited in the DNA molecule itself.</p>
</div>
<div class='compare-col'>
<span class='compare-label'>Indirect</span>
<h5>Radiation &rarr; water &rarr; free radicals &rarr; DNA</h5>
<p>Radiation ionizes water, producing free radicals that then damage DNA. With the photons used for most treatments, this is the main mechanism.</p>
</div>
</div>
<p><strong>Double-strand breaks</strong>, where both strands are cut, are particularly difficult for cells to repair accurately. Unrepaired or misrepaired breaks are what ultimately kill the cell when it divides.</p>

<h3 id='normal-tissue'>Why Normal Tissue Gets Hurt</h3>
<p>Radiation can't tell tumor from normal tissue, so side effects happen <strong>where the dose goes</strong>. A pelvic patient gets diarrhea, not mouth sores; fatigue is the main whole-body exception. Side effects come in two flavors:</p>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>During treatment and weeks after</span>
<h5>Acute effects</h5>
<p>In tissues that divide quickly: skin, mucosa, bowel lining, bone marrow. Dermatitis, mucositis, diarrhea. Usually heal after treatment ends.</p>
</div>
<div class='compare-col'>
<span class='compare-label'>Months to years later</span>
<h5>Late effects</h5>
<p>In slowly turning-over tissue and blood vessels: fibrosis, strictures, dry mouth, necrosis, myelopathy. Often permanent.</p>
</div>
</div>
<div class='pearl'>
<strong>Clinical Pearl</strong>
Acute effects shape the on-treatment visit. Late effects are the reason dose limits exist, because they're the ones patients live with.
</div>

<h3 id='four-rs'>The 4 R's: Why Fractionation Works</h3>
<p>The four R's explain why splitting a dose into fractions helps us. Learn each by what it means at the bedside.</p>
<div class='card-grid'>
<div class='card'><div class='card-num'>1</div><div class='card-title'>Repair</div><p>Normal tissue can repair sublethal damage between fractions.</p><p class='card-use'><em>Clinically:</em> the core reason we fractionate, and why twice-daily fractions are spaced at least about six hours apart.</p></div>
<div class='card'><div class='card-num'>2</div><div class='card-title'>Repopulation</div><p>Cells, tumor included, keep proliferating during treatment.</p><p class='card-use'><em>Clinically:</em> avoid unnecessary breaks, especially in fast-growing cancers like head and neck and cervix. Prolonging the course can lower tumor control.</p></div>
<div class='card'><div class='card-num'>3</div><div class='card-title'>Redistribution</div><p>Cells move through the cell cycle and change radiosensitivity (mitosis is most sensitive, late S phase most resistant).</p><p class='card-use'><em>Clinically:</em> survivors of one fraction may be caught in a more sensitive phase by the next.</p></div>
<div class='card'><div class='card-num'>4</div><div class='card-title'>Reoxygenation</div><p>Hypoxic tumor cells resist radiation. As better-oxygenated cells die, hypoxic cells can become better oxygenated.</p><p class='card-use'><em>Clinically:</em> why bulky, necrotic tumors are harder to control, and one reason we push smoking cessation.</p></div>
</div>
<div class='big-idea'>Fractionation exploits differences between tumor and normal-tissue biology.</div>

<h3 id='alpha-beta'>&alpha;/&beta;: Why Fraction Size Matters</h3>
<p>You won't calculate it, but you should know what it means: the &alpha;/&beta; ratio describes how sensitive a tissue is to <strong>fraction size</strong>.</p>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>High &alpha;/&beta;</span>
<h5>Less sensitive to fraction size</h5>
<p>Most tumors and quickly dividing (acute-reacting) tissues.</p>
</div>
<div class='compare-col'>
<span class='compare-label'>Low &alpha;/&beta;</span>
<h5>More sensitive to fraction size</h5>
<p>Late-responding normal tissues, and some tumors, most notably <strong>prostate cancer</strong>.</p>
</div>
</div>
<p>Low &alpha;/&beta; tissues are relatively sensitive to changes in fraction size. Two consequences follow:</p>
<ul>
<li>Large fractions raise the risk of <strong>late</strong> effects in normal tissue sitting in the high-dose region, which is why big fractions demand precision.</li>
<li>A low &alpha;/&beta; tumor is hit relatively hard by large fractions, which helps explain why <strong>hypofractionation</strong> is attractive for selected cancers. Prostate is the classic example (breast is another).</li>
</ul>
<p>You do not need to memorize an &alpha;/&beta; table. Remember the idea and the prostate example.</p>

<details class='reveal'>
<summary>Deeper dive (optional): oxygen, LET, RBE, BED<span class='chev'>&#9662;</span></summary>
<div class='reveal-body'>
<ul>
<li><strong>Oxygen effect:</strong> oxygen &ldquo;fixes&rdquo; free-radical DNA damage so it can't be repaired. Hypoxic cells need roughly two to three times the photon dose for the same kill (the oxygen enhancement ratio, OER).</li>
<li><strong>LET (linear energy transfer):</strong> how densely a particle deposits energy along its track. Photons and electrons are low LET; heavy ions are high LET and depend less on oxygen.</li>
<li><strong>RBE (relative biological effectiveness):</strong> how much more damaging a dose of one radiation is than photons. Protons are conventionally assigned an RBE of 1.1.</li>
<li><strong>BED and EQD2:</strong> linear-quadratic tools for comparing schedules with different fraction sizes on one scale. EQD2 is the equivalent dose in 2 Gy fractions. Recognize the terms; calculate only if asked.</li>
<li><strong>Repair pathways:</strong> double-strand breaks are repaired mainly by non-homologous end joining (error-prone) or homologous recombination (accurate, needs a sister chromatid in S/G2).</li>
<li><strong>Lethal chromosome aberrations:</strong> misrepaired breaks can form dicentrics and rings, which prevent successful division.</li>
<li><strong>A fifth R:</strong> intrinsic radiosensitivity. Some tumors (lymphoma, seminoma) are far more radiosensitive than others.</li>
</ul>
</div>
</details>

{summary([
    "Radiation deposits energy, damages DNA, and causes cell death or loss of reproductive capacity, which shows up as tumor response over weeks to months.",
    "With photons, most DNA damage is indirect, through free radicals made from water; double-strand breaks are the hardest to repair accurately.",
    "Normal tissue in the beam is damaged the same way, causing acute effects in fast-dividing tissue and late effects that are often permanent.",
    "The four R's (repair, repopulation, redistribution, reoxygenation) explain why fractionation exploits differences between tumor and normal tissue.",
    "Low &alpha;/&beta; tissues are more sensitive to fraction size, which helps explain why hypofractionation suits selected cancers such as prostate.",
])}
"""

# ---------------------------------------------------------------------------
# 03  RADIATION MODALITIES
# ---------------------------------------------------------------------------
DEPTH_DOSE_SVG = """<figure>
<svg viewBox='0 0 600 260' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='depthdosetitle'>
<title id='depthdosetitle'>Schematic relative dose versus tissue depth for photons, electrons, and protons</title>
<line x1='50' y1='20' x2='50' y2='210' stroke='var(--ink-faint)' stroke-width='1.5'/>
<line x1='50' y1='210' x2='580' y2='210' stroke='var(--ink-faint)' stroke-width='1.5'/>
<text x='16' y='24' font-size='11' fill='var(--ink-faint)' font-family='var(--font-mono)'>Dose</text>
<text x='500' y='232' font-size='11' fill='var(--ink-faint)' font-family='var(--font-mono)'>Depth &rarr;</text>
<path d='M50,120 C90,45 130,55 190,72 C300,100 420,140 580,168' fill='none' stroke='var(--accent)' stroke-width='3' stroke-linecap='round'/>
<path d='M50,200 C70,60 100,50 130,90 C150,120 165,160 180,205' fill='none' stroke='var(--accent-2)' stroke-width='3' stroke-linecap='round'/>
<path d='M50,195 C160,190 300,190 360,185 C385,178 400,30 420,25 C438,70 445,205 460,208 C500,209 540,209 580,209' fill='none' stroke='color-mix(in srgb, var(--accent) 45%, var(--accent-2))' stroke-width='3' stroke-linecap='round'/>
</svg>
<figcaption>
Schematic dose-versus-depth curves (not to scale). <span style='color:var(--accent);font-weight:700;'>&#9679; Photons</span> penetrate deeply with an exit dose past the target. <span style='color:var(--accent-2);font-weight:700;'>&#9679; Electrons</span> peak shallowly, then fall off fast. <span style='color:color-mix(in srgb, var(--accent) 45%, var(--accent-2));font-weight:700;'>&#9679; Protons</span> deposit little dose on entry, most at the Bragg peak, then stop.
<span class='fig-source'>The concept that matters: where each particle deposits most of its dose.</span>
</figcaption>
</figure>"""

MODALITIES = f"""
<p>You don't need to memorize every machine. You need to know <strong>what tools a radiation oncologist has, and when you would reach for each one</strong>. Learn each technique by the one thing it adds.</p>
<div class='big-idea'>For every technique, ask: what can this do that the one before it can't?</div>

<h3 id='big-split'>The Big Split: External Beam vs. Brachytherapy</h3>
<p>Every modality answers one question first: <strong>where is the radiation source?</strong> That gives you the whole map.</p>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>Source outside the patient</span>
<h5>External beam (EBRT)</h5>
<p>A machine aims radiation at the target. Most of what you'll see.</p>
<ul><li>3D-CRT</li><li>IMRT</li><li>VMAT</li><li>SRS</li><li>SBRT</li><li>Protons</li></ul>
</div>
<div class='compare-col'>
<span class='compare-label'>Source inside or next to the tumor</span>
<h5>Brachytherapy</h5>
<p>Dose falls off steeply with distance, so the tumor gets a high dose and nearby tissue is spared.</p>
<ul><li>Intracavitary</li><li>Interstitial</li><li>LDR</li><li>HDR</li></ul>
</div>
</div>
<div class='big-idea'>External beam brings the radiation to the patient. Brachytherapy brings the source to the tumor.</div>

<h3 id='particles'>The Raw Material: Photons, Electrons, Protons</h3>
<p>Ask one question of each: <strong>where does it deposit its dose?</strong></p>
{cards([
    ("Photons", "The workhorse, made by a linear accelerator. They penetrate deeply and keep going past the target (<strong>exit dose</strong>), so deep tumors are treated with several beams or arcs that overlap at the target."),
    ("Electrons", "Deposit dose over a shallow depth, then fall off quickly. Used for superficial targets: skin cancers, scar boosts, some shallow nodes."),
    ("Protons", "Little dose on entry, most of the energy at a set depth (the <strong>Bragg peak</strong>), then almost nothing beyond. No exit dose."),
])}
{DEPTH_DOSE_SVG}

<h3 id='linac'>The LINAC, the MLC, and Daily Image Guidance</h3>
<p>The <strong>linear accelerator (LINAC)</strong> makes high-energy photons and can also deliver electrons. Its rotating arm, the <strong>gantry</strong>, swings around the patient on the couch. Inside the head is the <strong>multileaf collimator (MLC)</strong>: thin, computer-controlled metal leaves that <strong>shape the beam to the target and block normal tissue</strong>. Almost every technique below is a different way of using the MLC.</p>
<p><strong>Image-guided radiation therapy (IGRT)</strong> means imaging the patient on the machine before each treatment and shifting them into position. The most common version is a <strong>cone-beam CT (CBCT)</strong> matched to the planning CT; prostate patients may have implanted <strong>fiducial markers</strong>. The tighter the dose, the more IGRT matters.</p>
<div class='big-idea'>IGRT answers one question: &ldquo;Is the patient where we expected them to be today?&rdquo;</div>

<h3 id='ladder'>The External Beam Ladder</h3>
<p>Each rung keeps what the rung below can do and adds one thing.</p>
<div class='card-grid'>
<div class='card'><div class='card-num'>1</div><div class='card-title'>3D-CRT</div><span class='card-plus'>Baseline</span><p>Shape the beams to the target. A few fixed beams, uniform intensity across each.</p><p class='card-use'><em>Think of it for:</em> simple geometry and palliation.</p></div>
<div class='card'><div class='card-num'>2</div><div class='card-title'>IMRT</div><span class='card-plus'>+ Intensity modulation</span><p>Vary the intensity within each beam so dose wraps around the target and carves away from nearby organs.</p><p class='card-use'><em>Think of it for:</em> a complex target next to OARs (head and neck).</p></div>
<div class='card'><div class='card-num'>3</div><div class='card-title'>VMAT</div><span class='card-plus'>+ Rotating gantry</span><p>Deliver modulated radiation while the gantry rotates. Same goal as IMRT, usually faster.</p><p class='card-use'><em>Think of it for:</em> the same situations as IMRT; now one of the most common techniques.</p></div>
<div class='card'><div class='card-num'>4</div><div class='card-title'>SRS</div><span class='card-plus'>+ Ablative precision, brain</span><p>Very precise, usually ablative treatment of small intracranial targets in one to five fractions. No incision despite the name.</p><p class='card-use'><em>Think of it for:</em> brain metastases, vestibular schwannoma, AVM.</p></div>
<div class='card'><div class='card-num'>5</div><div class='card-title'>SBRT / SABR</div><span class='card-plus'>+ Ablative precision, body</span><p>Highly conformal ablative treatment of selected small targets outside the brain, in one to five fractions.</p><p class='card-use'><em>Think of it for:</em> early-stage lung cancer, oligometastases, spine metastases.</p></div>
</div>
<p>Stereotactic plans use <strong>tiny margins and steep dose falloff</strong>, so a few millimeters of setup error could miss the tumor or overdose a neighbor. That's why these patients get careful immobilization, motion management, and image guidance. You may hear platform names (Gamma Knife, CyberKnife, LINAC-based SRS); they're all ways to deliver stereotactic radiation.</p>
<div class='big-idea'>IMRT + a rotating gantry = VMAT. SRS = stereotactic to the brain. SBRT = stereotactic to the body.</div>

<h3 id='protons'>Protons: Different Physics, Not Automatically Better</h3>
<p>Protons use the <strong>Bragg peak</strong> to reduce exit dose. That can lower the dose to tissue beyond the target, which may matter in selected situations:</p>
<ul>
<li><strong>Children</strong>, where lower dose to developing tissue may reduce late effects and second cancers.</li>
<li><strong>Craniospinal</strong> treatment, where photons exit through the heart, lungs, and bowel.</li>
<li>Tumors <strong>wrapped around critical structures</strong>, such as skull base tumors next to the brainstem and optic pathway.</li>
<li>Some <strong>re-irradiation</strong> cases, where previously treated tissue can't take more.</li>
</ul>
<div class='big-idea'>Protons change the physical dose distribution. Whether that becomes a meaningful clinical advantage depends on the disease, the anatomy, and the photon plan it's compared with.</div>
<p>The trade-offs are real: the exact depth where protons stop carries <strong>range uncertainty</strong>, plans are <strong>sensitive to anatomic change</strong> (weight loss, gas, tumor shrinkage), and access and cost are limited. For many adult cancers, randomized evidence comparing protons with modern photon plans is still maturing.</p>
<div class='pearl'>
<strong>Clinical Pearl</strong>
When someone says protons are better, ask: better than which photon plan, for which organ, and does that dose difference change an outcome the patient will actually feel?
</div>

<h3 id='brachytherapy'>Brachytherapy: Bringing the Source to the Tumor</h3>
<p>Brachytherapy is a <strong>procedure</strong>. An applicator, catheters, or seeds are placed (often under anesthesia), imaging is done, and the dose is planned around them. Two questions describe any implant: how is it placed, and how fast is the dose delivered?</p>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>How it's placed</span>
<h5>Intracavitary vs. interstitial</h5>
<p><strong>Intracavitary:</strong> an applicator sits in a body cavity (tandem and ovoids or ring in the uterus and vagina; a vaginal cylinder).</p>
<p><strong>Interstitial:</strong> needles, catheters, or seeds go directly into tissue (prostate, some cervix, breast, and sarcoma).</p>
</div>
<div class='compare-col'>
<span class='compare-label'>How fast the dose arrives</span>
<h5>LDR vs. HDR</h5>
<p><strong>LDR:</strong> low dose rate over a long time. Classic example: <strong>permanent</strong> prostate seeds.</p>
<p><strong>HDR:</strong> a high-activity source travels into the applicator for minutes, then is <strong>removed</strong>. Classic examples: cervix, endometrium (vaginal cuff), some prostate and breast.</p>
</div>
</div>
<div class='pearl'>
<strong>Pearl: Cervical Cancer</strong>
<p>For definitive treatment of cervical cancer, brachytherapy is <strong>essential</strong>. It can't be replaced by simply giving more external beam, because nothing else puts such a high dose on the cervix while sparing the bladder and rectum.</p>
</div>

<h3 id='when'>When Would I Use This?</h3>
{table(["Modality", "Think", "Classic examples"], [
    ["<strong>3D-CRT</strong>", "Simple field arrangement", "Palliative bone metastasis, whole brain"],
    ["<strong>IMRT / VMAT</strong>", "Complex target + nearby OARs", "Head and neck, prostate, anal cancer, glioma"],
    ["<strong>SRS</strong>", "Small brain target", "Brain metastases, vestibular schwannoma"],
    ["<strong>SBRT</strong>", "Small extracranial target", "Early lung cancer, oligometastases, spine metastases"],
    ["<strong>Electrons</strong>", "Superficial target", "Skin cancer, scar boost"],
    ["<strong>Protons</strong>", "Selected cases where reducing exit dose may matter", "Pediatric tumors, craniospinal, skull base"],
    ["<strong>Brachytherapy</strong>", "Target accessible to an applicator or source", "Cervix, prostate, vaginal cuff"],
])}
<p>These are tendencies, not rules. The same disease can be treated with different techniques depending on anatomy, goals, and what's available.</p>

<div class='quiz-carousel' data-quiz-set='modalities-pick'></div>

{summary([
    "Every modality starts with one split: external beam brings radiation from a machine, brachytherapy places the source in or next to the tumor.",
    "The external beam ladder runs 3D-CRT, IMRT (intensity modulation), VMAT (IMRT while rotating), then SRS and SBRT for small targets treated ablatively with very tight margins.",
    "Image guidance before each treatment confirms the patient is where the plan expects, and matters most when margins are smallest.",
    "Protons reduce exit dose, but they are not automatically better; the benefit depends on the disease, anatomy, and the photon plan they are compared with.",
    "Brachytherapy is described by placement (intracavitary or interstitial) and dose rate (LDR or HDR), and it is essential for definitive cervical cancer treatment.",
])}
"""

# ---------------------------------------------------------------------------
# 04  HOW TO GIVE A PRESENTATION
# ---------------------------------------------------------------------------
PRESENTATION = f"""
<p>This reading is about <strong>how you communicate the patient</strong>. The next one, <em>The Rad Onc Consult</em>, is about how you think through the patient. A good Rad Onc presentation is short, says the stage out loud, and ends in a radiation recommendation.</p>
<p>Most Sub-Is start with shadowing. Once you're comfortable, ask to present. It's one of the most learnable skills on the rotation because the structure is the same for every disease site.</p>

<h3 id='one-rule'>The One Rule: Don't Just Relay the Chart</h3>
<p>It's easy to repeat the referring note, including its staging and recommendation, without doing your own thinking. Look at the images, stage the patient, and form your own opinion before you present. You'll sometimes be wrong; that's expected. The point is to show your reasoning.</p>
<div class='script-box'>
<span class='script-label'>Sounds like</span>
&ldquo;I'd stage him as cT3bN1M0. My thought was long-course chemoradiation as part of total neoadjuvant therapy, though I wasn't sure whether short-course would also be reasonable.&rdquo;
</div>

<h3 id='template'>The Rad Onc Presentation Template</h3>
<p>One template works for every new patient:</p>
<div class='flow-diagram'>
<div class='flow-step'><div class='flow-num'>1</div><div class='flow-label'>One-liner</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>2</div><div class='flow-label'>Focused HPI</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>3</div><div class='flow-label'>Pathology</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>4</div><div class='flow-label'>Imaging</div></div>
</div>
<div class='flow-connector'>&darr;</div>
<div class='flow-diagram'>
<div class='flow-step'><div class='flow-num'>5</div><div class='flow-label'>Stage</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>6</div><div class='flow-label'>Treatment so far</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>7</div><div class='flow-label'>Assessment</div></div>
<div class='flow-arrow'>&rarr;</div>
<div class='flow-step'><div class='flow-num'>8</div><div class='flow-label'>Radiation recommendation</div></div>
</div>
<p>We'll build it with one patient: <strong>Mr. K, 64, with newly diagnosed rectal cancer.</strong></p>

<h4>1. One-liner</h4>
<p><strong>Who + what + stage + why we're here.</strong> One sentence that orients the room.</p>
<div class='script-box'>
<span class='script-label'>Sounds like</span>
&ldquo;Mr. K is a 64-year-old man with newly diagnosed cT3bN1M0 low rectal adenocarcinoma, referred for consideration of neoadjuvant chemoradiation as part of total neoadjuvant therapy.&rdquo;
</div>
<p>Before you've said a second sentence, the attending knows the disease, the stage, and the question.</p>

<h4>2. Focused HPI</h4>
<p>Only include information that changes the <strong>diagnosis</strong>, the <strong>stage</strong>, the <strong>treatment</strong>, or <strong>radiation safety</strong>.</p>
<div class='big-idea'>Ask yourself: &ldquo;Would this fact change what we do?&rdquo; If not, it probably doesn't belong.</div>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>Keep</span>
<h5>Changes the plan</h5>
<ul>
<li>How it presented and symptoms that set urgency (bleeding, obstruction, pain)</li>
<li>Performance status</li>
<li><strong>Prior radiation</strong>: site, dose, and when</li>
<li>Radiation safety: connective tissue disease, IBD before pelvic RT, pacemaker, hip prosthesis, pregnancy, inability to lie flat</li>
<li>The patient's goals (for example, organ preservation)</li>
</ul>
</div>
<div class='compare-col'>
<span class='compare-label'>Cut</span>
<h5>Doesn't change the plan</h5>
<ul>
<li>Every chemotherapy cycle date and dose change</li>
<li>The full medication list</li>
<li>Unrelated hospitalizations</li>
<li>The radiology report read word for word</li>
</ul>
</div>
</div>
<p>The most common Sub-I mistake is a giant medical-oncology HPI. Summarize systemic therapy in one line and spend your time on what radiation needs to know.</p>

<h4>3. Pathology</h4>
<p>Histology, grade, and molecular markers <strong>when they change management</strong>. Not the whole report.</p>
<div class='script-box'>
<span class='script-label'>Sounds like</span>
&ldquo;Biopsy showed moderately differentiated adenocarcinoma, mismatch-repair proficient.&rdquo;
</div>
<p>Why mention mismatch repair? Because a <strong>mismatch-repair-deficient</strong> rectal cancer changes the conversation entirely: immunotherapy may come first.</p>

<h4>4. Imaging</h4>
<p>Use one pattern: <strong>date &rarr; modality &rarr; key finding &rarr; treatment implication.</strong></p>
<div class='script-box'>
<span class='script-label'>Sounds like</span>
&ldquo;MRI pelvis on 9/12 showed a low rectal T3b tumor, 2 mm from the mesorectal fascia, with EMVI, making him high risk for local recurrence.&rdquo;
</div>
<p>That's much more useful than &ldquo;MRI showed a T3b tumor.&rdquo; Look at the images yourself so you can point to what you're describing.</p>

<h4>5. Stage</h4>
<p>Say it explicitly, with the right prefix (c for clinical, p for pathologic, yp after neoadjuvant therapy):</p>
<div class='script-box'>
<span class='script-label'>Sounds like</span>
&ldquo;I'd stage him as cT3bN1M0, Stage IIIB.&rdquo;
</div>
<p>Don't make the attending infer it.</p>

<h4>6. Treatment so far</h4>
<p>Surgery, chemotherapy or other systemic therapy, prior radiation, and the response. For Mr. K: no treatment yet; he has seen medical oncology and colorectal surgery.</p>

<h4>7. Assessment</h4>
<p>The most important part. Synthesize, then say <em>why</em>.</p>
<div class='script-box'>
<span class='script-label'>Sounds like</span>
&ldquo;Overall, this is a high-risk, locally advanced rectal adenocarcinoma: a low tumor threatening the mesorectal fascia, with EMVI and nodal disease, so he's at substantial risk of local recurrence and a positive margin with surgery alone.&rdquo;
</div>

<h4>8. Radiation recommendation</h4>
<p>Always answer four questions:</p>
{cards([
    ("What?", "The radiation you recommend, and its intent."),
    ("Why?", "The problem it solves for this patient."),
    ("How?", "What you'd treat and what you'd protect."),
    ("What are the risks?", "The main acute and late toxicities."),
])}
<div class='script-box'>
<span class='script-label'>Sounds like</span>
&ldquo;I would recommend long-course pelvic chemoradiation as part of TNT because of the threatened mesorectal fascia and low tumor location. I would treat the primary and the regional pelvic nodes while respecting the small bowel, bladder, and femoral heads. The main risks are diarrhea, urinary irritation, perineal skin reaction, and fatigue, plus late bowel, sexual, and fertility effects.&rdquo;
</div>
<p>Finish with what's still open: here, whether a clinical complete response might make him a candidate for watch-and-wait.</p>

<div class='worked-example'>
<span class='worked-example-label'>Worked Example: The Whole Presentation (about 90 seconds)</span>
<p>&ldquo;Mr. K is a 64-year-old man with newly diagnosed cT3bN1M0 low rectal adenocarcinoma, referred for consideration of neoadjuvant chemoradiation as part of total neoadjuvant therapy.</p>
<p>He presented with three months of rectal bleeding and change in bowel habits. Colonoscopy found a mass 5 cm from the anal verge. He is fully active, has no prior pelvic radiation, no inflammatory bowel disease, and no hip prostheses.</p>
<p>Biopsy showed moderately differentiated adenocarcinoma, mismatch-repair proficient.</p>
<p>MRI pelvis on 9/12 showed a low rectal T3b tumor, 2 mm from the mesorectal fascia, with EMVI and two suspicious mesorectal nodes. CT chest, abdomen, and pelvis showed no metastatic disease. I reviewed the MRI and agree with the read.</p>
<p>I'd stage him as cT3bN1M0, Stage IIIB. He hasn't started treatment; medical oncology plans chemotherapy as part of TNT.</p>
<p>Overall, this is a high-risk, locally advanced rectal adenocarcinoma because of the threatened mesorectal fascia, EMVI, and low location.</p>
<p>I'd recommend long-course pelvic chemoradiation with concurrent capecitabine as part of TNT, treating the primary and regional pelvic nodes while respecting the small bowel, bladder, and femoral heads. Main risks are diarrhea, urinary irritation, perineal skin reaction, fatigue, and late bowel and sexual effects. The open question is whether a clinical complete response would make him a candidate for organ preservation.&rdquo;</p>
</div>

<details class='reveal quiz'>
<summary>Try it yourself: build a one-liner<span class='chev'>&#9662;</span></summary>
<div class='reveal-body'>
<p><strong>Case:</strong> A 58-year-old postmenopausal woman had a lumpectomy and sentinel node biopsy for a 1.7 cm grade 2 invasive ductal carcinoma of the left breast, ER/PR-positive, HER2-negative, 0 of 2 nodes. She's referred for radiation. Draft your one-liner before reading on.</p>
<p><strong>A strong answer:</strong> &ldquo;Ms. R is a 58-year-old postmenopausal woman with pT1c pN0 ER/PR-positive, HER2-negative invasive ductal carcinoma of the left breast, status post lumpectomy, referred for consideration of adjuvant radiation.&rdquo;</p>
<p>Who, what, stage, why we're here, in one sentence.</p>
</div>
</details>

<h3 id='follow-up-otv'>Follow-Ups and On-Treatment Visits</h3>
<p>These are shorter, but the same rule applies: say only what changes what we do.</p>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>Follow-up</span>
<h5>What has changed since we last saw them?</h5>
<ol>
<li>One-liner with a time anchor (&ldquo;4 months after whole-breast RT&rdquo;)</li>
<li>Treatment since the last visit</li>
<li>Disease status: symptoms, exam, interval imaging</li>
<li>Toxicity: acute or late, better or worse</li>
<li>Next step: surveillance, workup, or a change in plan</li>
</ol>
</div>
<div class='compare-col'>
<span class='compare-label'>On-treatment visit</span>
<h5>How is treatment going right now?</h5>
<ol>
<li>Site, dose, and fraction (&ldquo;fraction 12 of 15&rdquo;)</li>
<li>Symptoms and toxicity, with grade and trajectory</li>
<li>Focused exam, especially the treated skin</li>
<li>Weight, labs when relevant, missed treatments</li>
<li>Plan: continue, adjust supportive care, or change course</li>
</ol>
</div>
</div>
<div class='worked-example'>
<span class='worked-example-label'>Worked Example: OTV</span>
<p>&ldquo;Ms. R is on fraction 12 of 15 of hypofractionated whole-breast radiation to the left breast and hasn't missed any treatments. She has mild fatigue and grade 1 dermatitis with faint erythema and no moist desquamation, slightly progressing as expected. Plan is to continue treatment with gentle skin care, and to counsel her that skin changes may peak a week or two after treatment before improving.&rdquo;</p>
</div>
<div class='pearl'>
<strong>Useful Principle</strong>
Radiation toxicity accumulates. A patient who feels fine at fraction 5 may be much more symptomatic by fraction 20, and many acute effects peak at the end of treatment or shortly after. Your job at an OTV is to anticipate what's coming, not just document today.
</div>

{summary([
    "Do your own thinking: review the images, stage the patient, and form a recommendation before you present.",
    "Use one template: one-liner, focused HPI, pathology, imaging, stage, treatment so far, assessment, and radiation recommendation.",
    "Filter every detail with one question, &ldquo;would this fact change what we do?&rdquo;, and always mention prior radiation and radiation-safety issues.",
    "Present imaging as date, modality, key finding, and treatment implication, and say the stage explicitly.",
    "End with a recommendation that answers what, why, how, and what the risks are; follow-ups and OTVs focus on what has changed.",
])}
"""

# ---------------------------------------------------------------------------
# 05  THE RAD ONC CONSULT
# ---------------------------------------------------------------------------
CONSULT = f"""
<p>The presentation is how you <strong>communicate</strong> the patient. The consult is how you <strong>think through</strong> the patient. Almost anything can be radiated, so that isn't the question. The question is <strong>what problem radiation would solve for this patient, and whether it's the best way to solve it</strong>.</p>

<h3 id='nine-questions'>Nine Questions for Every Consult</h3>
<p>Work through these in order for every new patient, at every disease site.</p>
{vflow([
    ("Know the disease", [
        ("Why was the patient referred?", "Curative? Adjuvant? Definitive? Palliative? Oligometastatic? Read the referral question carefully."),
        ("What is the diagnosis?", "The pathology: histology, grade, and markers that matter."),
        ("Where is it?", "The anatomy: what it touches, and what sits next to it."),
        ("How far has it spread?", "The stage: local, regional nodes, or distant disease."),
        ("What has already happened?", "Surgery, systemic therapy, and <strong>prior radiation</strong>, with the response to each."),
    ]),
    ("Decide", [
        ("What is the treatment intent?", "Curative or palliative. The single most important word in the chart (see below)."),
        ("What are the alternatives?", "Surgery, systemic therapy, observation, or a different radiation approach."),
        ("What does radiation add?", "The specific problem radiation is solving for this patient."),
    ]),
    ("Check feasibility", [
        ("What limits treatment?", "Nearby organs at risk, prior radiation, and the patient. <strong>Can I safely deliver the dose this problem needs?</strong>"),
    ]),
])}

<h3 id='intent'>Treatment Intent</h3>
<p>Intent has two layers. First, the <strong>goal</strong>: cure, or relief of symptoms. Second, the <strong>role</strong> radiation plays in reaching it.</p>
{table(["Intent", "Goal", "Example"], [
    ["<strong>Curative</strong>", "Eradicate the disease. Definitive, neoadjuvant, and adjuvant RT usually serve this goal.", "Any of the next three examples"],
    ["<strong>Definitive</strong>", "Cure without surgery; radiation (often with chemotherapy) is the main local treatment.", "Chemoradiation for anal or cervical cancer"],
    ["<strong>Neoadjuvant</strong>", "Before definitive local therapy, to improve local control, resectability, or organ preservation.", "Rectal cancer before surgery; esophageal chemoradiation before esophagectomy"],
    ["<strong>Adjuvant</strong>", "Eliminate microscopic residual disease after surgery.", "Whole-breast RT after lumpectomy; postoperative head and neck RT"],
    ["<strong>Consolidative</strong>", "Improve control after another treatment modality, usually chemotherapy.", "RT to residual bulky lymphoma after chemotherapy"],
    ["<strong>Oligometastatic</strong>", "Durable control of limited metastatic disease in selected patients.", "SBRT to a few metastases alongside systemic therapy"],
    ["<strong>Palliative</strong>", "Relieve symptoms or prevent complications.", "A single fraction for a painful bone metastasis; RT for bleeding or cord compression"],
])}
<div class='big-idea'>Name the intent before you name a dose. Intent decides how much toxicity is acceptable, how long the course should be, and how aggressive the plan is.</div>
<div class='quiz-carousel' data-quiz-set='rad101-intents'></div>

<h3 id='alternatives'>Radiation Is Not the Default Answer</h3>
<p>A good consult compares radiation with the real alternatives:</p>
{table(["The decision", "Example"], [
    ["Surgery vs. definitive RT", "Localized prostate cancer; early glottic larynx cancer; early lung cancer in a patient who can't have surgery"],
    ["Observation vs. adjuvant RT", "An older patient with small, low-risk, hormone-positive breast cancer taking endocrine therapy"],
    ["RT vs. systemic therapy", "Widespread metastatic disease, where systemic therapy treats everywhere and RT treats one spot"],
    ["Radiation now vs. later", "Adjuvant vs. early salvage RT after prostatectomy"],
])}
<p>Then ask the key question:</p>
<div class='big-idea'>What problem is radiation solving?</div>
{cards([
    ("Eradicate microscopic disease", "After surgery, in the tumor bed or nodes."),
    ("Sterilize gross tumor", "Definitive treatment of a visible cancer."),
    ("Improve local control", "Lower the chance of recurrence where it started."),
    ("Preserve an organ", "Larynx, anus, bladder, breast, sometimes rectum."),
    ("Palliate bleeding", "Tumors of the bladder, rectum, lung, or cervix."),
    ("Relieve pain", "Bone metastases, most often."),
    ("Decompress the cord", "Metastatic spinal cord compression."),
    ("Treat oligometastatic disease", "Ablate a few metastases in selected patients."),
], numbered=False)}

<h3 id='limits'>What Limits Treatment?</h3>
<p>Even when radiation would help, something may limit how much you can give:</p>
<ul>
<li><strong>Organs at risk</strong> next to the target (spinal cord, bowel, optic nerves).</li>
<li><strong>Prior radiation</strong> to the same or an overlapping region.</li>
<li><strong>The patient:</strong> performance status, ability to lie still or hold their breath, connective tissue disease, and their own priorities and logistics.</li>
</ul>
<div class='big-idea'>Can I safely deliver the dose this problem needs? That question is the bridge into Treatment Planning.</div>

<h3 id='worked'>Putting It Together: One Consult, Nine Answers</h3>
<div class='worked-example'>
<span class='worked-example-label'>Worked Example</span>
<p>A 78-year-old man with severe COPD has a 2 cm peripheral right upper lobe adenocarcinoma. PET/CT shows no nodal or distant disease. Thoracic surgery feels he can't tolerate a lobectomy.</p>
{table(["Question", "Answer"], [
    ["Why referred?", "Definitive treatment of early-stage lung cancer"],
    ["Diagnosis?", "Biopsy-proven adenocarcinoma"],
    ["Where?", "Peripheral right upper lobe, away from the central airways"],
    ["How far?", "cT1bN0M0 on PET/CT"],
    ["What's happened?", "Nothing yet; no prior chest radiation"],
    ["Intent?", "Curative"],
    ["Alternatives?", "Surgery (not fit), SBRT, or observation given competing health risks"],
    ["What does RT add?", "Ablates the gross tumor, with high rates of local control"],
    ["What limits it?", "Lung function, the nearby chest wall, and breathing motion (needs 4D-CT)"],
])}
<p><strong>Recommendation:</strong> SBRT.</p>
</div>

<h3 id='in-the-room'>In the Room</h3>
<p>By the time you walk in, you should know most of the story from the chart. Your job in the room is to <strong>verify it, fill the gaps, and understand the patient</strong>.</p>
<ul>
<li><strong>Verify the history:</strong> how it was found, what treatment happened in what order, and especially any <strong>prior radiation</strong> (site and timing). Patients often correct the chart.</li>
<li><strong>Current symptoms:</strong> pain, bleeding, dysphagia, weight loss, neurologic change. These may become targets or change the urgency.</li>
<li><strong>The patient's perspective:</strong> what they've been told and what matters to them. Two patients with the same diagnosis may reasonably choose differently.</li>
<li><strong>Know your role:</strong> ask beforehand whether your attending wants just the history or your attempt at the assessment and plan.</li>
</ul>
<h4>Explaining radiation: the &ldquo;spiel&rdquo;</h4>
<p>Most attendings have a standard plain-language explanation. Developing your own is one of the most useful skills you can practice.</p>
<div class='script-box'>
<span class='script-label'>Sample script</span>
&ldquo;We're the doctors who treat cancer with radiation, a type of x-ray beam like a CT scan uses, aimed from different directions so the dose concentrates where the cancer is.<br><br>
First you'll come in for a simulation: a CT scan in the exact position you'll be treated in. Nothing is treated that day. Over the next one to two weeks, our team builds and checks your plan.<br><br>
Then you'll come in [Monday through Friday] for about [X] weeks. Plan on about an hour per visit, though the radiation itself takes only a few minutes; most of the time is lining you up precisely.<br><br>
Most people feel fine at first. Side effects build gradually, so the later weeks are usually harder than the first.&rdquo;
</div>
<p>Then tailor the side effects to the site: mucositis and swallowing for head and neck, skin for breast, bowel and bladder for the pelvis.</p>
<div class='quiz-carousel' data-quiz-set='consult-spiel'></div>

{summary([
    "The consult is how you think through a patient: what problem would radiation solve, and is it the best way to solve it?",
    "Work through nine questions: referral reason, diagnosis, location, stage, prior treatment, intent, alternatives, what radiation adds, and what limits treatment.",
    "Intent is the most important word in the chart; name the goal (curative or palliative) and the role (definitive, neoadjuvant, adjuvant, consolidative, oligometastatic) before naming a dose.",
    "Radiation is not the default answer; compare it honestly with surgery, systemic therapy, and observation.",
    "In the room, verify the history (especially prior radiation), learn what matters to the patient, and explain simulation, planning, treatment, and side effects in plain language.",
])}
"""

# ---------------------------------------------------------------------------
# 06  TREATMENT PLANNING
# ---------------------------------------------------------------------------
NESTED_SVG = """<figure>
<svg viewBox='0 0 520 300' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='nesttitle'>
<title id='nesttitle'>Schematic nested target volumes on an axial chest CT: GTV inside CTV inside ITV inside PTV</title>
<rect x='0' y='0' width='520' height='300' rx='14' fill='#06090d'/>
<ellipse cx='185' cy='150' rx='155' ry='118' fill='#20262d'/>
<ellipse cx='185' cy='150' rx='155' ry='118' fill='none' stroke='#3a4048' stroke-width='2'/>
<path d='M255,95 C290,85 320,105 330,135 C338,158 328,180 305,192 C280,204 250,198 235,178 C222,160 225,120 255,95 Z' fill='none' stroke='#f5b942' stroke-width='2.5' stroke-dasharray='2 6' stroke-linecap='round'/>
<path d='M262,105 C290,97 313,113 320,137 C326,156 317,173 298,183 C278,193 254,188 242,172 C231,157 235,124 262,105 Z' fill='none' stroke='#4ade80' stroke-width='2.5' stroke-linecap='round'/>
<path d='M268,113 C288,108 304,120 309,138 C314,153 307,166 292,174 C277,181 259,177 250,164 C242,152 246,128 268,113 Z' fill='none' stroke='#60a5fa' stroke-width='2.5' stroke-linecap='round'/>
<path d='M274,120 C288,117 298,126 301,138 C304,148 299,157 289,163 C278,168 265,165 259,156 C253,148 256,131 274,120 Z' fill='#ef4444' fill-opacity='0.85' stroke='#ef4444' stroke-width='2'/>
<circle cx='400' cy='60' r='6' fill='#ef4444'/>
<text x='412' y='65' font-size='13' fill='#e7ebf0' font-family='var(--font-body)'>GTV: visible tumor</text>
<circle cx='400' cy='90' r='6' fill='none' stroke='#60a5fa' stroke-width='2.5'/>
<text x='412' y='95' font-size='13' fill='#e7ebf0' font-family='var(--font-body)'>CTV: + microscopic</text>
<circle cx='400' cy='120' r='6' fill='none' stroke='#4ade80' stroke-width='2.5'/>
<text x='412' y='125' font-size='13' fill='#e7ebf0' font-family='var(--font-body)'>ITV: + internal motion</text>
<circle cx='400' cy='150' r='6' fill='none' stroke='#f5b942' stroke-width='2.5'/>
<text x='412' y='155' font-size='13' fill='#e7ebf0' font-family='var(--font-body)'>PTV: + setup error</text>
</svg>
<figcaption>
Schematic axial chest CT (not a real scan) showing nested target volumes for a lung tumor. Each layer adds a margin for one specific source of uncertainty.
</figcaption>
</figure>"""

DVH_SVG = """<figure>
<svg viewBox='0 0 520 300' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='dvhtitle'>
<title id='dvhtitle'>Sample dose-volume histogram showing a target curve and an organ-at-risk curve</title>
<line x1='55' y1='20' x2='55' y2='250' stroke='var(--ink-faint)' stroke-width='1.5'/>
<line x1='55' y1='250' x2='490' y2='250' stroke='var(--ink-faint)' stroke-width='1.5'/>
<text x='14' y='24' font-size='11' fill='var(--ink-faint)' font-family='var(--font-mono)'>% Volume</text>
<text x='420' y='272' font-size='11' fill='var(--ink-faint)' font-family='var(--font-mono)'>Dose (Gy) &rarr;</text>
<line x1='340' y1='20' x2='340' y2='250' stroke='var(--ink-faint)' stroke-width='1' stroke-dasharray='4 5'/>
<text x='300' y='14' font-size='10.5' fill='var(--ink-faint)' font-family='var(--font-mono)'>Rx dose</text>
<path d='M55,32 L300,32 C320,32 330,50 335,80 C338,110 339,180 340,250' fill='none' stroke='var(--accent)' stroke-width='3' stroke-linecap='round'/>
<path d='M55,32 C110,60 150,95 190,130 C240,172 290,205 340,222 C380,234 420,242 460,246' fill='none' stroke='var(--accent-2)' stroke-width='3' stroke-linecap='round'/>
<circle cx='190' cy='130' r='4.5' fill='var(--accent-2)'/>
<text x='198' y='126' font-size='10.5' fill='var(--ink-soft)' font-family='var(--font-mono)'>D_mean</text>
<circle cx='340' cy='222' r='4.5' fill='var(--accent-2)'/>
<text x='348' y='218' font-size='10.5' fill='var(--ink-soft)' font-family='var(--font-mono)'>D_max</text>
</svg>
<figcaption>
Sample DVH (not real patient data). <span style='color:var(--accent);font-weight:700;'>&#9679; Target</span> stays near 100% of its volume up to the prescription dose, then drops sharply: good coverage. <span style='color:var(--accent-2);font-weight:700;'>&#9679; OAR</span> slopes down early: most of the organ gets little dose.
</figcaption>
</figure>"""

ISODOSE_SVG = """<figure>
<svg viewBox='0 0 520 300' xmlns='http://www.w3.org/2000/svg' role='img' aria-labelledby='isotitle'>
<title id='isotitle'>Schematic isodose lines wrapping a PTV, with a hotspot and a spared nearby organ at risk</title>
<rect x='0' y='0' width='520' height='300' rx='14' fill='#06090d'/>
<ellipse cx='230' cy='150' rx='190' ry='125' fill='#20262d'/>
<path d='M120,90 C170,60 260,58 305,85 C345,108 355,150 335,190 C315,228 260,245 205,235 C155,226 110,195 100,150 C95,125 100,105 120,90 Z' fill='#f59e0b' fill-opacity='0.10' stroke='#f59e0b' stroke-width='1.5' stroke-dasharray='3 5'/>
<path d='M135,100 C178,76 255,74 292,97 C324,116 332,150 316,182 C300,213 254,228 208,220 C167,213 132,188 124,150 C120,130 122,113 135,100 Z' fill='#4ade80' fill-opacity='0.14' stroke='#4ade80' stroke-width='2'/>
<path d='M150,112 C185,93 245,92 273,111 C298,127 304,150 292,175 C280,199 244,211 208,205 C176,199 149,180 143,150 C140,134 141,122 150,112 Z' fill='#f5b942' fill-opacity='0.22' stroke='#f5b942' stroke-width='2'/>
<path d='M167,124 C193,110 233,109 253,124 C271,136 275,150 266,168 C257,186 231,194 205,190 C182,186 165,172 161,150 C159,138 160,131 167,124 Z' fill='#ef4444' fill-opacity='0.75' stroke='#ef4444' stroke-width='2'/>
<circle cx='222' cy='142' r='9' fill='#fff' fill-opacity='0.9' stroke='#fff' stroke-width='1'/>
<ellipse cx='400' cy='170' rx='34' ry='44' fill='#60a5fa' fill-opacity='0.5' stroke='#60a5fa' stroke-width='2'/>
<text x='400' y='172' font-size='11' fill='#06090d' font-family='var(--font-body)' text-anchor='middle' font-weight='700'>OAR</text>
<circle cx='430' cy='55' r='6' fill='none' stroke='#f5b942' stroke-width='2'/>
<text x='442' y='60' font-size='12' fill='#e7ebf0' font-family='var(--font-body)'>Prescription isodose</text>
<circle cx='430' cy='80' r='6' fill='none' stroke='#4ade80' stroke-width='2'/>
<text x='442' y='85' font-size='12' fill='#e7ebf0' font-family='var(--font-body)'>Lower isodose (falloff)</text>
<circle cx='430' cy='105' r='6' fill='#fff'/>
<text x='442' y='110' font-size='12' fill='#e7ebf0' font-family='var(--font-body)'>Hotspot</text>
</svg>
<figcaption>
Schematic dose distribution (not a real plan). Isodose lines hugging the dashed PTV mean good coverage and conformity. The white spot is a hotspot. The blue OAR sits outside the higher isodose lines.
</figcaption>
</figure>"""

PLANNING = f"""
<p>The consult decided <em>whether</em> and <em>why</em>. This reading is about <strong>how a physician turns the clinical problem into an actual radiation plan</strong>, and why you can't simply give more radiation.</p>

<h3 id='problem'>The Planning Problem: Target, OARs, Dose</h3>
<p>Every plan balances three things:</p>
{cards([
    ("Target", "What am I trying to kill?"),
    ("OARs", "What am I trying to protect?"),
    ("Dose", "How much radiation does the target need?"),
])}
<div class='big-idea'>That is the entire planning problem. Everything else on this page is vocabulary for one of those three.</div>

<h3 id='volumes'>Target Volumes: GTV, CTV, ITV, PTV</h3>
<p>Targets are drawn as nested layers, each adding a margin for one kind of uncertainty.</p>
<dl class='spec-list'>
<div class='spec-row'><dt>GTV</dt><dd><strong>Gross tumor volume:</strong> visible or palpable disease.</dd></div>
<div class='spec-row'><dt>CTV</dt><dd><strong>Clinical target volume:</strong> GTV plus tissue at risk for microscopic disease.</dd></div>
<div class='spec-row'><dt>ITV</dt><dd><strong>Internal target volume:</strong> accounts for internal motion, such as breathing.</dd></div>
<div class='spec-row'><dt>PTV</dt><dd><strong>Planning target volume:</strong> accounts for setup and geometric uncertainty from day to day.</dd></div>
</dl>
{NESTED_SVG}
<p>The definitions matter less than knowing how they're used. Three examples:</p>
{cards([
    ("Lung SBRT", "GTV on a breathing (4D) CT &rarr; ITV covering where it moves &rarr; PTV. Often no separate CTV expansion."),
    ("Postoperative breast", "The tumor is gone, so there's no GTV. The surgical bed and at-risk breast tissue form the CTV &rarr; PTV."),
    ("Glioblastoma", "Resection cavity and residual enhancing tumor (GTV) &rarr; CTV for infiltrating cells, trimmed at anatomic barriers &rarr; PTV."),
], numbered=False)}
<h4>When a layer gets skipped</h4>
<ul>
<li><strong>Brain metastasis or vestibular schwannoma:</strong> well-defined and not microscopically infiltrative, so <strong>no CTV</strong>; GTV goes straight to PTV.</li>
<li><strong>Prostate:</strong> the cancer usually isn't reliably seen and is often multifocal, so there's <strong>no distinct GTV</strong>; the whole prostate (&plusmn; seminal vesicles) is the CTV.</li>
</ul>
<div class='contour-exercise' id='exercise-gtv-brainmet'></div>

<h3 id='oars'>Organs at Risk</h3>
<p>Organs at risk (OARs) are contoured too, because a structure that isn't drawn can't be protected. Which ones matter depends on location. A useful first model sorts organs by how they respond to dose:</p>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>Serial-type organs</span>
<h5>The maximum dose gets attention</h5>
<p>Function depends on every segment, like links in a chain, so a small overdosed region can matter. Classic examples: spinal cord, brainstem, optic pathway.</p>
</div>
<div class='compare-col'>
<span class='compare-label'>Parallel-type organs</span>
<h5>The mean dose or volume gets attention</h5>
<p>Function is spread across many units, so the organ can tolerate a small high-dose region if enough of it is spared. Classic examples: lung, liver, kidney, parotid.</p>
</div>
</div>
<p>Treat this as a way to read a constraint, not a clinical rule. Many organs behave partly both ways (bowel, esophagus, and heart all have maximum-dose and volume limits), and the actual limits depend on the site, the fractionation, and the protocol your department follows.</p>
<div class='contour-exercise' id='exercise-oar-rectum'></div>

<h3 id='sequence'>The Planning Sequence</h3>
{vflow([
    (None, [
        ("Simulation", "Position, immobilization, and a planning CT (4D-CT or breath-hold when motion matters)."),
        ("Image fusion", "MRI, PET, or diagnostic imaging registered to the CT when needed. MRI shows soft tissue; the CT provides the density data used to calculate dose."),
        ("Contouring", "GTV, CTV, and OARs, drawn slice by slice."),
        ("Prescription", "The physician sets the total dose and number of fractions for each target."),
        ("Planning", "Choose the technique and the beams or arcs."),
        ("Optimization", "The planning system and dosimetrist push target coverage up and OAR dose down, trading one against the other."),
        ("Evaluate", "The physician reviews the DVH and the isodose lines slice by slice."),
        ("QA", "Physics verifies the plan is deliverable, often by measuring it on the machine before the first treatment."),
        ("Image guidance", "Before each treatment, imaging confirms the patient and target are where the plan expects."),
    ]),
])}

<h3 id='dvh'>The DVH in One Minute</h3>
<p>A <strong>dose-volume histogram (DVH)</strong> summarizes how much of each structure's volume receives different dose levels. One curve per structure:</p>
<div class='compare-grid'>
<div class='compare-col'>
<span class='compare-label'>Target</span>
<h5>High dose to nearly all of it</h5>
<p>The curve stays flat near 100% until the prescription dose, then drops steeply.</p>
</div>
<div class='compare-col'>
<span class='compare-label'>OAR</span>
<h5>As little dose as reasonably achievable</h5>
<p>The curve should fall early: most of the organ gets little dose.</p>
</div>
</div>
{DVH_SVG}
<p>Dose limits are written in DVH language. A limit like &ldquo;lung V20 &lt; 30%&rdquo; means less than 30% of the lung should receive 20 Gy or more (the exact number depends on the protocol). You don't need to interpret complicated DVHs yet; know what the curves are trying to show.</p>
<div class='pearl'>
<strong>Clinical Pearl</strong>
A DVH tells you <em>how much</em> dose, not <em>where</em>. A plan can look fine on the DVH and still put a hotspot somewhere it shouldn't, so attendings always scroll through the isodose lines too.
</div>

<h3 id='coverage-toxicity'>Coverage vs. Toxicity</h3>
<div class='big-idea'>A good plan is not the plan with the lowest OAR dose. It's the plan that adequately treats the target while keeping normal-tissue toxicity acceptable.</div>
<ul>
<li><strong>Coverage:</strong> does the whole target, edges included, get the prescribed dose?</li>
<li><strong>Conformity:</strong> how tightly does the high-dose region hug the target?</li>
<li><strong>Hotspots:</strong> small areas above the intended dose. Usually fine inside the tumor; not fine inside an OAR.</li>
</ul>
{ISODOSE_SVG}
<p>When the two goals collide, the physician decides. If the PTV overlaps the spinal cord, for example, the plan usually accepts slightly lower coverage in the overlap to respect the cord.</p>
<h4>Following along at plan review: CB-CHOP</h4>
<p>Many residents check a plan in this order, and you can follow along with it:</p>
{table(["Letter", "Question"], [
    ["<strong>C</strong>ontours", "Is everything we're treating and protecting drawn correctly?"],
    ["<strong>B</strong>eams", "Does the beam or arc arrangement make sense?"],
    ["<strong>C</strong>overage", "Is the target getting its full dose?"],
    ["<strong>H</strong>otspots", "Is anywhere getting more than intended, especially an OAR?"],
    ["<strong>O</strong>ARs", "Are normal structures within their limits on the DVH?"],
    ["<strong>P</strong>rescription", "Does the plan match the dose, fractions, and target ordered?"],
])}

<h3 id='technique'>Choosing a Technique</h3>
<p>Technique follows geometry (see <em>Radiation Modalities</em>):</p>
<ul>
<li><strong>3D-CRT</strong> when the geometry is relatively simple.</li>
<li><strong>IMRT / VMAT</strong> when the target and OARs are tangled together.</li>
<li><strong>SBRT / SRS</strong> when high precision allows ablative dosing to a small target.</li>
<li><strong>Protons</strong> when the physical dose distribution may offer a meaningful advantage.</li>
<li><strong>Brachytherapy</strong> when bringing the source close to the target creates a superior dose distribution.</li>
</ul>

<h3 id='why-not-more'>Why Can't We Just Give More Radiation?</h3>
<div class='big-idea'>Because normal tissues have dose limits.</div>
<p>Every target sits next to something you can't afford to injure. These are the OARs you'll hear about most:</p>
{table(["Organ at risk", "What you're trying to prevent"], [
    ["Spinal cord", "Myelopathy (paralysis)"],
    ["Brainstem", "Brainstem injury"],
    ["Optic nerves and chiasm", "Vision loss"],
    ["Bowel", "Obstruction, stricture, perforation"],
    ["Rectum", "Proctitis and bleeding"],
    ["Bladder", "Cystitis and bleeding"],
    ["Lung", "Pneumonitis and fibrosis"],
    ["Heart", "Late cardiac events"],
    ["Liver", "Radiation-induced liver disease"],
    ["Kidneys", "Loss of renal function"],
])}
<p>Exact limits come from protocols and your institution and depend on fractionation. Each disease-site module teaches the OARs that matter for that cancer.</p>

<h3 id='apply'>Now Apply It</h3>
<p>You now have the whole workflow: understand radiation &rarr; understand the tools &rarr; present the patient &rarr; decide whether radiation helps &rarr; design the treatment. Every disease-site module asks the same questions for one cancer: what is it, where is it, how far has it spread, what is radiation's job, and what limits the plan.</p>

{summary([
    "Every plan balances three things: the target, the organs at risk, and the dose the target needs.",
    "Targets nest outward from GTV (visible tumor) to CTV (microscopic risk), ITV (internal motion), and PTV (setup uncertainty), and not every case uses every layer.",
    "The planning sequence runs simulation, image fusion, contouring, prescription, planning, optimization, evaluation, QA, and daily image guidance.",
    "A DVH shows how much of each structure gets each dose; the target should get high dose to nearly all of it, and OARs as little as reasonably achievable.",
    "A good plan adequately treats the target while keeping toxicity acceptable, and normal-tissue limits are why we can't simply give more radiation.",
])}
"""

SECTIONS = [
    {
        "id": "rad-onc-101", "num": 1, "title": "Radiation 101",
        "question": "What actually happens when a patient gets radiation?",
        "objectives": [
            "Explain the radiation treatment workflow.",
            "Define dose, fraction, and treatment course.",
            "Explain why radiation is fractionated.",
            "Describe what happens before, during, and after treatment.",
        ],
        "html": RAD101,
    },
    {
        "id": "how-rt-works", "num": 2, "title": "How Radiation Works",
        "question": "Why does radiation kill cancer cells, and why does normal tissue get hurt?",
        "objectives": [
            "Explain direct vs. indirect DNA damage.",
            "Explain the 4 R's.",
            "Explain why fractionation works.",
            "Explain why normal-tissue toxicity occurs.",
        ],
        "html": HOWRT,
    },
    {
        "id": "machines-modalities", "num": 3, "title": "Radiation Modalities",
        "question": "What tools does a radiation oncologist have?",
        "objectives": [
            "Distinguish external beam radiation from brachytherapy.",
            "Explain IMRT, VMAT, SRS, SBRT, protons, and brachytherapy.",
            "Identify when each modality is generally useful.",
        ],
        "html": MODALITIES,
    },
    {
        "id": "presenting-patients", "num": 4, "title": "How to Give a Presentation",
        "question": "How do I present a patient like a Rad Onc trainee?",
        "objectives": [
            "Give a concise Rad Onc one-liner.",
            "Present pathology, imaging, and stage efficiently.",
            "State the assessment and radiation recommendation clearly.",
        ],
        "html": PRESENTATION,
    },
    {
        "id": "the-consult", "num": 5, "title": "The Rad Onc Consult",
        "question": "How do I decide whether, and how, radiation should be used?",
        "objectives": [
            "Establish the treatment intent.",
            "Determine whether radiation has a role.",
            "Compare radiation with surgery, systemic therapy, and observation.",
            "Identify the major benefits, risks, and alternatives.",
        ],
        "html": CONSULT,
    },
    {
        "id": "treatment-planning", "num": 6, "title": "Treatment Planning",
        "question": "How do I turn that decision into a safe radiation plan?",
        "objectives": [
            "Define GTV, CTV, ITV, and PTV.",
            "Identify organs at risk.",
            "Explain CT simulation and image fusion.",
            "Interpret the basic purpose of a DVH.",
            "Explain how a plan balances target coverage and normal-tissue sparing.",
        ],
        "html": PLANNING,
    },
]


def main():
    for s in SECTIONS:
        s["html"] = s["html"].strip() + "\n"
        assert "&mda" + "sh;" not in s["html"] and "\u2014" not in s["html"], f"em dash in {s['id']}"
    with open(OUT, "w") as f:
        json.dump(SECTIONS, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"wrote {OUT} ({len(SECTIONS)} readings)")


if __name__ == "__main__":
    main()
