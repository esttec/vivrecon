from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1920
F = '/usr/share/fonts/opentype/inter/'
def font(w, s): return ImageFont.truetype(F + f'Inter-{w}.otf', s)
BG, NAVY, WHITE, MUTED = (18, 20, 28), (124, 156, 255), (245, 246, 250), (160, 166, 185)
OUT = '/mnt/user-data/outputs/reel2/'
def center(d, y, text, f, fill):
    w = d.textlength(text, font=f); d.text(((W - w) / 2, y), text, font=f, fill=fill)
def logo(d, y=1700):
    f = font('ExtraBold', 64); a, b = 'viv', 'recon'
    w = d.textlength(a + b, font=f); x = (W - w) / 2
    d.text((x, y), a, font=f, fill=WHITE); d.text((x + d.textlength(a, font=f), y), b, font=f, fill=NAVY)

# 1. Hook
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
center(d, 720, 'Kas 865 €-ga', font('ExtraBold', 110), WHITE)
center(d, 860, 'saab säästa?', font('ExtraBold', 110), NAVY)
im.save(OUT + '1_hook.png')

# 2. The rule
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
center(d, 260, 'Reegel 50 / 30 / 20', font('ExtraBold', 84), WHITE)
center(d, 380, 'palk 865 € (miinimumpalk)', font('Medium', 52), MUTED)
blocks = [(50, 'Vajadused', 'üür + toit', '433 €', (124, 156, 255)),
          (30, 'Soovid', 'iseendale', '260 €', (255, 179, 102)),
          (20, 'Säästud', 'tulevikuks', '173 €', (110, 214, 150))]
x0, x1, top, unit = 90, W - 90, 520, 11.2   # block height = percent * unit
y = top
for pct, name, sub, amt, col in blocks:
    h = pct * unit
    d.rounded_rectangle((x0, y, x1, y + h - 16), 36, fill=col)
    cy = y + (h - 16) / 2
    d.text((x0 + 50, cy - 70), f'{pct}%', font=font('ExtraBold', 96), fill=BG)
    d.text((x0 + 290, cy - 58), name, font=font('Bold', 52), fill=BG)
    d.text((x0 + 290, cy + 4), sub, font=font('Medium', 38), fill=BG)
    aw = d.textlength(amt, font=font('ExtraBold', 64))
    d.text((x1 - 50 - aw, cy - 44), amt, font=font('ExtraBold', 64), fill=BG)
    y += h
logo(d)
im.save(OUT + '2_reegel.png')

# 3. End card
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
center(d, 640, '173 € kuus', font('ExtraBold', 120), (110, 214, 150))
center(d, 800, '6 kuuga üle 1000 €', font('Bold', 80), WHITE)
center(d, 1000, 'Plaan ühe vajutusega', font('Medium', 56), MUTED)
center(d, 1300, 'vivrecon.com', font('ExtraBold', 90), NAVY)
im.save(OUT + '3_lopp.png')
print('ok')
