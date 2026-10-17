import numpy as np, json
from PIL import Image
b=np.array(Image.open('kimg-000.png').convert('L')).astype(int)
times=[0,0.5,1,5,10,30,60,120]
res={}
for panel,(xa,xb) in {'A':(119,672),'B':(854,1416)}.items():
    # y ticks: short dark marks just left of the y axis
    band=(b[0:660,xa-9:xa-2]<120).sum(1)
    t=np.where(band>=4)[0]; ticks=[]
    for i in t:
        if not ticks or i>ticks[-1][-1]+1: ticks.append([i])
        else: ticks[-1].append(i)
    tk=[np.mean(g) for g in ticks]; print(panel,'y tick rows',[round(v,1) for v in tk])
    vals=np.arange(len(tk))[::-1]*0.2   # top tick = 1.2
    py=np.polyfit(tk,vals,1); print(' resid',np.round(np.polyval(py,tk)-vals,4))
    Y=lambda r: float(np.polyval(py,r))
    row=625
    seg=b[row,xa+3:xb-3]
    def runs(lo,hi):
        m=(seg>=lo)&(seg<=hi); out=[];s=None
        for i,v in enumerate(m):
            if v and s is None: s=i
            if not v and s is not None:
                if i-s>=8: out.append((s+xa+3,i-1+xa+3))
                s=None
        return out
    dk=runs(40,95); gr=runs(120,175)
    print(' dark bars',dk); print(' gray bars',gr)
    out=[]
    for name,bars,(lo,hi) in [('cipro',dk,(40,95)),('PEQ',gr,(120,175))]:
        for j,(s,e) in enumerate(bars):
            c=(s+e)//2; w=e-s
            cols=[s+2, s+w//4, e-w//4, e-2]
            tops=[]
            for cc in cols:
                r=row
                while r>16 and b[r-1,cc]<200: r-=1   # climb through bar fill and any black cap line until background
                tops.append(r)
            top=np.median(tops)
            # error bar: black pixels in the centre column
            colc=b[:640,c-1:c+2].min(1); blk=np.where(colc<40)[0]
            # caps: rows where a wide black run is centred on c
            caps=[r for r in range(5,640) if (b[r,c-8:c+9]<60).sum()>=10]
            capg=[]
            for r in caps:
                if not capg or r>capg[-1][-1]+1: capg.append([r])
                else: capg[-1].append(r)
            capr=[np.mean(g) for g in capg]
            above=[x for x in capr if x<top-1 and x>top-120]; below=[x for x in capr if top+1<x<top+120]
            hi_cap=min(above) if above else None; lo_cap=max(below) if below else None
            out.append(dict(series=name,time=times[j],value=round(Y(top-0.5),4),
                            sd_up=None if hi_cap is None else round(Y(hi_cap)-Y(top-0.5),3),
                            sd_down=None if lo_cap is None else round(Y(top-0.5)-Y(lo_cap),3),
                            px=dict(col=int(c),top=float(top),caps=[round(x,1) for x in capr])))
    res[panel]=out
    for o in out: print(' ',o)
json.dump(res,open('kn_points.json','w'),indent=1)
