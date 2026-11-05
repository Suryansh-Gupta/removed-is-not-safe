# /// script
# dependencies = ["pillow"]
# ///
import sys,glob
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/*.jpeg')+glob.glob(sys.argv[1]+'/*.jpg')+glob.glob(sys.argv[1]+'/*.png'));W=int(sys.argv[3]) if len(sys.argv)>3 else 6
t=Image.open(fs[0]);cw=480;ch=int(cw*t.height/t.width);im=Image.new('RGB',(W*cw+W,((len(fs)+W-1)//W)*(ch+1)),'#333')
for i,p in enumerate(fs): im.paste(Image.open(p).convert('RGB').resize((cw,ch)),(i%W*(cw+1),i//W*(ch+1)))
im.save(sys.argv[2],quality=85)
