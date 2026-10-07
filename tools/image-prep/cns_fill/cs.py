"""cs.py search 'terms' [n]  |  cs.py info File:Name.png  |  cs.py get File:Name.png [width]"""
import sys,json,urllib.request,urllib.parse,time,os
UA={"User-Agent":"RadOncStudyBot/1.0 (shahsophia18 study app; python urllib)"}
def api(**p):
    p.update(format="json")
    u="https://commons.wikimedia.org/w/api.php?"+urllib.parse.urlencode(p)
    for i in range(6):
        try: return json.loads(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read())
        except Exception as e:
            print("retry",e,file=sys.stderr); time.sleep(5*(i+1))
cmd=sys.argv[1]
if cmd=="search":
    r=api(action="query",generator="search",gsrsearch=sys.argv[2],gsrnamespace=6,gsrlimit=int(sys.argv[3]) if len(sys.argv)>3 else 20,prop="imageinfo",iiprop="size|extmetadata",iiextmetadatafilter="LicenseShortName|Artist")
    for pg in (r or {}).get("query",{}).get("pages",{}).values():
        ii=pg["imageinfo"][0]; m=ii.get("extmetadata",{})
        print(pg["title"],ii["width"],"x",ii["height"],"|",m.get("LicenseShortName",{}).get("value"),"|",m.get("Artist",{}).get("value","")[:60].replace("\n"," "))
elif cmd in("info","get"):
    t=sys.argv[2]; w=int(sys.argv[3]) if len(sys.argv)>3 else 1600
    r=api(action="query",titles=t,prop="imageinfo",iiprop="url|size|extmetadata",iiurlwidth=w)
    pg=list(r["query"]["pages"].values())[0]; ii=pg["imageinfo"][0]; m=ii["extmetadata"]
    for k in("LicenseShortName","Artist","Credit","ImageDescription","UsageTerms"): print(k,":",m.get(k,{}).get("value","")[:300].replace("\n"," "))
    if cmd=="get":
        u=ii.get("thumburl") or ii["url"]; os.makedirs("cs",exist_ok=True)
        fn="cs/"+t.split(":",1)[1].replace(" ","_")
        if u.endswith(".png") and not fn.endswith(".png"): fn+=".png"
        for i in range(6):
            try: open(fn,"wb").write(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=90).read()); break
            except Exception as e: print("retry",e); time.sleep(8*(i+1))
        print("saved",fn,u)
