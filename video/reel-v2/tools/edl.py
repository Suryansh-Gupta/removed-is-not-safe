#!/usr/bin/env python3
"""Reel v2 shot list. One beat = 0.5 s (120 bpm). Flash bursts are the backbone: 0.0625-0.25 s per image, as in the reference reels."""
import json,random,os
A,B='CityWate1941','Preventi1940'
rng=random.Random(2027)
DUR={}
for p in ('docs/sheets/durations.txt','../reel-v1/docs/sheets/durations.txt'):
    for l in open(p):
        k,v=l.split()[:2]; DUR[k]=float(v)
S=[]
def s(b,n,src,ss=None,fx='',sp=1.0,dim=0.0,img=False,f=None,z=0,iris=0): S.append(dict(b=b,n=n,src=str(src),ss=ss,fx=fx,sp=sp,dim=dim,img=img,f=(f if f is not None else (3 if n<=.25 else 6 if n<=.5 else 22)),z=z,iris=iris))
# ---- pools ----
HOPE=[7505272,8576642,9208375,7331149,5336526,6297407,10141761,34078419,35032517,18420612,31161117,8319938,29251309,5311736,2675514,6062824,35997572,36030226,38594546,4696007,35289187,3327253,8534959,5114891,6849009,31365794,32511131,14378418,4487266,7476644,6396993,4571536,3578239]
WATER=[35032517,18420612,31161117,4696007,35289187,4571536,6396993,33239592,2675514,6062824,5311736,14378418,31742397,38594546,36030226,4046348]
MED=[7507342,7033914,5697635,7033927,31767905,31767912,31767895,35150986,33481533,4976872,6130537,9430412,8325997,4586690,6849009,5336526,6130056,4492602,8534418]
DARK=[34910580,29851224,36043708,35419786,38533119,16392053,18333375,9837848,35968183,30769473,12298312,29936066,9665456,6415611,4888198,5535467,3194277,29823750]
BUG=[34910580,29851224,36043708,35419786,38533119,4123371,31767895,31767912,8852382]
BUILD=[10643353,10643516,32402591,9244228,9430456,8325997,8381415,8534418,8540172,8852381,31750589,16943480,4941365,6754820,8326170,8327414,8327432]
PLANT=[11131403,11131429,14189689,14189696,5131192,5115937,27114630,3999422,30243437,16943480]
ARCH=[(A,t) for t in (42,172,333,356,371,516)]+[(B,579)]
LOOK_WILD=['thermal','hicon','neg','fire','blue','turbo','xray','acid','bw','']
def pick(pool,last=[None]):
    src=rng.choice(pool)
    while src==last[0]: src=rng.choice(pool)
    last[0]=src
    d=DUR.get(str(src),8)
    return src,round(rng.uniform(d*.1,max(d*.1+.1,d*.85)),2)
import subprocess
_L={}
def luma(src,ss):
    k=(src,ss)
    if k not in _L:
        base=f'broll/raw/px_{src}.mp4' if os.path.exists(f'broll/raw/px_{src}.mp4') else f'broll/raw_v1/px_{src}.mp4'
        r=subprocess.run(['ffmpeg','-nostdin','-v','error','-ss',str(ss),'-i',base,'-frames:v','1','-vf','scale=16:9,format=gray','-f','rawvideo','-'],capture_output=True).stdout
        _L[k]=sum(r)/max(1,len(r))
    return _L[k]
def burst(b,rhythm,pools,looks=('',),dim=0.0,ramp=False):
    """rhythm: (count, beats each). The whole burst shares one continuous push-in. ramp=True orders images dark to bright so the burst climbs instead of strobing."""
    b0=b;steps=[st for c,st in rhythm for _ in range(c)]
    picks=[];used=set()
    for i in range(len(steps)):
        pool=pools[i%len(pools)]
        src,ss=pick(pool);tries=0
        while src in used and tries<20: src,ss=pick(pool);tries+=1
        used.add(src)
        if len(used)>len(pool)*.8: used.clear()
        picks.append((src,ss))
    if ramp: picks.sort(key=lambda x:luma(*x))
    for i,(st,(src,ss)) in enumerate(zip(steps,picks)):
        s(b,st,src,ss,looks[i%len(looks)],dim=dim,z=(b-b0)*30); b+=st
    return b
