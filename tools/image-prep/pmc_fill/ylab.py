import sys,cv2,numpy as np
sys.path.insert(0,"."); from srcs import F
def ymask(im):
    b,g,r=[im[:,:,i].astype(int) for i in range(3)]
    return ((r>150)&(g>150)&(b<130)&(r-b>70)).astype(np.uint8)*255
if __name__=="__main__":
  for k in sys.argv[1:]:
    im=cv2.imread(F[k]); m=ymask(im)
    d=cv2.dilate(m,np.ones((9,9),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(d)
    print(k,[(int(c[0]),int(c[1]),int(s[4])) for s,c in zip(st[1:],cen[1:]) if s[4]>80])
