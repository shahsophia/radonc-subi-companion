# RadOnc Sub-I Companion

An active-recall flashcard + reading-doc study app for medical students on a radiation oncology sub-internship, plus a 10-section "Before You Start" background/orientation module.

Live version (may lag behind this folder until republished): https://claude.ai/code/artifact/6ab831b9-38fb-4374-add0-f4334d5cac56

## How this project is organized

The finished app is a single self-contained HTML file (`dist/index.html`) so it can be opened directly in any browser with no server and no build step required to *view* it. To make *editing* practical, the content is split into small source files under `src/`, and a build script glues them back into that one file.

```
RadOnc-SubI-Companion/
├── build.js                 Assembles src/ into dist/index.html. Run: node build.js (or python3 build.py)
├── dist/
│   └── index.html           The finished, shareable app. Open this file in a browser to use it.
├── src/
│   ├── index.template.html  The static HTML shell (title, fonts, page markup). Edit layout/markup here.
│   ├── styles.css           All CSS (design tokens, dark mode, every component style).
│   ├── app.js                All JS logic: SRS engine, rendering, view switching, event wiring.
│   └── data/
│       ├── services.json         The 8 disease-site tiles (id, name, icon, color, blurb).
│       ├── background.json       The 10 "Before You Start" sections (title, question, html).
│       ├── decks/<service>.json    Flashcards for one disease site (e.g. decks/breast.json).
│       │                           Card fields: id, category, front, back, and optional "extra" (shown under the answer).
│       ├── docs/<service>.json     Reading docs for one disease site, keyed by category.
│       ├── anatomy/<service>.json  Interactive anatomy plates (explore + arrow/MCQ quiz) for one site.
│       └── imaging/<service>.json  Interactive CT/MRI plates (same explore + quiz engine) for one site.
└── docs/
    ├── build-notes.md                    Running history of how this app was built (Parts 1-5).
    └── cns-imaging-pearls-radiopaedia.md  Source research notes for CNS imaging pearls.
```

## Making a change

1. Edit the relevant file:
   - Fix a flashcard or add cards → `src/data/decks/<service>.json`
   - Edit a reading doc's text → `src/data/docs/<service>.json` (the `html` field for that category)
   - Edit a "Before You Start" section → `src/data/background.json`
   - Change colors, fonts, spacing → `src/styles.css`
   - Change behavior (the SRS algorithm, navigation, new features) → `src/app.js`
   - Change the page layout itself (add a new view, new top-level section) → `src/index.template.html`
2. Rebuild: `node build.js` (no dependencies to install — plain Node, any recent version works).
3. Open `dist/index.html` in a browser to check the change.

## Data file shapes

**`src/data/services.json`** — array of the 8 disease-site tiles:
```json
{ "id": "breast", "name": "Breast", "icon": "◈", "color": "var(--svc-breast)", "blurb": "DCIS through locally advanced disease" }
```

**`src/data/decks/<service>.json`** — array of flashcards for that service:
```json
{ "id": "br-1", "category": "Epidemiology & Risk Factors", "front": "...", "back": "..." }
```

**`src/data/docs/<service>.json`** — object keyed by category name, each with a title and an HTML string rendered inside the reading doc:
```json
{ "Epidemiology & Risk Factors": { "title": "Epidemiology & Risk Factors", "html": "<p>...</p>" } }
```

**`src/data/background.json`** — array of the 10 background sections, in display order:
```json
{ "id": "rad-onc-101", "num": 1, "title": "Radiation Oncology 101", "question": "What is radiation oncology...?", "html": "<p>...</p>" }
```

