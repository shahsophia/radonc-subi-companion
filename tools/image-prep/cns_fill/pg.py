"""pg.py file out.png [step] [x0 y0 x1 y1] : pixel grid preview"""
import sys,cv2,numpy as np
from PIL import Image
im=Image.open(sys.argv[1]).convert("RGB"); im=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2BGR)
st=int(sys.argv[3]) if len(sys.argv)>3 else 50
x0,y0,x1,y1=(int(a) for a in sys.argv[4:8]) if len(sys.argv)>7 else (0,0,im.shape[1],im.shape[0])
c=im[y0:y1,x0:x1].copy(); s=min(float(__import__("os").environ.get("MAXS","2")),1000/c.shape[1],900/c.shape[0]); c=cv2.resize(c,None,fx=s,fy=s)
for g in range((x0//st+1)*st,x1,st):
    X=int((g-x0)*s); cv2.line(c,(X,0),(X,c.shape[0]),(0,160,255),1); cv2.putText(c,str(g),(X+2,12),0,0.4,(0,255,255),1)
for g in range((y0//st+1)*st,y1,st):
    Y=int((g-y0)*s); cv2.line(c,(0,Y),(c.shape[1],Y),(0,160,255),1); cv2.putText(c,str(g),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(sys.argv[2],c)
