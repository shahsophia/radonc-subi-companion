from imgtool import *
im=load('Head_sagittal_anatomy.jpg')
c=im[470:890, 20:580]
save(c,'hn-oral-cavity.jpg',grid=True)
