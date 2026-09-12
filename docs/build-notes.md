---
title: RadOnc Sub-I Companion — build notes
description: Status and structure of the flashcard + reading-doc study app built for the radiation oncology sub-internship rotation
---

# RadOnc Sub-I Companion

Published artifact: https://claude.ai/code/artifact/6ab831b9-38fb-4374-add0-f4334d5cac56 (Version 4, republished directly this round — Sophia opted for auto-republish for this update, in contrast to the Part 3/4 rounds where she asked for the file only).

A flashcard-style active-recall study app (spaced repetition, mastery tracking, due-today counts) modeled on the "ENT Rotation Companion" reference app, built for medical students on the radiation oncology sub-internship. Each disease-site category also has a long-form reading doc for deeper study before drilling flashcards. As of this round, the app now opens with a 10-section "Before You Start" background/orientation module ahead of the 8 disease-site tiles.

## Scope (per Sophia's confirmed requirements)
- 8 subspecialty tiles: Overview, Head & Neck, Breast, Thoracic, Prostate, GYN, CNS, GI
- Format: flashcard active-recall (not reference notes) — later extended with reading docs per category, and now a background/orientation module (reading only, no flashcards)
- Depth: condensed high-yield for flashcards (pearls only); reading docs are meaningfully deeper/more explanatory, ~500-1000+ words each, written for a med/college-level student
- Content sources: the "Rad Onc Talks" Google Drive lecture decks (owned by a colleague, rmulherkar48@gmail.com) + Radiopaedia for imaging pearls + PMC (PubMed Central) open-access journal figures for actual radiographic images

