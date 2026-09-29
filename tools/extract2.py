import pdfplumber, sys
from collections import defaultdict
pdf = pdfplumber.open(sys.argv[1])
for pn, p in enumerate(pdf.pages):
    print("=== PAGE", pn+1, p.width, p.height)
    H=[];V=[]
    for r in p.rects:
        w=r['x1']-r['x0']; h=r['bottom']-r['top']
        if h<=2 and w>2: H.append((round(r['top'],2),round(r['bottom'],2),r['x0'],r['x1']))
        elif w<=2 and h>2: V.append((round(r['x0'],2),round(r['x1'],2),r['top'],r['bottom']))
    # merge H by (top,bottom)
    d=defaultdict(list)
    for t,b,x0,x1 in H: d[(t,b)].append((x0,x1))
    print("-- horizontal edges (top,bot,thick) -> merged x spans")
    for (t,b),sp in sorted(d.items()):
        sp.sort(); m=[]
        for a,c in sp:
            if m and a<=m[-1][1]+0.05: m[-1][1]=max(m[-1][1],c)
            else: m.append([a,c])
        print("H y=%.2f-%.2f th=%.2f spans=%s"%(t,b,b-t," ".join("%.1f-%.1f"%(a,c) for a,c in m)))
    d=defaultdict(list)
    for x0,x1,t,b in V: d[(x0,x1)].append((t,b))
    print("-- vertical edges")
    for (x0,x1),sp in sorted(d.items()):
        sp.sort(); m=[]
        for a,c in sp:
            if m and a<=m[-1][1]+0.05: m[-1][1]=max(m[-1][1],c)
            else: m.append([a,c])
        print("V x=%.2f-%.2f th=%.2f spans=%s"%(x0,x1,x1-x0," ".join("%.1f-%.1f"%(a,c) for a,c in m)))
    print("-- other rects (non-edge)")
    for r in p.rects:
        w=r['x1']-r['x0']; h=r['bottom']-r['top']
        if not((h<=2 and w>2) or (w<=2 and h>2)): print("O %.2f %.2f %.2f %.2f"%(r['x0'],r['top'],r['x1'],r['bottom']))
    print("-- text (upright)")
    up=p.filter(lambda o: o['object_type']!='char' or o.get('upright',True))
    for t in up.extract_text_lines(return_chars=True):
        c=t['chars'][0]
        print("T x0=%.2f x1=%.2f top=%.2f bot=%.2f %s %.1f | %s"%(t['x0'],t['x1'],t['top'],t['bottom'],c['fontname'].split('+')[1],c['size'],t['text']))
    print("-- rotated chars")
    rc=[c for c in p.chars if not c.get('upright',True)]
    print(len(rc), sorted(set((c['fontname'].split('+')[1],round(c['size'],1)) for c in rc)))
    print("images",[(round(i['x0'],1),round(i['top'],1),round(i['x1'],1),round(i['bottom'],1)) for i in p.images])
