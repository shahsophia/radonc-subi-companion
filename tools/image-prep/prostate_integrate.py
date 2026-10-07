"""prostate_integrate.py WORKDIR : write prostate_fill.py output (WORKDIR/prostate_plates.json, prostate_gallery.json)
into src/data/{anatomy,imaging}/prostate.json (prostate_fill.py already wrote the images to src/images/prostate/).
Hotspots not listed in prostate_fill.py are dropped (they are not visible on the real image)."""
import json, sys
W = sys.argv[1].rstrip("/") + "/"; R = "/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"
plates = json.load(open(W + "prostate_plates.json")); gal = json.load(open(W + "prostate_gallery.json"))
STYLE = {"pr-zones": "mri", "pr-sagittal": "mri", "pr-levels": "mri"}
data = {k: json.load(open(R + f"src/data/{k}/prostate.json")) for k in ("anatomy", "imaging")}
done = set()
for kind, d in data.items():
    for gk, g in d.items():
        for p in g["plates"]:
            r = plates.get(p["id"])
            if not r: continue
            old = {h["id"]: h for h in p.get("hotspots", [])}
            p["hotspots"] = [dict(id=h["id"], label=h["label"], x=h["x"], y=h["y"], blurb=h["blurb"] or old[h["id"]]["blurb"]) for h in r["hs"]]
            p["caption"] = r["caption"]; p["image"] = "images/prostate/" + r["image"]
            if r["title"]: p["title"] = r["title"]
            if p["id"] in STYLE: p["style"] = STYLE[p["id"]]
            done.add(p["id"])
        for i, it in enumerate(g.get("gallery", [])):
            key = f"{gk}|{i}"
            if key in gal:
                img, title, cap = gal[key]; it["image"] = "images/prostate/" + img; it["title"] = title; it["caption"] = cap; done.add(key)
missing = (set(plates) | set(gal)) - done
assert not missing, missing
for kind, d in data.items():
    p = R + f"src/data/{kind}/prostate.json"; line = open(p).read().split("\n")[1]; ind = len(line) - len(line.lstrip())
    open(p, "w").write(json.dumps(d, indent=ind, ensure_ascii=False) + "\n")
print("filled", len(done))
