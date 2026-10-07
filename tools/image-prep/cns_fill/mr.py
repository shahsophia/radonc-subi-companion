import nibabel as nb, numpy as np, cv2, sys
V={k:np.asarray(nb.load(f"on/{k}.nii.gz").dataobj,dtype=np.float32) for k in("t1","t2")}
def win(a,lo=1,hi=99.5):
    l,h=np.percentile(a[a>0],[lo,hi]) if (a>0).any() else (0,1); return np.clip((a-l)/(h-l)*255,0,255).astype(np.uint8)
def ax(k,z): return V[k][::-1,::-1,z].T      # rows: anterior top, cols: patient right on viewer left
def sag(k,x): return V[k][x,::-1,::-1].T      # rows: superior top, cols: anterior left
def cor(k,y): return V[k][::-1,y,::-1].T      # rows: superior top, cols: patient right on left
def norm(sl,ref=None,lo=1,hi=99.5):
    r=sl if ref is None else ref; l,h=np.percentile(r[r>0],[lo,hi]); return np.clip((sl-l)/(h-l)*255,0,255).astype(np.uint8)
def montage(k,fn,axis,idx,n=5):
    tiles=[]
    for i in idx:
        s={"ax":ax,"sag":sag,"cor":cor}[axis](k,i); t=cv2.cvtColor(norm(s),cv2.COLOR_GRAY2BGR)
        t=cv2.resize(t,None,fx=1.2,fy=1.2); cv2.putText(t,str(i),(5,22),0,0.7,(0,255,255),2); tiles.append(t)
    H=max(t.shape[0] for t in tiles); W=max(t.shape[1] for t in tiles)
    tiles=[cv2.copyMakeBorder(t,0,H-t.shape[0],0,W-t.shape[1],0) for t in tiles]
    while len(tiles)%n: tiles.append(np.zeros_like(tiles[0]))
    rows=[np.hstack(tiles[i:i+n]) for i in range(0,len(tiles),n)]; cv2.imwrite(fn,np.vstack(rows))
if __name__=="__main__":
    montage(sys.argv[1],sys.argv[2],sys.argv[3],[int(a) for a in sys.argv[4].split(",")],int(sys.argv[5]) if len(sys.argv)>5 else 5)

def big(k,axis,i,s=2.0):
    sl={"ax":ax,"sag":sag,"cor":cor}[axis](k,i); t=norm(sl)
    return cv2.resize(t,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
def cands(fn,specs,s=2.0):
    ts=[]
    for k,axis,i,crop in specs:
        t=cv2.cvtColor(big(k,axis,i,s),cv2.COLOR_GRAY2BGR)
        if crop: x0,y0,x1,y1=[int(c*s) for c in crop]; t=t[y0:y1,x0:x1]
        cv2.putText(t,f"{k} {axis} {i}",(5,24),0,0.8,(0,255,255),2); ts.append(t)
    H=max(t.shape[0] for t in ts); ts=[cv2.copyMakeBorder(t,0,H-t.shape[0],0,4,0) for t in ts]
    cv2.imwrite(fn,np.hstack(ts))

def pad43(img,color=0):
    h,w=img.shape[:2]
    if w/h>4/3: H,W=round(w*3/4),w
    else: H,W=h,round(h*4/3)
    out=np.full((H,W)+img.shape[2:],color,np.uint8); y,x=(H-h)//2,(W-w)//2; out[y:y+h,x:x+w]=img; return out
def gridprev(img,fn,dots=()):
    p=img.copy() if img.ndim==3 else cv2.cvtColor(img,cv2.COLOR_GRAY2BGR)
    H,W=p.shape[:2]
    for i in range(1,20):
        c=(0,200,255) if i%2==0 else (0,110,160)
        cv2.line(p,(W*i//20,0),(W*i//20,H),c,1); cv2.line(p,(0,H*i//20),(W,H*i//20),c,1)
        if i%2==0:
            cv2.putText(p,str(i*5),(W*i//20+2,14),0,0.45,(0,255,255),1); cv2.putText(p,str(i*5),(2,H*i//20-3),0,0.45,(0,255,255),1)
    for n,(x,y) in enumerate(dots):
        c=(int(x*W/100),int(y*H/100)); cv2.circle(p,c,8,(0,0,255),2); cv2.putText(p,str(n+1),(c[0]+9,c[1]+5),0,0.6,(0,255,0),2)
    cv2.imwrite(fn,p)
def final(name,k,axis,i,crop=None,W=960,lo=1,hi=99.5):
    sl={"ax":ax,"sag":sag,"cor":cor}[axis](k,i)
    if crop: x0,y0,x1,y1=crop; sl=sl[y0:y1,x0:x1]
    t=norm(sl,lo=lo,hi=hi); t=pad43(t); s=W/t.shape[1]
    t=cv2.resize(t,(W,round(t.shape[0]*s)),interpolation=cv2.INTER_CUBIC)
    cv2.imwrite("out/"+name,t,[cv2.IMWRITE_JPEG_QUALITY,88]); gridprev(t,"prev/"+name.replace(".jpg",".png")); return t
