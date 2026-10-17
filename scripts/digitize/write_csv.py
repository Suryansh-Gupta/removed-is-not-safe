import json, csv
D=json.load(open('dodd_points.json')); K=json.load(open('kn_points.json'))
sd={('filled',5):0.027,('open',5):0.059,('open',10):0.041,('open',15):0.037,('open',20):0.025,('open',60):0.029}
rows=[]
note1=("DIGITIZED 2026-10-16 from the vector-embedded 600-dpi figure image in dodd2005.pdf p.10 (Fig. 5a, CF-Ia1). "
       "Axes calibrated on tick marks (fit residual <0.001); marker centres found by shape detection; 1 px = 0.00087 C/C0, 0.055 min. "
       "sd = half error bar where visible; blank = bar hidden inside marker (<~0.02). Wastewater 60-min point is hidden under the drinking-water marker and is omitted.")
for kind,water,pH,F in [('filled','wastewater',7.3,'1.6e-4'),('open','drinking',6.6,'2.8e-5')]:
    first=True
    for t,v,*_ in D[kind]:
        T=round(t); s=sd.get((kind,T),'')
        rows.append([water,pH,F,'1.5e-6',T,round(v,3),s,note1 if (first and kind=='filled') else ''])
        first=False
with open('dodd2005_fig5a.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['water','pH','FAC_M','cipro0_M','time_min','C_over_C0','sd','note']); w.writerows(rows)
note2=("DIGITIZED 2026-10-16 from the 300-dpi figure image in kennedyneth2019.pdf p.6 (Fig. 2A/2B, doi 10.1039/C9EW00182D). "
       "Bar tops and error-bar caps located by pixel scan; y axis calibrated on tick marks (residual <0.001); 1 px = 0.0019. "
       "sd = half error bar (n = 3 replicate sets). Quench = H2O2 then catalase; cipro by LC-MS; PEQ = antibacterial potency equivalent (E. coli ATCC 11303).")
meta={'A':('ultrapure',2.0,''),'B':('wastewater',6.5,'wastewater: TOC 6.8 mg/L; NH3-N <0.1 mg/L; chlorine demand unknown')}
out=[]
for p in 'AB':
    c={o['time']:o for o in K[p] if o['series']=='cipro'}; q={o['time']:o for o in K[p] if o['series']=='PEQ'}
    for i,t in enumerate([0.5,1,5,10,30,60,120]):
        sdv=lambda o: '' if o['sd_up'] is None else round((o['sd_up']+(o['sd_down'] or o['sd_up']))/2,3)
        n = note2 if (p=='A' and i==0) else (meta[p][2] if i==0 else '')
        out.append([meta[p][0],7.0,meta[p][1],2.33,t,round(c[t]['value'],3),sdv(c[t]),round(q[t]['value'],3),sdv(q[t]),n])
with open('kennedyneth2019_fig2.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['water','pH','Cl_dose_mgL','cipro_mgL','time_min','cipro_C_over_C0','cipro_sd','PEQ','PEQ_sd','note']); w.writerows(out)
