import json,glob
S="/private/tmp/claude-501/-Users-sophiashah-Desktop-RadOnc-SubI-Companion/e0c3562e-c3d9-422c-b66e-2f93dbad1340/scratchpad/"
def ep(t,i): return json.load(open(S+"ep/"+t+".json"))[i]["file"]
F={
 "gray778":S+"cs/Gray778.png","gray972":S+"cs/Gray972.png",
 "npendo":ep("hn_npendo",5),"glotillus":ep("hn_ctglottis",20),"glotscope":ep("hn_glotcx",5),
 "submand":ep("hn_submand",0),"fom":ep("hn_fom",2),"cystic":ep("hn_cystic",9),
 "ocmri":glob.glob(S+"art/PMC12883927/*g003.jpg")[0],"occt":ep("hn_mandct",13),
 "npc1":glob.glob(S+"art/PMC12883944/*g001.jpg")[0],"npc3":ep("hn_npcmri",8),
 "larinv":glob.glob(S+"art/PMC3624744/*g018.jpg")[0],
 "tdlu":ep("br_tdlu",5),"ibc":ep("br_ibc",3),"axlev":ep("br_axlev",14),"cocco":glob.glob(S+"art/cocco/*Fig3_HTML.jpg")[0],
 "lsg":ep("br_lsg",12),"mlo":ep("br_mlo",12),"nact":ep("br_nact",11),"fb":ep("br_dibh",7),"dibh":ep("br_dibh",8),
 "drr":ep("br_drr",14),"brpet":ep("br_pet",15),"bone":glob.glob(S+"art/bone/*g002.jpg")[0],
 "rml":ep("th_rml",3),"at3":S+"atlas/PMC5321185_rrw076f03.jpg","at4":S+"atlas/PMC5321185_rrw076f04.jpg","at10":S+"atlas/PMC5321185_rrw076f10.jpg",
 "ebus":ep("th_ebus",12),"pet7":ep("th_pet7",9),"itmig":ep("th_itmig",0),"itmigct":ep("th_itmig",1),
 "mednodes":ep("th_zones",15),"brmets":ep("th_brmets",3),"pancoast":ep("th_apex",5),
}
F["ocmri2"]=glob.glob(S+"art/PMC12883927/*g002.jpg")[0]
F["at5"]=S+"atlas/PMC5321185_rrw076f05.jpg"
