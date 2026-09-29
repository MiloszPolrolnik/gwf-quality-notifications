"""Compare every checkbox square (original glyph vs drawn box) at 1200 dpi."""
import sys, subprocess, os
import numpy as np, pdfplumber
from PIL import Image
orig = os.path.join('docs', 'DL05-F0987 - Quality Notification.pdf')
gen = sys.argv[1]
s = 1200 / 72
def bbox(path, page, x0, y0, w, h, thr=170):
    subprocess.run(['pdftoppm','-r','1200','-f',str(page),'-l',str(page),'-x',str(int(x0*s)),'-y',str(int(y0*s)),'-W',str(int(w*s)),'-H',str(int(h*s)),'-gray','-png',path,'.work/bb'],check=True,stderr=subprocess.DEVNULL)
    f=[x for x in os.listdir('.work') if x.startswith('bb-')][0]
    im=np.array(Image.open('.work/'+f).convert('L')); os.remove('.work/'+f)
    ys,xs=np.where(im<thr)
    if len(xs)==0: return None
    return (x0+xs.min()/s, x0+(xs.max()+1)/s, y0+ys.min()/s, y0+(ys.max()+1)/s)
pdf = pdfplumber.open(orig)
for pn, p in enumerate(pdf.pages):
    for c in p.chars:
        if c['text'] == '☐':
            x0, top = c['x0'], c['top']
            a = bbox(orig, pn+1, x0+0.5, top+0.3, 8.5, 7.6)
            b = bbox(gen, pn+1, x0+0.5, top+0.3, 8.5, 7.6)
            if a and b:
                d = [b[i]-a[i] for i in range(4)]
                flag = '' if all(abs(v) < 0.15 for v in d) else '  <<<'
                print('p%d glyph(%.2f,%.2f) d(x0,x1,y0,y1)=%+.2f %+.2f %+.2f %+.2f%s' % (pn+1, x0, top, *d, flag))
            else:
                print('p%d glyph(%.2f,%.2f) missing box in %s' % (pn+1, x0, top, 'gen' if a else 'orig'))
