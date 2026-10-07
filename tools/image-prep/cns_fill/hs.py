# plate id -> dict(file, caption, title(optional), hs={hotspot_id:(x,y)}, drop=[ids], blurbs={id:new blurb})
HS={}
MR="Source: OpenNeuro ds003653 (Manelis A et al.), 3T MRI of a healthy adult volunteer, CC0 public domain."
HS["cns-sagittal"]=dict(file="cns-sagittal.jpg",caption="Midline sagittal T1 MRI of a normal adult brain (anterior on the left). "+MR,
  hs={"cc":(46,47),"thalamus":(47,53),"pituitary":(37,72),"chiasm":(35.5,66),"pineal":(56,58.5),"midbrain":(51,63),"pons":(50,75),"medulla":(55,88),"4v":(61,71),"vermis":(71,76)})
HS["cns-sagittal"]["hs"]={"cc":(46,47),"thalamus":(47,53),"pituitary":(37,72),"chiasm":(35.5,66),"pineal":(56,58.5),"midbrain":(51,63),"pons":(50,75),"medulla":(55,88),"fourth":(61,71),"cerebellum-s":(71,76)}
HS["ax-vertex"]=dict(file="cns-ax-vertex.jpg",caption="Axial T1 MRI above the lateral ventricles (patient's right on your left). "+MR,
  hs={"v-csv":(38,45),"v-falx":(50,32),"v-sss":(48.8,87.5),"v-cortex":(29,28)},drop=["v-motor"])
HS["ax-ventricles"]=dict(file="cns-ax-ventricles.jpg",caption="Axial T2 MRI through the bodies of the lateral ventricles (CSF is bright). "+MR,
  hs={"lv-body":(54,50),"lv-cc":(49.5,35.5),"lv-caudate":(41.8,44),"lv-cr":(33,45),"lv-septum":(49.5,46)})
HS["ax-bg"]=dict(file="cns-ax-bg.jpg",caption="Axial T1 MRI at the level of the basal ganglia and thalami (CSF is dark). "+MR,
  hs={"bg-frontal-horn":(52.5,33),"bg-caudate":(44.5,37),"bg-ic":(44.5,44),"bg-lent":(41,47),"bg-thal":(47,51),"bg-third":(49.6,53),"bg-insula":(34,47),"bg-occ-horn":(57,62)})
HS["ax-midbrain"]=dict(file="cns-ax-midbrain.jpg",caption="Axial T1 MRI through the midbrain and suprasellar cistern. "+MR,
  hs={"mb-peduncle":(45,48),"mb-aqueduct":(49.8,55.5),"mb-chiasm":(51,37),"mb-hippo":(40.5,52),"mb-temporal":(32,50),"mb-mca":(37,32.5)})
HS["ax-pons"]=dict(file="cns-ax-pons.jpg",caption="Axial T2 MRI through the pons and inner ears (CSF and inner-ear fluid are bright). "+MR,
  hs={"p-pons":(50,52),"p-cpa":(43,55),"p-iac":(40,51.5),"p-cochlea":(35.5,48.5),"p-fourth":(49,61),"p-cereb":(33,66),"p-basilar":(50.5,44.5)})
HS["ax-medulla"]=dict(file="cns-ax-medulla.jpg",caption="Axial T1 MRI at the foramen magnum: medulla with the cerebellar tonsils behind it. "+MR,
  hs={"m-medulla":(49.5,57),"m-tonsils":(46.5,65.5),"m-fm":(44.3,57)},drop=["m-clivus","m-vert","m-jug"])
