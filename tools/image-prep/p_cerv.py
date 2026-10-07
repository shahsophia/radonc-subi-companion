from imgtool import *
im=load('cervical_lymph_node.jpg')
b,g,r = [im[:,:,i].astype(int) for i in range(3)]
gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(int)
# black ink: dark and not brown (brown has r notably > b)
ink = ((gray < 100) & ((r - b) < 40)).astype(np.uint8)*255
ink = cv2.dilate(ink, np.ones((11,11),np.uint8))
out = cv2.inpaint(im, ink, 5, cv2.INPAINT_TELEA)
cv2.imwrite(PREV+'_c_mask.png', ink)
# lift the off-white paper to pure white so inpainted areas don't show as patches
out = np.clip(out.astype(np.float32)*255/226, 0, 255).astype(np.uint8)
out = out[40:800, 40:930]
save(pad43(out,(255,255,255)),'hn-neck-levels.jpg',grid=True)
