# /// script
# dependencies = ["pillow"]
# ///
import sys,glob,os
from PIL import Image,ImageDraw,ImageFont
d=sys.argv[1];fs=sorted(glob.glob(d+'/t/*.png'));W=8;cw,ch=320,180
H=(len(fs)+W-1)//W
im=Image.new('RGB',(W*cw,H*ch))
f=ImageFont.load_default(16)
for i,p in enumerate(fs):
    t=Image.open(p).convert('RGB').resize((cw,ch));im.paste(t,(i%W*cw,i//W*ch));ImageDraw.Draw(im).text((i%W*cw+3,i//W*ch+2),os.path.basename(p)[:-4],fill='yellow',font=f)
im.save(d+'/pexels.jpg',quality=85)
