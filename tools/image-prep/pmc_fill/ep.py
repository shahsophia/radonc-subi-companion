"""Europe PMC figure finder. usage: ep.py tag 'caption phrase' [narticles] [must-words comma]
Searches figure captions in CC BY / BY-SA / BY-NC open-access articles, downloads figure files,
and writes a numbered contact sheet ep/<tag>.jpg + ep/<tag>.json."""
import sys, json, urllib.request, urllib.parse, re, os, io, zipfile
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw
S=os.path.dirname(os.path.abspath(__file__))+"/"
UA={"User-Agent":"Mozilla/5.0 RadOncStudy"}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=90).read()
tag,phrase=sys.argv[1],sys.argv[2]
N=int(sys.argv[3]) if len(sys.argv)>3 else 6
must=[[a.strip() for a in w.lower().split("|")] for w in sys.argv[4].split(",")] if len(sys.argv)>4 and sys.argv[4] else []
lic='(LICENSE:"cc by" OR LICENSE:"cc by-sa" OR LICENSE:"cc by-nc" OR LICENSE:"cc by-nc-sa" OR LICENSE:"cc0")'
q=f'FIG:({phrase}) AND OPEN_ACCESS:y AND {lic}'
d=json.loads(get("https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+urllib.parse.urlencode({"query":q,"format":"json","pageSize":N,"resultType":"core"})))
print("hits",d["hitCount"])
out=[];thumbs=[]
for r in d["resultList"]["result"]:
    pmc=r.get("pmcid")
    if not pmc: continue
    try: x=ET.fromstring(get(f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmc}/fullTextXML"))
    except Exception as e: print(pmc,"xml fail"); continue
    figs=[]
    for f in x.iter("fig"):
        cap=" ".join("".join(f.find("caption").itertext()).split()) if f.find("caption") is not None else ""
        lab="".join(f.find("label").itertext()) if f.find("label") is not None else ""
        g=f.find(".//graphic")
        href=g.get("{http://www.w3.org/1999/xlink}href") if g is not None else None
        low=cap.lower()
        if href and all(any(a in low for a in grp) for grp in must): figs.append((lab,cap,href))
    if not figs: continue
    try:
        lst=get(f"https://pmc-oa-opendata.s3.amazonaws.com/?list-type=2&prefix={pmc}.").decode()
        keys=re.findall(r"<Key>([^<]+)</Key>",lst)
    except Exception as e: print(pmc,"list fail"); continue
    auth=r.get("authorString","")[:60]; yr=r.get("pubYear"); jn=r.get("journalInfo",{}).get("journal",{}).get("isoabbreviation") or r.get("journalInfo",{}).get("journal",{}).get("title")
    for lab,cap,href in figs:
        base=href.rsplit("/",1)[-1].rsplit(".",1)[0]
        cand=[k for k in keys if k.rsplit("/",1)[-1].rsplit(".",1)[0]==base and k.lower().endswith((".jpg",".jpeg",".png",".gif",".tif",".tiff"))]
        if not cand: continue
        cand.sort(key=lambda n: (not n.lower().endswith((".jpg",".jpeg")), n), reverse=False)
        cand.sort(key=lambda n: n.split("/")[0], reverse=True)
        fn=S+"ep/"+pmc+"_"+base+"."+cand[0].rsplit(".",1)[-1]
        if not os.path.exists(fn):
            try: open(fn,"wb").write(get("https://pmc-oa-opendata.s3.amazonaws.com/"+cand[0]))
            except Exception as e: print("dl fail",cand[0]); continue
        try: im=Image.open(fn); w,h=im.size; im=im.convert("RGB"); im.thumbnail((360,360))
        except: continue
        i=len(out)
        out.append({"i":i,"pmcid":pmc,"fig":lab,"file":fn,"size":[w,h],"license":r.get("license"),"authors":auth,"year":yr,"journal":jn,"title":r["title"],"caption":cap})
        thumbs.append(im)
        print(f"[{i}] {pmc} {lab} {w}x{h} {r.get('license')} | {auth[:30]} {jn} {yr}\n     {cap[:260]}")
json.dump(out,open(S+"ep/"+tag+".json","w"),indent=1)
if thumbs:
    cols=4; rows=(len(thumbs)+cols-1)//cols
    sh=Image.new("RGB",(cols*360,rows*360),"white"); dr=ImageDraw.Draw(sh)
    for i,t in enumerate(thumbs):
        x,y=(i%cols)*360,(i//cols)*360; sh.paste(t,(x,y)); dr.rectangle([x,y,x+30,y+22],fill="yellow"); dr.text((x+5,y+5),str(i),fill="black")
    sh.save(S+"ep/"+tag+".jpg",quality=80)
