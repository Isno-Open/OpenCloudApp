# Rend les icones PNG de l'application installable (PWA) depuis leur SOURCE unique,
# web/static/pwa/icon.svg, avec Chromium (Playwright). A relancer si l'icone change.
#   python3 scripts/make-pwa-icons.py
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / "web" / "static" / "pwa"
SIZES = {"icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180}

svg = (ROOT / "icon.svg").read_text()
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, size in SIZES.items():
        pg = b.new_page(viewport={"width": size, "height": size})
        pg.set_content(f'<html><body style="margin:0">{svg.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ", 1)}</body></html>')
        pg.screenshot(path=str(ROOT / name), omit_background=True)
        pg.close()
    b.close()
print("icones :", ", ".join(SIZES))