## Content pipeline
1. Downloaded all relevant PDFs from Google Drive (Chrome browser automation — Drive's search API doesn't index files the connected account hasn't personally viewed, so bulk folder browsing/download was used instead).
2. Extracted text via `pdftotext -layout` — 49 PDFs, ~16,000 lines, covering all 8 disease sites plus Intro/Physics/RadBio/Reviews folders.
3. Researched imaging pearls per disease site from Radiopaedia.org (parallel subagent research), saved as markdown per service.
4. Converted source text + imaging pearls into structured JSON flashcard decks (parallel subagents per service), 40-45 cards each, 347 cards total, organized into 5-6 categories per service (Epidemiology, Anatomy/Staging, Imaging, Treatment Paradigms, High-Yield Literature, etc.)
5. Built a single self-contained HTML app (Sora/IBM Plex type system, isodose-inspired per-service color coding, light/dark theme support) with a simplified Leitner-box spaced-repetition engine, persisted via browser localStorage (per-viewer, on the artifact's own origin).
6. **[Part 2] Added reading docs**: parallel subagents per service wrote one long-form HTML doc per category (48 docs total) from the same source material — underlined titles, bolded key concepts/treatment paradigms, simple-then-detailed explanatory prose, "Clinical Pearl" callout boxes, and (originally) hand-coded inline SVG diagrams. Clicking a category row opens its doc; the "Study" button still launches the flashcard session for that category.
7. **[Part 3] Revision pass**, in response to Sophia's feedback that the writing read as AI-generated and the diagrams looked "off":
   - Removed every em-dash (both the raw "—" character and "&mdash;" entities) from all 347 cards and 48 docs, and from the app's own UI copy.
   - Removed all 27 hand-coded inline SVG diagrams — several had text/lines rendering in the wrong place.
   - Reformatted all 10 "Treatment Paradigms" sections (across Breast, CNS ×2, GI ×2, GYN, Head & Neck, Prostate ×2, Thoracic) from prose blocks into scenario → dose/fractionation bullet lists (e.g. "Node-negative, breast-conserving surgery → 40 Gy/15 fx or 50 Gy/25 fx whole-breast RT"), for faster morning-of-clinic scanning. Existing dose tables and Clinical Pearl callouts were preserved as-is.
   - Added one real radiographic image (disease-specific finding) to each service's Imaging doc, sourced from PubMed Central (PMC) open-access articles under CC BY (or CC BY-NC) licenses, with attribution captions:
     - **CNS** — T1 post-contrast MRI, thalamic glioblastoma (Front Neurol 2021, PMC8631300, CC BY 4.0)
     - **Prostate** — T2/ADC MRI, PI-RADS 5 lesion (Br J Radiol 2022, PMC8978244)
     - **Breast** — mammography + contrast-enhanced imaging, DCIS non-mass enhancement (Insights Imaging 2025, PMC11933581, CC BY 4.0)
     - **GI** — T2 MRI, rectal cancer T1–T4a staging panel (World J Clin Oncol 2017, PMC5465011, CC BY-NC 4.0)
     - **GYN** — T2/DWI/DCE MRI, cervical cancer parametrial invasion (Insights Imaging 2019, PMC6375059, CC BY 4.0)
     - **Thoracic** — CT + fused FDG PET-CT, lung cancer vs. atelectasis (Diagnostics 2025, PMC11988785, CC BY 4.0)
     - **Head & Neck** — axial CT, laryngeal T3/T4a cartilage invasion (PLoS One 2025, PMC12404499, CC BY 4.0)
   - Radiopaedia images were not used for reproduction (visible in-browser but not licensed for redistribution in a shareable app). Wikimedia Commons images could not be loaded at all in this environment.
   - Overview category was left without a radiographic image (it's a cross-cutting RT-concepts category, not tied to one imaging modality/site).
8. **[Part 4] Readability + normal-anatomy images + high-yield staging pass**, in response to Sophia's feedback ("I really like it... add more images showing normal anatomy... fewer blocks of text... high yield things about the staging... mnemonics... do less for the literature sheet"):
   - **Reformatting**: all 48 docs restructured for scannability — more subheadings, shorter paragraphs, more bullet points — across all 8 services including Overview.
   - **High-Yield staging boxes**: added a `.pearl` callout labeled "High-Yield" to the Workup & Staging (or equivalent) category of each of the 7 disease sites, summarizing the stage/substage dividers and specific upstaging findings that actually change treatment (e.g. prostate GG2 vs GG3, cervical IIB/IB3 surgical-vs-chemoRT cutoff, rectal MRF 1mm cutoff, laryngeal cartilage breakthrough). Overview has no staging content so was skipped.
   - **Mnemonics, used sparingly**: added only where a genuinely good fit existed — CNS (MEAN/AMEN grading), Thoracic (nodal station numbering), GI (converted a pre-existing inline ABCDEF/BOG mnemonic into a proper callout box), Overview (Four R's of radiobiology; "Growing Circles Include Padding" for GTV→CTV→ITV→PTV). GYN and Head & Neck deliberately did not get one (no natural fit) rather than forcing it.
   - **Literature trimmed**: each site's "High-Yield Literature" category cut from 8-17 trials down to the 5 most essential (e.g. Prostate: CHHiP/PROFIT, RAVES/RADICALS-RT/GETUG-AFU17, RTOG 9601, STAMPEDE, VISION).
   - **Normal-anatomy images added**: one additional labeled image per disease site (7 total, all 8 services now have 2 figures each except Overview), showing normal anatomic landmarks (vessels especially) rather than pathology, inserted into the Anatomy & Lymphatics category where one exists (Breast, GYN, Thoracic, Head & Neck) or into Imaging/Workup & Staging otherwise (CNS, Prostate, GI):
     - **Thoracic** — 4-panel labeled MRI: trachea, spinal cord, pulmonary artery, carina, SVC, pericardial sac, aorta (PMC13053797, CC BY 4.0)
     - **Head & Neck** — illustration of the carotid space labeling the carotid artery, jugular vein, and cranial nerves IX-XII (Chengazi & Bhatt, Insights Imaging 2019, PMC6377693, CC BY 4.0)
     - **Breast** — cadaveric axillary dissection showing the axillary vein, pectoralis muscles, serratus anterior (Cocco et al., Insights Imaging 2023, PMC10175532, CC BY 4.0)
     - **GYN** — axial/coronal CT showing ovarian vessels in the suspensory ligament next to the external iliac vessels (Tonolini et al., Insights Imaging 2019, PMC6920287, CC BY 4.0)
     - **GI** — sagittal pelvic MRI showing the superior rectal artery/vein and presacral venous plexus (Bogveradze et al., Insights Imaging 2023, PMC9849549, CC BY 4.0)
     - **CNS** — sagittal T1 MRI showing normal flow void in the superior sagittal sinus (Pai et al., J Clin Imaging Sci 2020, PMC7749941, CC BY-NC-SA 4.0)
     - **Prostate** — T2WI panels showing peripheral/transition zone anatomy across the age spectrum (Panebianco et al., Insights Imaging 2015, PMC4656245, CC BY 4.0)
   - Note on image selection: several strong-looking candidates were rejected for licensing reasons consistent with the Part 3 discipline (only CC BY / CC BY-NC used, no CC BY-NC-ND, no "reprinted with permission" third-party figures even inside an otherwise-CC-BY article, no plain "all rights reserved" NIH manuscript deposits). Where a truly clean, pathology-free "normal anatomy" image could not be found after a reasonable search (Prostate, CNS, GI, GYN), the chosen image is a real diagnostic study that clearly labels the requested normal landmark even though an incidental or comparison finding is also visible in the frame — the same tolerance used for the Part 3 disease images.
   - All changes independently validated (JSON parses, keys/titles unchanged, zero em-dashes, all 14 embedded JPEGs decode correctly, JS syntax check on rebuilt app passes) before delivery.
9. **[Part 5] Added the "Before You Start" background/orientation module**, a 10-section onboarding path sitting above the 8 disease-site tiles, addressing a different need than the disease-site decks: general rotation functioning rather than disease-specific content. Sophia supplied a fully worked structural outline (informed by feedback on an earlier draft list) specifying exactly these 10 sections, in this order:
   1. Radiation Oncology 101
   2. Your Rad Onc Sub-I
   3. The Rad Onc Consult (includes a worked example consult note)
   4. How to Present a Patient (includes a worked example new-patient oral presentation, same fictional composite patient as #3 for continuity)
   5. The Radiation Treatment Journey (8-step consult-to-follow-up pipeline, with a two-row visual flow diagram)
   6. Radiation Machines & Modalities
   7. How Radiation Works (deliberately short radiobio + physics, cross-referencing the deeper Overview flashcard deck for exam-level detail)
   8. Simulation 101 (includes a 4-step patient → immobilization → CT → treatment position visual)
   9. Contouring & Treatment Planning 101
   10. OTVs
   - Each section is ~700-1300 words ("about two pages typed"), conversational tone, liberal bolding and numbered/bulleted lists, and ends in a "High-Yield Summary" callout box (reusing the existing `.pearl` visual style).
   - New reusable components added: `.worked-example` (bordered box with mono-font sub-headers, used for the consult note and presentation script), `.flow-diagram`/`.flow-step`/`.flow-arrow`/`.flow-connector` (simple step-by-step visual, wraps to a vertical layout on mobile).
   - Background pages reuse the existing doc-view template but hide the flashcard CTA (no flashcards for this module) and instead show Previous/Next section navigation, since these 10 pages are meant to be read in order once.
   - Fictional composite patient used in the worked examples ("Ms. R," Stage IA left breast cancer, adjuvant whole-breast RT) is clearly labeled as fictional/for teaching purposes only — not a real patient.
   - Sophia opted to have this round's rebuild auto-republished to the live artifact link (a change from the Part 3/4 workflow, where she'd asked for the file only).
10. **[Part 6] Moved the whole project to a local folder** (`~/Desktop/RadOnc-SubI-Companion`) so future work happens via a local Claude Code session instead of round-tripping through the cloud sandbox and the Artifact tool each time. The single 1.2MB `dist/index.html` was decomposed into modular source files (`src/styles.css`, `src/app.js`, `src/index.template.html`, and per-service JSON under `src/data/`) plus a plain-Node `build.js` that reassembles them into the same shareable single-file app. Verified the rebuild is functionally identical to the last-published artifact (headless-browser click-through of the dashboard, all 10 background sections, both worked examples, and the existing flashcard flow) before handing the folder over. Git-initialized with an initial commit. See this folder's own `README.md` for the day-to-day editing workflow.

## Deck sizes
Cards — overview: 43 · headneck: 40 · breast: 40 · thoracic: 45 · prostate: 44 · gyn: 45 · cns: 45 · gi: 45 (total 347)
Docs — 6 per service × 8 services = 48 total, 7 of which now carry two images each (one disease finding + one normal anatomy), all but Overview.
Background module — 10 sections, reading-only (no flashcards), sits above the 8 disease-site tiles on the dashboard.

## Possible future extensions
- Additional disease sites exist in the source Drive (GU, Lymphoma, Palliative, Pediatrics, Sarcoma, Skin) but were intentionally excluded — Sophia confirmed sticking to her original 8 tiles.
- The Oral Boards Review.pdf (75-page cross-cutting review deck) was downloaded but not yet mined for additional cards/doc content — could be a good source for a future "board review" bonus category.
- Additional images (e.g. a third image per Imaging doc) could be sourced the same way: search PMC full-text for a pictorial-review article in the disease site, verify CC BY/CC BY-NC licensing via the article's "Copyright and License information" toggle, then crop the relevant figure from its dedicated `/figure/F<N>/` page.
- The background module's worked examples currently cover only the breast cancer consult/presentation pair; additional worked examples for other disease sites were not requested but could be added later if wanted.
- Local source files from Parts 1-5 (PDFs + extracted text + original card/doc JSON + sourced images) lived under `/home/claude/radonc_work/` in earlier cloud build sessions and did not persist beyond those sessions. As of Part 6, this Desktop folder is the durable, version-controlled home for the project going forward — start here, not from a cloud session's scratch files.
