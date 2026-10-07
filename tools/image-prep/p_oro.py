from imgtool import *
im=load('Oropharyngeal_anatomy.jpg')
c=im[143:398, 494:881]
c=cv2.resize(c,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
save(pad43(c,(40,40,40)),'hn-oropharynx.jpg',grid=True)
