from pathlib import Path
import math, wave, struct
from PIL import Image, ImageDraw, ImageFilter

BASE = Path('.')
assets = BASE / 'assets'
assets.mkdir(exist_ok=True)

# Trilha instrumental ORIGINAL, sintetizada com envoltória suave e sem ruído aleatório.
# Pico abaixo de 0.55 e final em fade para impedir estalos no loop.
rate = 24000
seconds = 18
notes = [(0, 6, 164.81), (3, 6, 146.83), (6, 6, 130.81), (9, 6, 146.83), (12, 6, 123.47), (15, 3, 164.81)]
with wave.open(str(assets / 'suspense.wav'), 'wb') as out:
    out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate)
    buf = bytearray()
    for n in range(rate * seconds):
        t = n / rate
        attack = min(1.0, t / 1.3)
        release = min(1.0, (seconds - t) / 1.5)
        envelope = max(0., attack * release)
        drone = math.sin(2 * math.pi * 82.41 * t) * .22
        drone += math.sin(2 * math.pi * 123.47 * t) * .14
        tone = 0.0
        for start, duration, f in notes:
            if start <= t < start + duration:
                x = (t - start) / duration
                bell = math.sin(math.pi * x) ** 2
                tone += bell * (.12 * math.sin(2 * math.pi * f * t) + .04 * math.sin(2 * math.pi * (f * 2.003) * t))
        pulse = (.72 + .28 * math.sin(2 * math.pi * .13 * t)) * drone
        sample = (pulse + tone) * envelope * .9
        value = max(-32767, min(32767, round(sample * 32767)))
        buf += struct.pack('<h', value)
    out.writeframes(buf)

# Ícone vetorial desenhado em raster: agente misterioso, chapéu, lupa e sinal de suspeita.
size = 1024
im = Image.new('RGB', (size, size), '#151522')
d = ImageDraw.Draw(im)
for y in range(size):
    k = y / (size - 1)
    d.line((0, y, size, y), fill=(int(22 + 13*k), int(20+4*k), int(35+16*k)))
# Halo suave sem flashes.
glow = Image.new('RGBA', (size, size), (0,0,0,0))
g = ImageDraw.Draw(glow)
g.ellipse((172, 136, 858, 856), fill=(170, 69, 112, 94))
glow = glow.filter(ImageFilter.GaussianBlur(100))
im = Image.alpha_composite(im.convert('RGBA'), glow)
d = ImageDraw.Draw(im)
d.rounded_rectangle((56, 56, 968, 968), radius=210, outline=(134, 92, 166, 125), width=8)
# Silhueta noir.
d.ellipse((330, 265, 704, 705), fill='#090B16')
d.polygon([(306,500),(733,500),(895,912),(130,912)],fill='#090B16')
d.polygon([(356,378),(423,206),(620,206),(684,378)],fill='#111222')
d.rounded_rectangle((225,364,800,419),radius=26,fill='#171222')
d.line((259,411,769,411),fill='#C85065',width=12)
d.arc((334,250,709,702),40,150,fill='#8E6AB7',width=12)
# Olhos discretos.
d.line((427,555,474,550), fill='#D6BACC', width=12)
d.line((564,550,611,555), fill='#D6BACC', width=12)
# Lupa e ponto de interesse.
d.ellipse((605,614,827,833),outline='#D05C72',width=26)
d.line((781,806,871,901),fill='#D05C72',width=34)
im = im.convert('RGB')
im.save(assets / 'icon.png', 'PNG')
sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi':144, 'xxxhdpi':192}
for dpi, px in sizes.items():
    p = BASE / 'android' / 'app' / 'src' / 'main' / 'res' / ('mipmap-' + dpi)
    p.mkdir(parents=True, exist_ok=True)
    im.resize((px,px), Image.Resampling.LANCZOS).save(p / 'ic_launcher.png')
print('Música e ícone V6 gerados com sucesso.')
