import pdfplumber, sys, json
pdf = pdfplumber.open(sys.argv[1])
for pn, p in enumerate(pdf.pages):
    print("=== PAGE", pn+1, p.width, p.height)
    print("-- rects")
    for r in p.rects:
        print("R x0=%.2f x1=%.2f top=%.2f bot=%.2f lw=%s fill=%s stroke=%s" % (r['x0'], r['x1'], r['top'], r['bottom'], r.get('linewidth'), r.get('fill'), r.get('stroke')))
    print("-- lines")
    for l in p.lines:
        print("L x0=%.2f x1=%.2f top=%.2f bot=%.2f lw=%s" % (l['x0'], l['x1'], l['top'], l['bottom'], l.get('linewidth')))
    print("-- words/lines of text")
    for t in p.extract_text_lines(return_chars=True):
        c = t['chars'][0]
        print("T x0=%.2f top=%.2f bot=%.2f %s %.1f | %s" % (t['x0'], t['top'], t['bottom'], c['fontname'], c['size'], t['text']))
    print("-- curves", len(p.curves), "images", [(i['x0'],i['top'],i['x1'],i['bottom']) for i in p.images])
