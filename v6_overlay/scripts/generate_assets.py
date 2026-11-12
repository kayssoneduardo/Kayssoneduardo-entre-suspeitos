from pathlib import Path
import math, wave, struct
from PIL import Image, ImageDraw, ImageFilter

BASE = Path('.')
assets = BASE / 'assets'
assets.mkdir(exist_ok=True)

# Trilha ambiente original: harmonia de suspense discreta, sem batidas nem ruídos.
# Melodia em camadas macias; entrada/saída gradual para evitar estalos no loop.
rate = 24000
seconds = 24
pitches = [130.81, 155.56, 196.00]  # C3-Eb3-G3: tríade menor estável
with wave.open(str(assets / 'suspense.wav'), 'wb') as out:
    out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate)
    buf = bytearray()
    for n in range(rate * seconds):
        t = n / rate
        # Fade de 2,5 s para transições silenciosas e loop sem clique.
        envelope = min(1.0, t / 2.5, (seconds - t) / 2.5)
        envelope = max(0.0, envelope)
        envelope = envelope * envelope * (3.0 - 2.0 * envelope)
        # Lento e regular, com poucas frequências e sem percussão.
        pad = 0.0
        for i, freq in enumerate(pitches):
            motion = 0.85 + 0.15 * math.sin(2 * math.pi * (0.028 + 0.006 * i) * t + i)
            fundamental = math.sin(2 * math.pi * freq * t + i * 0.7)
            harmonic = 0.12 * math.sin(2 * math.pi * (freq * 2) * t + i * 0.7)
            pad += (fundamental + harmonic) * motion * (0.12 if i == 0 else 0.09)
        # Um leve ar de atmosfera, sem pulsos ou efeitos fortes.
        shimmer = 0.025 * math.sin(2 * math.pi * 261.63 * t) * (0.5 + 0.5 * math.sin(2 * math.pi * 0.045 * t))
        sample = (pad + shimmer) * envelope
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
