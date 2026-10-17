import numpy as np, json
from PIL import Image
a=np.array(Image.open('d5a.png').convert('L'))>128
P=json.load(open('dodd_points.json'))
yt=np.array([1170.5,941.5,712.5,484.0,256.0]); yv=np.array([0,.2,.4,.6,.8]); py=np.polyfit(yt,yv,1)
def cap(c,r,step):
    # walk along the error-bar stem (thin vertical line at column c) away from the marker edge
    y=r+step*27; last=None
    while 30<y<1165:
        stem=a[y,c-2:c+3].any(); wide=a[y,c-14:c+15].sum()
        if wide>=20: last=y           # horizontal cap
        if not stem: break
        y+=step
    return last
for k in P:
    for p in P[k]:
        c,r=p[2],p[3]
        up,dn=cap(c,r,-1),cap(c,r,1)
        print(k,p[0],p[1],'err up',None if up is None else round(np.polyval(py,up)-p[1],3),'err down',None if dn is None else round(p[1]-np.polyval(py,dn),3))
