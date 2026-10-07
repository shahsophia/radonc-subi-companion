import sys,json,cv2,numpy as np
sys.path.insert(0,"."); sys.path.insert(0,"/Users/sophiashah/Desktop/RadOnc-SubI-Companion/tools/image-prep")
from srcs import F,S
from gal import L
from ylab import ymask
def inpaint(img,lines=(),rects=(),polys=(),width=7,radius=5,mask=None):
    m=np.zeros(img.shape[:2],np.uint8) if mask is None else mask.copy()
    for p in lines: cv2.polylines(m,[np.array(p,np.int32)],False,255,width)
    for (x0,y0,x1,y1) in rects: cv2.rectangle(m,(x0,y0),(x1,y1),255,-1)
    for p in polys: cv2.fillPoly(m,[np.array(p,np.int32)],255)
    return cv2.inpaint(img,m,radius,cv2.INPAINT_TELEA)
def inpaint_dark(img,lines,band=6,thr=90,grow=1,rects=()):
    near=np.zeros(img.shape[:2],np.uint8)
    for p in lines: cv2.polylines(near,[np.array(p,np.int32)],False,255,band*2)
    g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY); m=((near>0)&(g<thr)).astype(np.uint8)*255
    if grow: m=cv2.dilate(m,np.ones((2*grow+1,)*2,np.uint8))
    for (x0,y0,x1,y1) in rects: cv2.rectangle(m,(x0,y0),(x1,y1),255,-1)
    return cv2.inpaint(img,m,3,cv2.INPAINT_TELEA)
def pad43(img,color):
    h,w=img.shape[:2]
    if w/h>4/3: H,W=round(w*3/4),w
    else: H,W=h,round(h*4/3)
    out=np.full((H,W,3),color,np.uint8); y,x=(H-h)//2,(W-w)//2; out[y:y+h,x:x+w]=img
    return out,x,y,W,H
def yellow_labels(img,pts,bx=24,by=15):
    m=ymask(img); keep=np.zeros_like(m)
    for (x,y) in pts: keep[max(0,y-by):y+by,max(0,x-bx):x+bx]=255
    m=cv2.dilate(m&keep,np.ones((3,3),np.uint8)); return m
P={}
def plate(pid,site,out,src,crop,ops,color,hs,caption,title=None):
    P[pid]=dict(site=site,out=out,src=src,crop=crop,ops=ops,color=color,hs=hs,caption=caption,title=title)
exec(open(S+"platedefs.py").read())
def run(pid):
    d=P[pid]; im=L(d["src"])
    im=d["ops"](im) if d["ops"] else im
    x0,y0,x1,y1=d["crop"] or (0,0,im.shape[1],im.shape[0]); im=im[y0:y1,x0:x1]
    im,px,py,W,H=pad43(im,d["color"])
    mw=1100; sc=min(1,mw/W)
    if sc<1: im=cv2.resize(im,(round(W*sc),round(H*sc)),interpolation=cv2.INTER_AREA)
    cv2.imwrite(S+"out/"+d["out"],im,[cv2.IMWRITE_JPEG_QUALITY,85])
    hs=[]
    for h in d["hs"]:
        hid,label,x,y=h[:4]; blurb=h[4] if len(h)>4 else None
        hs.append(dict(id=hid,label=label,x=round((x-x0+px)/W*100),y=round((y-y0+py)/H*100),blurb=blurb))
    # preview with dots
    pv=im.copy(); h_,w_=pv.shape[:2]
    for i,h in enumerate(hs):
        c=(int(h["x"]*w_/100),int(h["y"]*h_/100)); cv2.circle(pv,c,9,(0,0,255),2); cv2.putText(pv,str(i+1),(c[0]+10,c[1]+5),0,0.6,(0,255,255),2)
    cv2.imwrite(S+"prev/"+d["out"],pv)
    return dict(hs=hs,caption=d["caption"],title=d["title"],site=d["site"],out=d["out"])
if __name__=="__main__":
    import os; os.makedirs(S+"prev",exist_ok=True)
    res=json.load(open(S+"plates.json")) if os.path.exists(S+"plates.json") else {}
    for pid in (sys.argv[1:] or P): res[pid]=run(pid); print(pid,"ok")
    json.dump(res,open(S+"plates.json","w"),indent=1)
