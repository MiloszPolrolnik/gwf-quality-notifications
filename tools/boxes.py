"""bbox of the first checkbox (Scrap) and rotated label in original vs generated."""
import sys, subprocess, os
import numpy as np, pdfplumber
from PIL import Image
orig = os.path.join('docs', 'DL05-F0987 - Quality Notification.pdf')
gen = sys.argv[1]
s = 1200 / 72
def bbox(path, page, x0, y0, w, h, thr=160):
    subprocess.run(['pdftoppm','-r','1200','-f',str(page),'-l',str(page),'-x',str(int(x0*s)),'-y',str(int(y0*s)),'-W',str(int(w*s)),'-H',str(int(h*s)),'-gray','-png',path,'.work/bb'],check=True,stderr=subprocess.DEVNULL)
    f=[x for x in os.listdir('.work') if x.startswith('bb-')][0]
    im=np.array(Image.open('.work/'+f).convert('L')); os.remove('.work/'+f)
    ys,xs=np.where(im<thr)
    return (x0+xs.min()/s, x0+(xs.max()+1)/s, y0+ys.min()/s, y0+(ys.max()+1)/s)
for name,path in (('orig',orig),('gen',gen)):
    print(name,'scrap box  x %.2f-%.2f y %.2f-%.2f'%bbox(path,1,80,513.3,10.5,9))
    print(name,'p2 box(ja) x %.2f-%.2f y %.2f-%.2f'%bbox(path,2,428,268.0,12,9))
    p=pdfplumber.open(path).pages
    for pn,(y0,y1) in ((0,(110,225)),(0,(244,356)),(0,(377,493))):
        cs=[c for c in p[pn].chars if c['x0']<75 and y0<c['top']<y1 and abs(c['matrix'][1])>0.5]
        print(name,'label',y0,y1,'x %.2f-%.2f y %.2f-%.2f'%(min(c['x0'] for c in cs),max(c['x1'] for c in cs),min(c['top'] for c in cs),max(c['bottom'] for c in cs)))
