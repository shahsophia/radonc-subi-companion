"""gi_integrate.py WORKDIR : write gi_fill.py output (WORKDIR/gi_plates.json, gi_gallery.json) into the GI data
and copy nothing else (gi_fill.py already wrote the images to src/images/gi/)."""
import json, sys
W = sys.argv[1].rstrip("/") + "/"; R = "/Users/sophiashah/Desktop/RadOnc-SubI-Companion/"
plates = json.load(open(W + "gi_plates.json")); gal = json.load(open(W + "gi_gallery.json"))
data = {k: json.load(open(R + f"src/data/{k}/gi.json")) for k in ("anatomy", "imaging")}
done = set()
for kind, d in data.items():
    for gk, g in d.items():
        new_plates = []
        for p in g["plates"]:
            new_plates.append(p); orig = {h["id"]: h for h in p.get("hotspots", [])}
            for pid in [p["id"]] + (["rmri-emvi"] if p["id"] == "rmri-ax" else []):
                if pid not in plates: continue
                r = plates[pid]
                if pid != p["id"]:  # new plate inserted after its sibling
                    q = dict(id=pid, title=r["title"], style=p.get("style", "mri")); new_plates.append(q)
                else: q = p
                old = orig
                hs = []
                for h in r["hs"]:
                    b = h["blurb"] or old[h["id"]]["blurb"]
                    hs.append(dict(id=h["id"], label=h["label"], x=h["x"], y=h["y"], blurb=b))
                q["hotspots"] = hs; q["caption"] = r["caption"]; q["image"] = "images/gi/" + r["image"]
                if r["title"]: q["title"] = r["title"]
                done.add(pid)
        g["plates"] = new_plates
        for i, it in enumerate(g.get("gallery", [])):
            key = f"{gk}|{i}"
            if key in gal:
                img, title, cap = gal[key]; it["image"] = "images/gi/" + img; it["title"] = title; it["caption"] = cap; done.add(key)
missing = (set(plates) | set(gal)) - done
assert not missing, missing
for kind, d in data.items():
    p = R + f"src/data/{kind}/gi.json"; line = open(p).read().split("\n")[1]; ind = len(line) - len(line.lstrip())
    open(p, "w").write(json.dumps(d, indent=ind, ensure_ascii=False) + "\n")
print("filled", len(done))
