import os; os.environ["SITE"]="breast"
from imgtool import *
# Mammogram, NCI image 2553 (public domain), Commons File:Mammogram_showing_small_lesion.jpg: paint out the white arrow pointing at the mass
im=load('mammogram_mlo.jpg')
g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
m=np.zeros(g.shape,np.uint8)
roi=np.zeros(g.shape,np.uint8); cv2.fillPoly(roi,[np.array([(54,190),(104,250),(104,300),(80,300),(54,275)],np.int32)],255)
m[(roi>0)&(g>225)]=255
m=cv2.dilate(m,np.ones((7,7),np.uint8))
out=cv2.inpaint(im,m,6,cv2.INPAINT_TELEA)
save(out,'br-mammo-mlo.jpg',maxw=900,grid=True)
gridprev(out,'mlo_arrow_fixed.png',step=20,region=(0,120,200,320),scale=3)
# Breast density, Pawlak ME et al. Front Oncol 2024 (CC BY 4.0), Commons File:Comparison_of_BI-RADS_classification...jpg: keep only the four mammograms, drop letters/table
d=load('breast_density.jpg')[10:696, 440:1914].copy()
for x0,x1 in [(290,350),(660,715),(1025,1085),(1395,1450)]:
    d[10:80, x0:x1]=0
save(d,'br-density.jpg',maxw=1400)