**`src/data/curriculum.json`**: module metadata for the home-page disease-site cards, the module landing pages, and Resources (Sources & References). Per site: `title`, `summary`, `topics` (shown on cards), `objectives` ("What you'll learn"), `guideline`, `staging`, and `trials` (only references the site's docs actually name), plus an optional `reviewed` (e.g. `"2026-10"`). A "Content review" date is shown only when `reviewed` is set; no dates are shown otherwise.

**`src/data/anatomy/<service>.json`** and **`src/data/imaging/<service>.json`** — one interactive module per site, rendered above the doc's prose whenever its `category` matches the currently open doc category:
```json
{
  "category": "Anatomy & Lymphatics",
  "intro": "<p>optional intro HTML shown above the plates</p>",
  "plates": [
    {
      "id": "hn-larynx", "title": "Larynx — Laryngoscopic View",
      "style": "schematic",
      "caption": "Placeholder schematic — swap in a real image here.",
      "hotspots": [
        { "id": "epiglottis", "label": "Epiglottis", "x": 50, "y": 20, "blurb": "..." }
      ]
    }
  ]
}
```
`x`/`y` are percentages within the image box. `style` picks a placeholder background look (`schematic`, `endoscopic`, `ct`, `mri`) until a real image is swapped in (a future `image` field pointing at a real asset can replace the placeholder rendering). Each plate powers two modes: **Explore** (click any numbered marker or legend chip to read its label/blurb) and **Quiz** (an arrow points at one hotspot at a time; pick it from 4 MCQ choices). A service only gets the module if a file exists for it in `anatomy/` or `imaging/` (currently head & neck, breast, and thoracic). Newer files use the keyed format: an object of plate groups (`{ "anat-th-nodes": { intro, plates, gallery } }`), each mounted wherever a doc contains `<div class='plate-group-inline' data-plate-group='anat-th-nodes'></div>`.

Docs can also embed a few self-mounting widgets: `<div class='quiz-carousel' data-quiz-set='th-staging'></div>` (question sets live in `QUIZ_SETS` in `app.js`), `<div class='tab-carousel'>` with `<section class='tc-slide' data-title='...'>` slides (staging and NCCN tables), `<div class='stage-builder'></div>` (AJCC 9th edition lung stage builder/quiz), and `<div class='nstage-drill'></div>` (IASLC station to N-stage drill).

**`src/data/cases/<service>.json`** powers Case-Based Practice (Vignette, Imaging, Stage, Treatment, Dose/Fx). Each case's `scene` holds the ellipse coordinates for the primary (and optional node) drawn on the schematic image (`"kind"` can be `"pelvis"`, `"brain"`, `"spine"`, or `"abdomen"`; default is the chest; an optional `edema` ellipse is drawn under the lesion). The `stage`, `treatmentPlan`, and `radDose` steps are fill-in (`prompt`/`answer`/`explanation`) or multiple choice (`prompt`/`choices`/`correctIndex`/`explanation`). An optional top-level `stepLabels` renames steps (prostate uses "Risk Group").

More embeddable widgets: `<div class='choice-drill' data-drill-set='pr-risk'></div>` (sets in `DRILL_SETS`), `<div class='gleason-builder'></div>`, `<div class='risk-builder'></div>` (NCCN prostate risk group + AJCC stage), `<div class='sedlis-builder'></div>` (cervix post-hysterectomy Sedlis/Peters checker), `<div class='glioma-builder'></div>` (WHO 2021 glioma classifier), `<div class='gpa-builder'></div>` (brain metastasis GPA), `<div class='rectal-builder'></div>` (rectal MRI features to plan), `<div class='pancreas-builder'></div>` (pancreas resectability).

The `html` fields in both `docs` and `background` support the same set of content classes already styled in `styles.css`: `<p>`, `<h3>`, `<h4>`, `<ul>`/`<ol>`, `<strong>`, `<div class="pearl">` (a callout box, used for "High-Yield Summary" and clinical pearls), `<div class="worked-example">` with `<h5>` sub-headers (used for the consult-note/presentation examples), `<div class="flow-diagram">` with `.flow-step`/`.flow-arrow`/`.flow-connector` (step-by-step process visuals), `<figure>`/`<figcaption>` (images), and `<table>`.

## Style conventions worth knowing before editing content

- No em dashes. Sophia's explicit preference — use commas, periods, or parentheses instead. (See what we did there. Don't do that.)
- Conversational, non-overwhelming tone for the background module specifically; the disease-site docs can be denser/more technical since they pair with flashcard drilling.
- Every reading doc and background section ends with a `<div class="pearl">` "High-Yield Summary" bulleted list.
- Any worked example (consult notes, presentations) must use a clearly fictional/composite patient, explicitly labeled as such.

## Publishing / sharing

This folder is the source of truth going forward. To share an updated version:
- Simplest: send `dist/index.html` directly (email, AirDrop, etc.) — it's fully self-contained and works offline once loaded (it does pull Google Fonts from a CDN if online; falls back to system fonts if not).
- To update the hosted Claude Artifact link above, hand `dist/index.html` to a Claude session with access to the Artifact tool and ask it to republish to that URL.

## Version control

This folder is a git repository. Commit after meaningful changes:
```
git add -A
git commit -m "Describe what changed"
```
