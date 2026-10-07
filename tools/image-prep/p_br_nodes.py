import os; os.environ["SITE"]="breast"
from imgtool import *
im=load('breast_lymph_nodes.jpg')
g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
b,gg,r=[im[:,:,i].astype(int) for i in range(3)]
ink=((g<120)&(abs(r-gg)<25)&(abs(gg-b)<25)).astype(np.uint8)*255   # dark-gray label text + bracket (nodes are green)
ink[:, 380:]=0
ink=cv2.dilate(ink,np.ones((3,3),np.uint8))
out=cv2.inpaint(im,ink,4,cv2.INPAINT_TELEA)
# the bracket ends sat on two nodes; redraw them in the diagram's node green
for c in [(356,256),(374,413)]: cv2.ellipse(out,c,(7,9),-20,0,360,(56,164,19),-1,cv2.LINE_AA)
out=out[40:610, 140:900]
save(pad43(out,(255,255,255)),'br-nodal-basins.jpg',grid=True)
