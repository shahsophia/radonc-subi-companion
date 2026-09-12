# RadOnc Sub-I Companion

An active-recall flashcard + reading-doc study app for medical students on a radiation oncology sub-internship, plus a 10-section "Before You Start" background/orientation module.

Live version (may lag behind this folder until republished): https://claude.ai/code/artifact/6ab831b9-38fb-4374-add0-f4334d5cac56

## How this project is organized

The finished app is a single self-contained HTML file (`dist/index.html`) so it can be opened directly in any browser with no server and no build step required to *view* it. To make *editing* practical, the content is split into small source files under `src/`, and a build script glues them back into that one file.

```
RadOnc-SubI-Companion/
├── build.js                 Assembles src/ into dist/index.html. Run: node build.js
├── dist/
│   └── index.html           The finished, shareable app. Open this file in a browser to use it.
├── src/
│   ├── index.template.html  The static HTML shell (title, fonts, page markup). Edit layout/markup here.
│   ├── styles.css           All CSS (design tokens, dark mode, every component style).
│   ├── app.js                All JS logic: SRS engine, rendering, view switching, event wiring.
│   └── data/
│       ├── services.json         The 8 disease-site tiles (id, name, icon, color, blurb).
│       ├── background.json       The 10 "Before You Start" sections (title, question, html).
│       ├── decks/<service>.json  Flashcards for one disease site (e.g. decks/breast.json).
│       └── docs/<service>.json   Reading docs for one disease site, keyed by category.
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