def arch(b,n,idx,fx='bw',dim=0.0,off=0): s(b,n,ARCH[idx][0],ARCH[idx][1]+off,fx,dim=dim)
# ---- ACT 1: the promise. Every line now sits on moving pictures, no black cards ----
burst(0,[(4,.25),(8,.125),(4,.25),(2,.5)],[HOPE],ramp=True)   # eases in and back out
s(4,4,34078419,5,sp=.6,f=30); s(8,4,8576642,3,sp=.6,f=30,dim=.28); s(12,4,7505272,4,sp=.6,f=30,dim=.25)
burst(16,[(8,.5)],[WATER],dim=.18,ramp=True)
s(20,3,14378418,4,'bw',sp=.7,dim=.28,f=26)
for i,(ix,o) in enumerate([(0,0),(1,0),(6,0),(0,3)]): arch(23+i,1,ix,off=o,dim=.3)
burst(27,[(8,.5)],[[3192916,5203510,6011420,6130537,4314406,30243437]],looks=('bw',),dim=.15)
s(31,2,A,356,'bw',dim=.3,f=20)
burst(33,[(8,.25)],[PLANT],looks=('bw','bw','bw','bw','','','',''),dim=.2)
arch(35,2,2)
s(37,2,11131429,12,sp=.7,dim=.25,f=24); s(39,2,8325997,3,sp=.7,dim=.3,f=24)
burst(41,[(4,.5),(8,.25)],[MED],dim=.15)
s(45,2,5336526,3,sp=.7,dim=.2,f=20); s(47,4,35997572,3,sp=.6,dim=.15,f=30); s(51,3,38594546,4,sp=.5,dim=.35,f=36)
# ---- ACT 2: the turn ----
s(54,2,5942153,8,'bw',dim=.25,f=26); s(56,2,855311,10,dim=.2); s(58,2,14189696,6,dim=.3); s(60,2,5131192,40,dim=.3)
# one unbroken shot of the glass, clear; the false colour blooms out of its centre on the same shot
s(72,18,8554345,3,'',.5,f=20)
s(81,9,8554345,5.25,'xray',.5,f=0,iris=70)
s(94,2,34910580,2,sp=.6,dim=.4,f=30)
burst(96,[(8,.5)],[BUG],looks=('blue','blue','xray','xray','thermal','thermal','fire','fire'),dim=.25)
burst(100,[(16,.25)],[BUG,DARK],looks=('fire','fire','fire','thermal','thermal','thermal','fire','fire'),dim=.2,ramp=True)
s(104,4,3192916,5,'bw',.7,dim=.35,f=36); s(108,4,6011420,2,'bw',.7,dim=.4,f=30)
s(112,4,5535467,6,'bw',dim=.55,f=30); s(116,4,3999422,10,'bw',dim=.55,f=30)
s(120,2,16943480,2,dim=.25,f=26); s(122,2,4941365,2,dim=.25,f=20); s(124,2,31750589,1,dim=.25,f=20)
s(126,4,4941365,3,'bw',dim=.72,f=30)
s(130,4,10643353,3,sp=.6,dim=.35,f=36)
# ---- ACT 3: the rise ----
s(142,3,'reactor',41.2,f=20); s(145,6,'reactor',46.0,f=14); s(151,1,'reactor',52.4,f=14); s(152,2.5,'reactor',57.0,f=14); s(154.5,1.5,'reactor',62.2,f=14)
for k,b in enumerate((156,158,160,162)): burst(b,[(8,.25)],[BUILD],dim=.3)
burst(164,[(6,.5)],[[8381415,8534418,8540172,31767905,8852381,9244228]],dim=.35)
burst(167,[(6,.5)],[BUG],looks=('','blue','','thermal'),dim=.35)
s(178,3,11131429,12,dim=.35,f=30)
for i,b in enumerate((181,183.5,186,188.5)):
    burst(b,[(5,.5)],[PLANT if i!=2 else BUILD],dim=.58)
s(191,2,A,42,'bw',dim=.35,f=30); s(193,2,33637800,3,dim=.3,f=30)
s(195,3,34078419,5,sp=.7,dim=.25,f=36)
s(198,4,10141761,3,sp=.7,dim=.4,f=36)
# the climax eases from half beats to eighths, dark to bright, and blooms into the rose of the ending
b=burst(202,[(8,.5)],[HOPE,PLANT,MED,BUG],looks=('','','blue','blue','xray','xray','thermal','thermal'),dim=.12,ramp=True)
b=burst(b,[(16,.25)],[WATER,PLANT,BUG,BUILD,DARK,HOPE],looks=('thermal','thermal','fire','fire','','','blue','blue'),ramp=True)
b=burst(b,[(32,.125)],[HOPE,BUG,PLANT,MED,DARK,WATER,BUILD],looks=('','fire','','thermal'),ramp=True)
S.sort(key=lambda x:x['b'])
json.dump(dict(bpm=120,beats=230,shots=S),open('film/src/edl.json','w'),indent=0)
flash=sum(1 for x in S if x['n']<=.5)
print(len(S),'shots,',flash,'flashes; last beat',S[-1]['b'])
