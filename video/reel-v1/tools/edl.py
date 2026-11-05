#!/usr/bin/env python3
"""The edit decision list. One beat = 0.5 s (120 bpm). Writes film/src/edl.json. Shots are cut by cut.py."""
import json
A,B='CityWate1941','Preventi1940'
# (start beat, length in beats, source, seconds in, fx, speed, dim)
S=[]
def s(b,n,src,ss=None,fx='',sp=1.0,dim=0.0,img=False): S.append(dict(b=b,n=n,src=str(src),ss=ss,fx=fx,sp=sp,dim=dim,img=img))
def seq(b,items,n=1,**k):
    for it in items:
        s(b,n,*it,**k) if isinstance(it,tuple) else s(b,n,it,**k); b+=n
    return b
# HOOK
s(0,2,8554345,3,'',.8); s(2,2,2675514,8,'',.7); s(4,4,8327432,5,'',1.0)
s(8,2,31767912,3); s(10,2,3195394,4)
s(12,1,8554345,12,'',.8); s(13,7,8554345,13,'xray',.6)
# white plate 20-24 (title line)
# WATER 24-30
seq(24,[(A,42,'bw'),(A,172,'bw'),(B,579,'bw'),(31161117,4),(8319938,10),(29251309,8)])
# CHLORINE 30-38
s(30,1,A,356,'bw',dim=.25);s(31,1,A,371,'bw',dim=.25);s(32,2,A,333,'bw');s(34,1,A,516,'bw',dim=.25);s(35,1,5131192,20);s(36,1,11131403,5);s(37,1,14189689,6)
# ANTIBIOTICS 38-44
seq(38,[(7507342,6),(7033914,2),(5697635,2),(7033927,4),('img_abtest',0,'',1.0,0.0,True),(31767905,14)])
# "Then they met." 44-46 black
# DRAIN 46-56
s(46,3,5942153,8,'bw');s(49,2,855311,10);s(51,2,7523597,3);s(53,1,14189696,6);s(54,2,5131192,40)
# MOLECULE PLATE 56-68
# TRAINING 68-82
s(68,3,34910580,2,dim=.3);s(71,3,29851224,3,dim=.3);s(74,1,36043708,2,'neg',dim=.2);s(75,3,36043708,5,dim=.3);s(78,4,35419786,3,dim=.25)
# DEATHS 82-90
s(82,4,3192916,5,'bw',.7,dim=.35);s(86,4,5203510,1,'bw',.7,dim=.35)
# BARS 90-98
s(90,4,5535467,6,'bw',dim=.55);s(94,4,3999422,10,'bw',dim=.55)
# DIALS 98-108
s(98,2,16943480,2,dim=.25);s(100,2,4941365,2,dim=.25);s(102,2,31750589,1,dim=.25)
# 104-108 black question
# BRIDGE 108-112
s(108,2,30243437,2,'bw',dim=.4);s(110,2,14189689,10,'bw',dim=.4)
# SCHEMATIC 112-124 plate
# 3D 124-144  (real seconds in the clean render)
s(124,3,'reactor',41.2);s(127,9,'reactor',46.0);s(136,2,'reactor',52.4);s(138,4,'reactor',57.0);s(142,2,'reactor',62.2)
# SETTINGS 144-152
s(144,2,8327414,6,dim=.5);s(146,2,8852381,4,dim=.25);s(148,2,8540172,3,dim=.25);s(150,2,8534418,4,dim=.2)
# TESTS 152-160
s(152,2,'img_hplc',0,dim=.35,img=True);s(154,2,8381415,4,dim=.3);s(156,2,3195394,9,dim=.45);s(158,2,4123371,3,dim=.35)
# MODEL 160-172 plate; steps
# PLANT 172-190
s(172,2,11131429,12,dim=.35)
s(174,2,31750589,2.5,dim=.58);s(176,2,16943480,6,dim=.58);s(178,2,3999422,20,dim=.58);s(180,2,8852382,8,dim=.58);s(182,2,8540172,6,dim=.58);s(184,2,9244192,8,dim=.58);s(186,2,5115937,12,dim=.58);s(188,2,35475345,4,dim=.62)
# CLOSE 190-200
s(190,2,11131403,9,dim=.45);s(192,3,5131192,30,dim=.45);s(195,2,14189696,14,'thermal',dim=.3);s(197,3,11131429,18,'thermal',dim=.3)
# BURST 200-204, half beats, one clip each, no repeats of a look
b=200
for it in [(8327432,9,'thermal'),(A,371,'hicon'),(7507342,14,'neg'),(29851224,6,'blue'),(5131192,50,'turbo'),(31767895,20,'hicon'),(8554345,20,'xray'),(11131429,25,'blue')]:
    S.append(dict(b=b,n=.5,src=str(it[0]),ss=it[1],fx=it[2],sp=1.0,dim=0,img=False)); b+=.5
json.dump(dict(bpm=120,beats=219,shots=S),open('film/src/edl.json','w'),indent=0)
print(len(S),'shots; last beat',S[-1]['b'])
