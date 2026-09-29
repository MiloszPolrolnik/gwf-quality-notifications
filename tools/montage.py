import sys, glob
from PIL import Image
prefix, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(prefix + '-*.png'))
ims = [Image.open(f).convert('RGB') for f in fs]
w = sum(i.width for i in ims) + 8 * (len(ims) - 1)
o = Image.new('RGB', (w, max(i.height for i in ims)), (140, 140, 140))
x = 0
for i in ims:
    o.paste(i, (x, 0)); x += i.width + 8
o.save(out)
