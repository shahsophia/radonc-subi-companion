#!/usr/bin/env node
/**
 * Build script for the RadOnc Sub-I Companion app.
 *
 * Assembles the modular source files in src/ into a single, self-contained
 * dist/index.html that can be opened directly in a browser (no server, no
 * build tools needed to VIEW it) or republished as a Claude Artifact.
 *
 * Usage:  node build.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// --- load data ---
const services = readJSON(path.join(SRC, "data", "services.json"));
const background = readJSON(path.join(SRC, "data", "background.json"));

const decksDir = path.join(SRC, "data", "decks");
const decks = {};
for (const file of fs.readdirSync(decksDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const svcId = file.replace(/\.json$/, "");
  decks[svcId] = readJSON(path.join(decksDir, file));
}

const docsDir = path.join(SRC, "data", "docs");
const docs = {};
for (const file of fs.readdirSync(docsDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const svcId = file.replace(/\.json$/, "");
  docs[svcId] = readJSON(path.join(docsDir, file));
}

const anatomyDir = path.join(SRC, "data", "anatomy");
const anatomy = {};
for (const file of fs.readdirSync(anatomyDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const svcId = file.replace(/\.json$/, "");
  anatomy[svcId] = readJSON(path.join(anatomyDir, file));
}

const imagingDir = path.join(SRC, "data", "imaging");
const imaging = {};
for (const file of fs.readdirSync(imagingDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const svcId = file.replace(/\.json$/, "");
  imaging[svcId] = readJSON(path.join(imagingDir, file));
}

const casesDir = path.join(SRC, "data", "cases");
const cases = {};
if (fs.existsSync(casesDir)) {
  for (const file of fs.readdirSync(casesDir).sort()) {
    if (!file.endsWith(".json")) continue;
    const svcId = file.replace(/\.json$/, "");
    cases[svcId] = readJSON(path.join(casesDir, file));
  }
}

// --- embed local images ---
// Plate/gallery "image" fields may point at files under src/images/ (e.g.
// "images/headneck/hn-larynx.jpg"). Inline them as data URIs so dist/index.html
// stays a single self-contained file.
const IMAGES_DIR = path.join(SRC, "images");
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
let embedded = 0;
function embedImages(node) {
  if (Array.isArray(node)) { node.forEach(embedImages); return; }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (k === "image" && typeof v === "string" && v.startsWith("images/")) {
      const file = path.join(IMAGES_DIR, v.slice("images/".length));
      const mime = MIME[path.extname(file).toLowerCase()];
      if (!mime) throw new Error(`Unsupported image type: ${v}`);
      node[k] = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
      embedded++;
    } else {
      embedImages(v);
    }
  }
}
embedImages(anatomy);
embedImages(imaging);
embedImages(cases);
const cards = readJSON(path.join(SRC, "data", "cards.json"));
embedImages(cards);

// --- load code ---
const styles = fs.readFileSync(path.join(SRC, "styles.css"), "utf8").trim();
const appJs = fs.readFileSync(path.join(SRC, "app.js"), "utf8").trim();
const template = fs.readFileSync(path.join(SRC, "index.template.html"), "utf8");

// --- assemble ---
const dataBlock = [
  `const SERVICES = ${JSON.stringify(services)};`,
  `const DECKS = ${JSON.stringify(decks)};`,
  `const DOCS = ${JSON.stringify(docs)};`,
  `const BACKGROUND = ${JSON.stringify(background)};`,
  `const ANATOMY = ${JSON.stringify(anatomy)};`,
  `const IMAGING = ${JSON.stringify(imaging)};`,
  `const CASES = ${JSON.stringify(cases)};`,
  `const CARD_ART = ${JSON.stringify(cards)};`,
  `const CURRICULUM = ${JSON.stringify(readJSON(path.join(SRC, "data", "curriculum.json")))};`,
].join("\n");

let out = template.replace("/*__STYLES__*/", styles);
out = out.replace("/*__DATA__*/\n/*__APP_JS__*/", dataBlock + "\n\n" + appJs);

fs.mkdirSync(DIST, { recursive: true });
const outPath = path.join(DIST, "index.html");
fs.writeFileSync(outPath, out, "utf8");

const stats = fs.statSync(outPath);
console.log(`Built ${outPath} (${(stats.size / 1024).toFixed(0)} KB)`);
console.log(`  services: ${services.length}, background sections: ${background.length}`);
console.log(`  decks: ${Object.keys(decks).join(", ")}`);
console.log(`  docs:  ${Object.keys(docs).join(", ")}`);
console.log(`  anatomy plates: ${Object.keys(anatomy).join(", ") || "(none)"}`);
console.log(`  imaging plates: ${Object.keys(imaging).join(", ") || "(none)"}`);
console.log(`  cases: ${Object.keys(cases).join(", ") || "(none)"}`);
console.log(`  embedded images: ${embedded}`);
