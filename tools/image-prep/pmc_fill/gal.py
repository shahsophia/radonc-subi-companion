import sys,cv2,numpy as np
from PIL import Image
sys.path.insert(0,"."); from srcs import F,S
def L(k):
    im=Image.open(F[k])
    if im.mode in("RGBA","LA","P"):
        im=im.convert("RGBA"); bg=Image.new("RGB",im.size,(255,255,255)); bg.paste(im,mask=im.split()[3]); im=bg
    return cv2.cvtColor(np.array(im.convert("RGB")),cv2.COLOR_RGB2BGR)
def C(k,x0,y0,x1,y1): return L(k)[y0:y1,x0:x1]
def wl(m,x0,y0,x1,y1):
    m[y0:y1,x0:x1]=255; return m
def hcat(a,b,gap=6,col=(0,0,0)):
    h=max(a.shape[0],b.shape[0])
    pad=lambda m: cv2.copyMakeBorder(m,0,h-m.shape[0],0,0,cv2.BORDER_CONSTANT,value=col)
    return np.hstack([pad(a),np.full((h,gap,3),col,np.uint8),pad(b)])
def save(img,name,maxw=1000):
    h,w=img.shape[:2]
    if w>maxw: img=cv2.resize(img,(maxw,round(h*maxw/w)),interpolation=cv2.INTER_AREA)
    cv2.imwrite(S+"out/"+name,img,[cv2.IMWRITE_JPEG_QUALITY,85]); print(name,img.shape[1],img.shape[0])
G={
 "hn-g-oc-nerves.jpg": lambda: L("gray778"),
 "hn-g-np-endo.jpg": lambda: L("npendo"),
 "hn-g-lx-axial.jpg": lambda: wl(L("glotillus"),480,0,596,70),
 "hn-g-lx-scope.jpg": lambda: C("glotscope",0,0,372,425),
 "hn-g-ln-oc-ct.jpg": lambda: L("submand"),
 "hn-g-ln-oc-photo.jpg": lambda: C("fom",0,0,330,196),
 "hn-g-ln-op-cystic.jpg": lambda: C("cystic",0,0,597,368),
 "br-g-peau.jpg": lambda: L("ibc"),
 "br-g-axilla-dissection.jpg": lambda: C("cocco",0,0,378,404),
 "br-g-lsg.jpg": lambda: L("lsg"),
 "br-g-mammo-cc.jpg": lambda: C("mlo",383,0,750,476),
 "br-g-mri-nact.jpg": lambda: hcat(C("nact",300,8,468,180),C("nact",330,210,515,380)),
 "br-g-dibh.jpg": lambda: hcat(L("fb"),L("dibh"),gap=8,col=(255,255,255)),
 "br-g-drr.jpg": lambda: L("drr"),
 "br-g-pet-mip.jpg": lambda: C("brpet",0,0,196,445),
 "br-g-bone.jpg": lambda: L("bone"),
 "th-g-rml.jpg": lambda: L("rml"),
 "th-g-ebus.jpg": lambda: L("ebus"),
 "th-g-pet7.jpg": lambda: C("pet7",0,0,458,332),
 "th-g-sagittal-ct.jpg": lambda: L("itmigct"),
}
if __name__=="__main__":
    for n in (sys.argv[1:] or G): save(G[n](),n)
