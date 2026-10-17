import numpy as np, json
from PIL import Image
from scipy import ndimage as ndi
from scipy.signal import fftconvolve
a=np.array(Image.open('d5a.png').convert('L'))>128
# calibration from tick marks (pixel centres found in ticks.py)
xt=np.array([238.0,601.0,962.0,1324.5,1686.0]); xv=np.array([0,20,40,60,80])
yt=np.array([1170.5,941.5,712.5,484.0,256.0]); yv=np.array([0,.2,.4,.6,.8])
px=np.polyfit(xt,xv,1); py=np.polyfit(yt,yv,1)
print('x res',np.polyval(px,xt)-xv,'y res',np.polyval(py,yt)-yv)
X=lambda c: np.polyval(px,c); Y=lambda r: np.polyval(py,r)
# plot area only (exclude legend box region x>1000,y<420 and frame)
mask=np.zeros_like(a); mask[35:1165,245:1860]=1
legend=np.zeros_like(a); legend[40:440,560:1860]=1
A=a&mask.astype(bool)
yy,xx=np.mgrid[-30:31,-30:31]; rr=np.hypot(xx,yy)
# filled disks: erosion with radius-17 disk
er=ndi.binary_erosion(A,structure=rr<=17)
lab,n=ndi.label(er)
filled=[ndi.center_of_mass(er,lab,i) for i in range(1,n+1)]
# open rings: score = ink fraction in annulus 19..25 minus ink fraction in core <=11
ann=((rr>=19)&(rr<=25)).astype(float); core=(rr<=11).astype(float)
f=A.astype(float)
sa=fftconvolve(f,ann[::-1,::-1],mode='same')/ann.sum()
sc=fftconvolve(f,core[::-1,::-1],mode='same')/core.sum()
score=sa-sc
cand=(score>0.75)&(sc<0.08)
lab2,n2=ndi.label(cand)
rings=[]
for i in range(1,n2+1):
    ys,xs=np.where(lab2==i); k=np.argmax(score[ys,xs]); rings.append((ys[k],xs[k],score[ys[k],xs[k]]))
out={'filled':[],'open':[]}
for (r,c) in filled:
    if legend[int(r),int(c)]: continue
    out['filled'].append((round(X(c),2),round(Y(r),4),int(c),int(r)))
for (r,c,s) in rings:
    if legend[int(r),int(c)]: continue
    out['open'].append((round(X(c),2),round(Y(r),4),int(c),int(r),round(s,2)))
for k in out:
    out[k].sort(); print(k); [print('  ',p) for p in out[k]]
json.dump(out,open('dodd_points.json','w'))
