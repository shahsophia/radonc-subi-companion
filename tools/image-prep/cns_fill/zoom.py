"""zoom.py img x0 y0 x1 y1 [step] [dots x,y;x,y]  (percent coords) -> z.png"""
import sys,cv2,numpy as np
im=cv2.imread(sys.argv[1]); H,W=im.shape[:2]
x0,y0,x1,y1=[float(a) for a in sys.argv[2:6]]; st=float(sys.argv[6]) if len(sys.argv)>6 else 2.5
dots=[tuple(float(v) for v in d.split(",")) for d in sys.argv[7].split(";")] if len(sys.argv)>7 and sys.argv[7] else []
c=im[int(y0*H/100):int(y1*H/100),int(x0*W/100):int(x1*W/100)]
s=min(1000/c.shape[1],800/c.shape[0]); c=cv2.resize(c,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
h,w=c.shape[:2]; X=lambda p:int((p-x0)/(x1-x0)*w); Y=lambda p:int((p-y0)/(y1-y0)*h)
v=np.ceil(x0/st)*st
while v<x1: cv2.line(c,(X(v),0),(X(v),h),(0,140,255),1); cv2.putText(c,f"{v:g}",(X(v)+2,12),0,0.4,(0,255,255),1); v+=st
v=np.ceil(y0/st)*st
while v<y1: cv2.line(c,(0,Y(v)),(w,Y(v)),(0,140,255),1); cv2.putText(c,f"{v:g}",(2,Y(v)-2),0,0.4,(0,255,255),1); v+=st
for n,(x,y) in enumerate(dots): cv2.circle(c,(X(x),Y(y)),7,(0,0,255),2); cv2.putText(c,str(n+1),(X(x)+8,Y(y)+5),0,0.6,(0,255,0),2)
cv2.imwrite(sys.argv[8] if len(sys.argv)>8 else "z.png",c)
