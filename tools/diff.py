"""Render original + generated PDFs to PNG and diff them.
   python tools/diff.py <generated.pdf> [dpi]
   writes .work/diff-<n>.png (side by side: original | generated | overlay) and prints mismatch %"""
import subprocess, sys, os
from PIL import Image, ImageChops
import numpy as np
gen = sys.argv[1]
dpi = sys.argv[2] if len(sys.argv) > 2 else '100'
orig = os.path.join('docs', 'DL05-F0987 - Quality Notification.pdf')
w = '.work'
subprocess.run(['pdftoppm', '-r', dpi, '-png', orig, f'{w}/o'], check=True, stderr=subprocess.DEVNULL)
subprocess.run(['pdftoppm', '-r', dpi, '-png', gen, f'{w}/g'], check=True, stderr=subprocess.DEVNULL)
for n in (1, 2):
    a = Image.open(f'{w}/o-{n}.png').convert('L')
    b = Image.open(f'{w}/g-{n}.png').convert('L')
    A = np.array(a) < 200; B = np.array(b) < 200
    diff = A ^ B
    print(f'page {n}: orig ink {A.sum()}, gen ink {B.sum()}, xor {diff.sum()} ({100*diff.sum()/max(1,A.sum()):.1f}% of orig ink)')
    ov = np.full(A.shape + (3,), 255, np.uint8)
    ov[A & B] = (0, 0, 0)
    ov[A & ~B] = (255, 0, 0)   # only in original: red
    ov[~A & B] = (0, 120, 255) # only in generated: blue
    Image.fromarray(ov).save(f'{w}/diff-{n}.png')
