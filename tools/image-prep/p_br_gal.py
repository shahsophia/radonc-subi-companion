import os; os.environ["SITE"]="breast"
from imgtool import *
def up(img, f): return cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_CUBIC)
im=load('Histopathology_of_invasive_ductal_carcinoma,_intermediate_magnification.jpg'); save(im[0:718, 0:958], 'br-g-idc.jpg', maxw=900)
im=load('Invasive_Lobular_Carcinoma.jpg');                  save(im[50:770, 0:960], 'br-g-ilc.jpg', maxw=900)
im=load('Mammogram_microcalcifications_in_carcinoma_in_situ,_CC,_details.png'); save(pad43(im,(0,0,0)), 'br-g-calcs.jpg', maxw=1000)
im=load('breast_ultrasound_axillary_node.jpg');             save(im[200:920, 0:960], 'br-g-us-node.jpg', maxw=900)
im=load('Mri_of_breast_cancer.jpg');                        save(pad43(up(im[106:516, 369:597],1.6),(0,0,0)), 'br-g-mri-sag.jpg', maxw=1000)  # MRI panel only, slide title/credit cropped
