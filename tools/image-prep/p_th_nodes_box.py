# th-img-nodes.jpg: Arias S et al., Can Respir J 2016 (PMC5183797), Fig. 5, CC BY 4.0
# (https://pmc-oa-opendata.s3.amazonaws.com/PMC5183797.1/CRJ2016-1652178.005.jpg).
# Remove only the white "4L", "5", "6" labels and arrows (bright pixels inside each label box),
# so the lung and trachea underneath stay intact, then crop and pad to 4:3 as before.
import cv2, numpy as np, sys
src, out = sys.argv[1], "src/images/thoracic/th-img-nodes.jpg"
im=cv2.imread(src); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
m=np.zeros(g.shape,np.uint8)
for (x0,y0,x1,y1) in [(343,220,418,252),(458,178,545,208),(458,220,550,252)]:
    m[y0:y1,x0:x1]=255
m[g<150]=0
m=cv2.dilate(m,np.ones((5,5),np.uint8))
im=cv2.inpaint(im,m,4,cv2.INPAINT_TELEA)
im=im[20:470,20:722]
h,w=im.shape[:2]; H=round(w*3/4)
pad=np.zeros((H,w,3),np.uint8); y=(H-h)//2; pad[y:y+h]=im
cv2.imwrite(out,pad,[cv2.IMWRITE_JPEG_QUALITY,88])
