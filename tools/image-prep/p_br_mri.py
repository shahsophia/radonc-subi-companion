import os; os.environ["SITE"]="breast"
from imgtool import *
im=load('MRI_right_DCIS.jpg')
g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
area=np.zeros(g.shape,np.uint8)
cv2.fillPoly(area,[np.array([(298,316),(322,312),(376,278),(390,292),(368,352),(306,390),(296,386)],np.int32)],255)  # the white arrow (stops short of the lesion)
cv2.rectangle(area,(20,30),(320,100),255,-1)    # "DCE-MRI"
cv2.rectangle(area,(20,665),(85,730),255,-1)    # panel letter "a"
m=((area>0)&(g>150)).astype(np.uint8)*255
m=cv2.dilate(m,np.ones((9,9),np.uint8))   # wide enough to take the dark outline around the white shapes too
a=np.zeros(g.shape,np.uint8); cv2.rectangle(a,(22,668),(80,728),255,-1)
m=cv2.bitwise_or(m, cv2.bitwise_and(a, cv2.dilate(((g>120)).astype(np.uint8)*255, np.ones((9,9),np.uint8))))  # letter 'a' + its outline
out=cv2.inpaint(im,m,5,cv2.INPAINT_TELEA)
bgc=int(np.median(g[120:200, 400:600]))
out[30:100, 20:320]=bgc   # the title sits on plain background
out=out[22:660, 22:938]   # bottom strip (with the panel letter) is just lower chest wall
save(pad43(out,(0,0,0)),'br-mri-dce.jpg',grid=True)
cv2.imwrite(PREV+'_mri2.png', cv2.resize(out[240:400, 220:400],None,fx=3,fy=3))
