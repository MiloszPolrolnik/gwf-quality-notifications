"""Numeric comparison of original vs generated PDF.
   python tools/compare.py <generated.pdf> [text|lines]
   text : first-baseline positions of every word (dx, dy in pt)
   lines: horizontal/vertical rules detected from a 400 dpi raster (y/x centre, thickness)"""
import sys, subprocess, os
import pdfplumber, numpy as np
from PIL import Image
orig = os.path.join('docs', 'DL05-F0987 - Quality Notification.pdf')
gen = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else 'text'

def words(path, pn):
    p = pdfplumber.open(path).pages[pn]
    out = []
    for w in p.extract_words(extra_attrs=['fontname', 'size'], keep_blank_chars=False):
        if w['upright'] is False or '☐' in w['text'] or len(w['text']) == 0: continue
        cs = [c for c in p.chars if abs(c['x0'] - w['x0']) < 0.01 and abs(c['top'] - w['top']) < 0.01]
        if cs and abs(cs[0]['matrix'][1]) > 0.01: continue  # rotated label
        base = 842.04 - cs[0]['matrix'][5] if cs else w['bottom']
        out.append((w['text'], w['x0'], base, w['size']))
    return out

def runs(path, pn, dpi=400):
    subprocess.run(['pdftoppm', '-r', str(dpi), '-f', str(pn + 1), '-l', str(pn + 1), '-gray', '-png', path, '.work/rl'], check=True, stderr=subprocess.DEVNULL)
    f = [x for x in os.listdir('.work') if x.startswith('rl-')][0]
    im = np.array(Image.open('.work/' + f).convert('L')) < 200
    os.remove('.work/' + f)
    s = dpi / 72
    res = {}
    for axis, name in ((1, 'H'), (0, 'V')):
        prof = im.sum(axis=axis)  # per row/col count of dark
        thr = 0.25 * (im.shape[axis])  # at least 25% of page width/height... too strict for short lines
        prof2 = np.zeros(len(prof), int)
        # longest dark run per row/col
        a = im if axis == 1 else im.T
        for i in range(a.shape[0]):
            row = a[i]
            if not row.any(): continue
            d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
            st = np.where(d == 1)[0]; en = np.where(d == -1)[0]
            prof2[i] = (en - st).max()
        idx = np.where(prof2 > 40 * s / 4)[0]
        cl = []
        for i in idx:
            if cl and i - cl[-1][1] <= 1: cl[-1][1] = i
            else: cl.append([i, i])
        res[name] = [((a0 + a1 + 1) / 2 / s, (a1 - a0 + 1) / s) for a0, a1 in cl]
    return res

for pn in (0, 1):
    print('==== page', pn + 1)
    if mode == 'text':
        a = words(orig, pn); b = words(gen, pn)
        bm = {}
        for t in b: bm.setdefault(t[0], []).append(t)
        bad = 0
        for t, x, y, sz in a:
            cand = bm.get(t)
            if not cand: print('MISSING in gen: %-20s x=%.2f base=%.2f' % (t, x, y)); continue
            c = min(cand, key=lambda u: abs(u[2] - y) + abs(u[1] - x))
            dx, dy = c[1] - x, c[2] - y
            if abs(dx) > 0.3 or abs(dy) > 0.3:
                bad += 1
                print('%-22s orig x=%.2f base=%.2f | dx=%+.2f dy=%+.2f size %.1f/%.1f' % (t[:22], x, y, dx, dy, sz, c[3]))
        print('words off by >0.3pt:', bad, 'of', len(a))
    else:
        ro = runs(orig, pn); rg = runs(gen, pn)
        for k in ('H', 'V'):
            print(k, 'orig:', ' '.join('%.2f(%.2f)' % v for v in ro[k]))
            print(k, 'gen :', ' '.join('%.2f(%.2f)' % v for v in rg[k]))
