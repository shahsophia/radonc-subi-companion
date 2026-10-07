import os; os.environ["SITE"]="breast"
from imgtool import *
im=load('breast_anatomy_sagittal.png')
b,g,r=[im[:,:,i].astype(int) for i in range(3)]
gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(int)
ink=((gray<90)&((r-b)<40)).astype(np.uint8)*255          # black numbers + arrows (areola is brown, so excluded)
ink=cv2.dilate(ink,np.ones((7,7),np.uint8))
cv2.rectangle(ink,(300,1062),(500,1100),255,-1)           # "(cc) Patrick J. Lynch, 2006" (credited in the caption instead)
out=cv2.inpaint(im,ink,5,cv2.INPAINT_TELEA)
out=out[0:1060, 0:960]
framed=pad43(out,(255,255,255))
x1=(framed.shape[1]+out.shape[1])//2
framed[:, x1:] = np.median(out[:, -6:].reshape(-1,3), axis=0).astype(np.uint8)  # continue the flat skin tone on the right
save(framed,'br-sagittal.jpg',grid=True)
