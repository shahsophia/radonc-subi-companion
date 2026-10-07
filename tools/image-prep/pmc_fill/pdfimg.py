import fitz,sys,os,urllib.request
pmc,out=sys.argv[1],sys.argv[2]; os.makedirs(out,exist_ok=True)
fn=f"{out}/{pmc}.pdf"
if not os.path.exists(fn):
    import re
    keys=re.findall(r"<Key>([^<]+\.pdf)</Key>",urllib.request.urlopen(f"https://pmc-oa-opendata.s3.amazonaws.com/?list-type=2&prefix={pmc}.").read().decode())
    open(fn,"wb").write(urllib.request.urlopen("https://pmc-oa-opendata.s3.amazonaws.com/"+sorted(keys)[-1]).read())
d=fitz.open(fn)
for p in d:
  for im in p.get_images():
    try: x=fitz.Pixmap(d,im[0])
    except: continue
    if x.width>500 and x.height>300:
      if x.n-x.alpha>3: x=fitz.Pixmap(fitz.csRGB,x)
      if x.alpha: x=fitz.Pixmap(x,0)
      x.save(f'{out}/p{p.number}_{im[0]}.png'); print(p.number,im[0],x.width,x.height)
