#!/usr/bin/env python3
"""Cuts each shot from raw footage to film/public/shots/NNN.mp4 with its look baked in."""
import json,subprocess,os,sys
R='broll/raw';O='film/public/shots';os.makedirs(O,exist_ok=True)
d=json.load(open('film/src/edl.json'))
FX={'':'', 'bw':'hue=s=0,eq=contrast=1.18:brightness=-0.02,',
 'hicon':'hue=s=0,eq=contrast=5:brightness=0.05,',
 'neg':'negate,',
 'thermal':'hue=s=0,eq=contrast=1.45,format=yuv444p,pseudocolor=p=inferno,',
 'xray':"hue=s=0,negate,curves=all='0/0 0.15/0.15 0.35/0.8 1/1',format=yuv444p,pseudocolor=p=magma,",
 'turbo':'hue=s=0,eq=contrast=1.2,format=yuv444p,pseudocolor=p=turbo,',
 'blue':'hue=s=0,eq=contrast=1.6,format=rgb24,colorchannelmixer=rr=.12:gg=.32:bb=1.25,'}
def raw(src):
    if src=='reactor': return '../out/reactor-clean/video_16x9.mp4'
    if src.startswith('img_'): return f'{R}/{src}.jpg'
    if src in('CityWate1941','Preventi1940'): return f'{R}/{src}.mp4'
    return f'{R}/px_{src}.mp4'
for i,s in enumerate(d['shots']):
    out=f'{O}/{i:03d}.mp4'; s['file']=f'shots/{i:03d}.mp4'
    if s['img']: 
        s['file']=f'shots/{i:03d}.jpg'; out=f'{O}/{i:03d}.jpg'
        subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',raw(s['src']),'-vf','scale=2200:1238:force_original_aspect_ratio=increase,crop=2200:1238','-q:v','2',out],check=True); continue
    dur=s['n']*.5; sp=s['sp']; arch=s['src'] in('CityWate1941','Preventi1940')
    pre='crop=640:360:0:%d,scale=1920:1080:flags=lanczos,unsharp=5:5:0.6,noise=alls=9:allf=t,'%(18 if arch else 0) if arch else 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,'
    vf=f"{pre}{FX[s['fx']]}setpts={1/sp:.4f}*PTS,fps=60,format=yuv420p"
    subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-ss',str(s['ss']),'-i',raw(s['src']),'-t',f'{dur+.2:.3f}','-an','-vf',vf,'-c:v','libx264','-preset','veryfast','-crf','15','-g','15',out],check=True)
json.dump(d,open('film/src/edl.json','w'),indent=0)
print('cut',len(d['shots']))
