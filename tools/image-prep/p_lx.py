from imgtool import *
im=load('glottis_axial.png')
lines=[[(225,112),(287,222)],[(396,70),(355,207)],[(487,121),(376,244)],[(542,151),(377,281)],
 [(618,209),(398,373)],[(657,282),(440,421)],[(664,438),(521,458)],[(672,528),(451,525)],[(404,570),(542,660)]]
out=inpaint(im,lines=lines,width=9)
out=inpaint_dark(out,lines=[[(347,460),(347,590)]],band=6,thr=120,grow=1,bright=True)  # trachea leader, white inside the dark lumen
out=inpaint_dark(out,lines=[[(347,585),(347,710)]],band=5,thr=185,grow=1)  # ...and dark below it
out=out[163:646, 42:626]
save(pad43(out,(255,255,255)),'hn-larynx.jpg',grid=True)
