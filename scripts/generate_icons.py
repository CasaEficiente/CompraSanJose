# -*- coding: utf-8 -*-
"""Genera los iconos PWA (carrito sobre fondo olivo) en docs/icons/."""
import os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "docs", "icons")
os.makedirs(OUT, exist_ok=True)

OLIVE = (62, 107, 69)
OLIVE_D = (43, 78, 51)
SAFFRON = (224, 161, 38)
WHITE = (255, 255, 255)


def rounded(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)


def make(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # fondo
    pad = 0 if maskable else int(size * 0.04)
    rounded(d, [pad, pad, size - pad, size - pad], int(size * 0.22), OLIVE)
    # disco azafran detras del carrito
    cx, cy = size * 0.5, size * 0.47
    rr = size * 0.30
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=OLIVE_D)
    # carrito (lineas blancas)
    s = size
    lw = max(3, int(s * 0.035))
    # cesta (trapecio)
    x0, y0 = s * 0.34, s * 0.36
    x1, y1 = s * 0.66, s * 0.36
    x2, y2 = s * 0.61, s * 0.55
    x3, y3 = s * 0.39, s * 0.55
    d.line([(x0, y0), (x1, y1), (x2, y2), (x3, y3), (x0, y0)], fill=WHITE, width=lw, joint="curve")
    # mango
    d.line([(x0, y0), (s * 0.28, y0), (s * 0.24, s * 0.30)], fill=WHITE, width=lw, joint="curve")
    # ruedas
    wr = s * 0.035
    for wx in (s * 0.44, s * 0.57):
        d.ellipse([wx - wr, s * 0.60 - wr, wx + wr, s * 0.60 + wr], fill=WHITE)
    img.save(os.path.join(OUT, "icon-%d.png" % size))
    print("icon-%d.png" % size)


make(192)
make(512)
# maskable dedicado (sin margen, carrito centrado con zona segura)
img = Image.new("RGBA", (512, 512), OLIVE)
img.save(os.path.join(OUT, "maskable-512.png"))
print("maskable-512.png (base)")
# redibujar maskable con carrito centrado y margen seguro
d = ImageDraw.Draw(img)
cx, cy, rr = 256, 240, 150
d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=OLIVE_D)
lw = 18
d.line([(174, 184), (338, 184), (312, 282), (200, 282), (174, 184)], fill=WHITE, width=lw, joint="curve")
d.line([(174, 184), (143, 184), (123, 153)], fill=WHITE, width=lw, joint="curve")
for wx in (225, 292):
    d.ellipse([wx - 18, 307 - 18, wx + 18, 307 + 18], fill=WHITE)
img.save(os.path.join(OUT, "maskable-512.png"))
print("maskable-512.png")
print("OK iconos en docs/icons/")
