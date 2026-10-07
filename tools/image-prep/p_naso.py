from imgtool import *
im=load('nasopharynx_anatomy.png')
lines=[[(70,360),(454,619)],[(456,572),(456,662)],[(60,643),(412,643)],[(65,885),(428,711)],
 [(820,95),(412,538)],[(812,92),(690,356)],[(828,262),(580,486)],[(828,262),(622,523)],[(828,262),(636,582)],[(848,372),(735,581)],[(880,490),(791,601)]]
out=inpaint_dark(im,lines=lines,band=12,thr=60)
# handwritten digits on the model (crop coords + (200,380))
marks=[(415,155),(515,152),(210,226),(440,272),(441,390),(205,375),(530,178),(420,210)]
out=inpaint_dark(out,lines=[[(200+x-9,380+y),(200+x+9,380+y)] for x,y in marks],band=12,thr=85,grow=1)
out=cv2.resize(out[470:710, 290:610], None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
save(out,'hn-nasopharynx.jpg',grid=True)
