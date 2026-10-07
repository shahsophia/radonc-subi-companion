#!/usr/bin/env python3
"""
Python mirror of build.js, for machines without Node.

Assembles src/ into a single self-contained dist/index.html, inlining any
plate/gallery images that point at src/images/ as data URIs.

Usage:  python3 build.py
"""
import base64
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
IMAGES_DIR = os.path.join(SRC, "images")
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml"}


def read_json(p):
    with open(p, encoding="utf8") as f:
        return json.load(f)


def folder(name):
    d = os.path.join(SRC, "data", name)
    out = {}
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith(".json"):
                out[f[:-5]] = read_json(os.path.join(d, f))
    return out


embedded = 0
# Each image file is embedded once (IMG_POOL); plates that reuse a file just
# point at its index, and a tiny resolver below swaps the data URI back in.
IMG_POOL = []
IMG_INDEX = {}


def embed_images(node):
    global embedded
    if isinstance(node, list):
        for x in node:
            embed_images(x)
    elif isinstance(node, dict):
        for k, v in node.items():
            if k == "image" and isinstance(v, str) and v.startswith("images/"):
                path = os.path.join(IMAGES_DIR, v[len("images/"):])
                mime = MIME.get(os.path.splitext(path)[1].lower())
                if not mime:
                    raise ValueError(f"Unsupported image type: {v}")
                if v not in IMG_INDEX:
                    with open(path, "rb") as f:
                        IMG_POOL.append(f"data:{mime};base64,{base64.b64encode(f.read()).decode()}")
                    IMG_INDEX[v] = len(IMG_POOL) - 1
                node[k] = f"imgpool:{IMG_INDEX[v]}"
                embedded += 1
            else:
                embed_images(v)


anatomy = folder("anatomy")
imaging = folder("imaging")
embed_images(anatomy)
embed_images(imaging)
cases = folder("cases")
embed_images(cases)
cards = read_json(os.path.join(SRC, "data", "cards.json"))
embed_images(cards)

js = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
data = "\n".join([
    f"const SERVICES = {js(read_json(os.path.join(SRC, 'data', 'services.json')))};",
    f"const DECKS = {js(folder('decks'))};",
    f"const DOCS = {js(folder('docs'))};",
    f"const BACKGROUND = {js(read_json(os.path.join(SRC, 'data', 'background.json')))};",
    f"const ANATOMY = {js(anatomy)};",
    f"const IMAGING = {js(imaging)};",
    f"const CASES = {js(cases)};",
    f"const CARD_ART = {js(cards)};",
    f"const CURRICULUM = {js(read_json(os.path.join(SRC, 'data', 'curriculum.json')))};",
    f"const IMG_POOL = {js(IMG_POOL)};",
    "(function resolve(n){if(Array.isArray(n)){n.forEach(resolve);return;}if(n&&typeof n==='object'){for(const k in n){const v=n[k];if(k==='image'&&typeof v==='string'&&v.startsWith('imgpool:'))n[k]=IMG_POOL[+v.slice(8)];else resolve(v);}}})([ANATOMY,IMAGING,CASES,CARD_ART]);",
])

with open(os.path.join(SRC, "styles.css"), encoding="utf8") as f:
    styles = f.read().strip()
with open(os.path.join(SRC, "app.js"), encoding="utf8") as f:
    app = f.read().strip()
with open(os.path.join(SRC, "index.template.html"), encoding="utf8") as f:
    tpl = f.read()

assert "/*__STYLES__*/" in tpl and "/*__DATA__*/\n/*__APP_JS__*/" in tpl
out = tpl.replace("/*__STYLES__*/", styles, 1).replace("/*__DATA__*/\n/*__APP_JS__*/", data + "\n\n" + app, 1)
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
with open(os.path.join(ROOT, "dist", "index.html"), "w", encoding="utf8") as f:
    f.write(out)
print(f"Built dist/index.html ({len(out.encode()) // 1024} KB), embedded images: {embedded} ({len(IMG_POOL)} unique)")
