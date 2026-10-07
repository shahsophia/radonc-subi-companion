"""getpmc.py PMCID outdir : download all figures + print captions & license"""
import sys,re,urllib.request,json,os
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw
pmc,out=sys.argv[1],sys.argv[2]; os.makedirs(out,exist_ok=True)
get=lambda u: urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=60).read()
keys=re.findall(r"<Key>([^<]+)</Key>",get(f"https://pmc-oa-opendata.s3.amazonaws.com/?list-type=2&prefix={pmc}.").decode())
ver=sorted({k.split("/")[0] for k in keys})[-1]
meta=json.loads(get(f"https://pmc-oa-opendata.s3.amazonaws.com/{ver}/{ver}.json"))
print(meta["license_code"], meta["citation"]); print(meta["title"])
x=ET.fromstring(get(f"https://pmc-oa-opendata.s3.amazonaws.com/{ver}/{ver}.xml"))
th=[]
for f in x.iter("fig"):
    cap=" ".join("".join(f.find("caption").itertext()).split()) if f.find("caption") is not None else ""
    lab="".join(f.find("label").itertext()) if f.find("label") is not None else ""
    g=f.find(".//graphic"); 
    if g is None: continue
    base=g.get("{http://www.w3.org/1999/xlink}href").rsplit(".",1)[0]
    c=[k for k in keys if k.startswith(ver+"/") and k.rsplit("/",1)[-1].rsplit(".",1)[0]==base and k.lower().endswith((".jpg",".png",".gif",".tif"))]
    if not c: continue
    fn=f"{out}/{pmc}_{base}.{c[0].rsplit('.',1)[-1]}"
    if not os.path.exists(fn): open(fn,"wb").write(get("https://pmc-oa-opendata.s3.amazonaws.com/"+c[0]))
    im=Image.open(fn); print(f"[{len(th)}] {lab} {im.size} {fn.rsplit('/',1)[-1]}\n    {cap[:300]}")
    im=im.convert("RGB"); im.thumbnail((360,360)); th.append(im)
cols=4; rows=(len(th)+cols-1)//cols
sh=Image.new("RGB",(cols*360,max(rows,1)*360),"white"); dr=ImageDraw.Draw(sh)
for i,t in enumerate(th):
    x0,y0=(i%cols)*360,(i//cols)*360; sh.paste(t,(x0,y0)); dr.rectangle([x0,y0,x0+30,y0+22],fill="yellow"); dr.text((x0+5,y0+5),str(i),fill="black")
sh.save(f"{out}/{pmc}_sheet.jpg",quality=80)
