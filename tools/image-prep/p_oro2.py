# Oropharynx plate: Cancer Research UK "Diagram showing the parts of the oropharynx" (CC BY-SA 4.0, Wikimedia Commons),
# text labels and leader lines stripped from the SVG, rendered with `qlmanage -t -s 1400`.
from imgtool import *
im = load('oropharynx_cruk_unlabeled.png')
out = pad43(im[180:1300, 60:1190], (255, 255, 255))
save(out, 'hn-oropharynx.jpg', grid=True)
# hotspot helper: render coords -> % of the saved plate
def pct(x, y): return round(((x-60)+181)/1493*100), round((y-180)/1120*100)
for name, xy in {"soft palate": (822, 645), "tonsil": (832, 745), "base of tongue": (790, 850), "posterior wall": (1000, 790),
                 "vallecula": (868, 912), "nasopharynx": (880, 520), "oral tongue": (520, 760)}.items():
    print(name, pct(*xy))
