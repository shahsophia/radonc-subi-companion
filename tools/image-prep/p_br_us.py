import os; os.environ["SITE"]="breast"
from imgtool import *
im=load('breast_ultrasound_skin_involvement.jpg')
m=np.zeros(im.shape[:2],np.uint8)
cv2.rectangle(m,(0,0),(70,24),255,-1)       # "MI: 0.9" readout
cv2.rectangle(m,(228,0),(290,36),255,-1)    # scanner icon (incl. its dark box)
out=cv2.inpaint(im,m,9,cv2.INPAINT_NS)
out[2:36, 228:290]=im[2:36, 300:362]   # the skin band is horizontal, so borrow real speckle from just to the right
out[0:24, 0:70]=0                            # that corner is outside the sector, so plain black
save(pad43(out,(0,0,0)),'br-us.jpg',grid=True)
