import re,json,urllib.request,time
terms="water,drop,faucet,tap,river,ocean,waves,underwater,laboratory,scientist,microscope,science,chemistry,test-tube,pills,medicine,hospital,doctor,pipes,factory,industrial,bubbles,city,aerial,dna,cells,virus,bacteria,glass,sink,drain,rain,sewage,pollution,technology,lab,liquid,ink,dam".split(',')
out={}
for t in terms:
    for page in ('',):
        try:
            req=urllib.request.Request(f"https://mixkit.co/free-stock-video/{t}/",headers={'User-Agent':'Mozilla/5.0'})
            h=urllib.request.urlopen(req,timeout=25).read().decode('utf8','ignore')
        except Exception as e:
            print(t,'ERR',e);continue
        items=re.findall(r'(https://assets\.mixkit\.co/active_storage/video_items/(\d+)/\d+/\d+-video-720\.mp4)',h) or []
        for m in re.finditer(r'/video_items/(\d+)/(\d+)/\1-video',h):
            i=m.group(1)
            if i in out: out[i]['t'].add(t); continue
            out[i]={'stamp':m.group(2),'t':{t},'title':''}
        for m in re.finditer(r'<a[^>]+href="/free-stock-video/([a-z0-9-]+)-(\d+)/"',h):
            if m.group(2) in out: out[m.group(2)]['title']=m.group(1)
        print(t,len(out))
        time.sleep(.3)
for v in out.values(): v['t']=sorted(v['t'])
json.dump(out,open('docs/mixkit_catalog.json','w'),indent=0)
for i,v in sorted(out.items(),key=lambda x:x[1]['t']): print(i,v['title'],v['t'][:3])
