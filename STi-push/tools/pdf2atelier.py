#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pdf2atelier.py — convertit un PDF en page HTML fidèle, style « L'Atelier ».

Usage (depuis la racine du dépôt) :
    python3 tools/pdf2atelier.py chemin/vers/document.pdf "Titre de la page"

Crée à côté du PDF :
    document.pdf.html          la page HTML (chrome L'Atelier, boutons
                               « PDF d'origine », « Imprimer », retour)
    document.pdf.assets/       une image JPEG par page (page-01.jpg …)

Dépendance : pip install pypdfium2
"""
import os
import re
import sys

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    pdf = sys.argv[1]
    titre = sys.argv[2]
    scale, q = 2.2, 82
    if not os.path.exists(pdf):
        sys.exit(f"PDF introuvable : {pdf}")

    import pypdfium2 as pdfium
    doc = pdfium.PdfDocument(pdf)
    n = len(doc)
    base = os.path.splitext(pdf)[0]            # …/document
    assets = os.path.basename(base) + ".pdf.assets"
    adir = os.path.join(os.path.dirname(pdf), assets)
    os.makedirs(adir, exist_ok=True)

    paysage = 0
    for i in range(n):
        page = doc[i]
        bitmap = page.render(scale=scale)
        img = bitmap.to_pil()
        if img.width > img.height:
            paysage += 1
        img.save(os.path.join(adir, f"page-{i+1:02d}.jpg"), "JPEG", quality=q, optimize=True)

    # Favicons et liens : profondeur relative vis-à-vis de la racine du dépôt
    depth = pdf.count("/")
    up = "../" * depth
    ico = f'{up}assets/icons/STI_by_AE.ico' if depth else "assets/icons/STI_by_AE.ico"
    accueil = f"{up}index.html" if depth else "index.html"
    nom = os.path.basename(pdf)
    maxw = "1100px" if paysage > n / 2 else "900px"

    imgs = "\n    ".join(
        f'<img src="{assets}/page-{i+1:02d}.jpg" alt="Page {i+1} — {titre}" loading="{"eager" if i == 0 else "lazy"}">'
        for i in range(n)
    )
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" href="{ico}">
<title>{titre} — STI by AE</title>
<link rel="stylesheet" href="{up}assets/fonts/fonts.css">
<style>
  :root {{ --ink:#101728; --paper:#f6eedc; --surface:#fffdf5; --edge:#101728;
          --accent:#f4511e; --muted:#6b6250 }}
  * {{ box-sizing:border-box }}
  body {{ margin:0; color:var(--ink); background:var(--paper);
    background-image:radial-gradient(circle, rgba(16,23,40,.09) 1.1px, transparent 1.15px);
    background-size:22px 22px; font-family:"Manrope","Inter",system-ui,Arial,sans-serif }}
  .barre {{ position:sticky; top:0; z-index:5; display:flex; align-items:center;
    justify-content:space-between; gap:14px; padding:12px 18px; background:var(--surface);
    border-bottom:2.5px solid var(--edge) }}
  .barre h1 {{ font-family:"Space Grotesk","Inter",system-ui,sans-serif; font-size:clamp(13px,2.6vw,16px); font-weight:800; letter-spacing:-.01em; margin:0 }}
  .barre .nb {{ font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.08em }}
  .outils {{ display:flex; gap:8px; flex:none; flex-wrap:wrap }}
  .btn {{ display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px;
    border:2px solid var(--edge); font:800 12px/1 inherit; text-decoration:none; cursor:pointer;
    background:var(--surface); color:var(--ink); box-shadow:2.5px 2.5px 0 var(--edge) }}
  .btn:hover {{ transform:translate(-1px,-1px); box-shadow:3.5px 3.5px 0 var(--accent) }}
  .btn.plein {{ background:var(--accent); color:#fff; border-color:var(--edge) }}
  main {{ max-width:{maxw}; margin:0 auto; padding:26px 16px 40px; display:grid; gap:22px }}
  main img {{ width:100%; height:auto; display:block; background:#fff;
    border:2px solid var(--edge); border-radius:10px; box-shadow:6px 6px 0 rgba(16,23,40,.16) }}
  .pied {{ display:flex; justify-content:center; gap:10px; padding:4px 16px 54px }}
  @media (max-width:560px) {{ .barre {{ flex-wrap:wrap }} main {{ padding:14px 10px 30px }} }}
  @media print {{ .barre,.pied {{ display:none }} main {{ max-width:none }}
    img {{ box-shadow:none; border:none }} body {{ background:#fff }} }}
</style>
</head>
<body>
  <header class="barre">
    <div>
      <h1>📄 {titre}</h1>
      <span class="nb">{n} page{"s" if n > 1 else ""} · document de révision</span>
    </div>
    <div class="outils">
      <a class="btn plein" href="{accueil}">← Accueil</a>
      <a class="btn" href="{nom}" target="_blank" rel="noopener">⤓ PDF d'origine</a>
      <button class="btn" type="button" onclick="window.print()">🖨️ Imprimer</button>
    </div>
  </header>
  <main>
    {imgs}
  </main>
  <nav class="pied">
    <a class="btn plein" href="{accueil}">← Retour à l'accueil</a>
    <a class="btn" href="{nom}" target="_blank" rel="noopener">⤓ Télécharger le PDF</a>
  </nav>
<script>window.__APP_OK = true;</script>
</body>
</html>
"""
    sortie = base + ".pdf.html"
    open(sortie, "w", encoding="utf-8").write(html)
    print(f"✔ {sortie}  ({n} pages, format {'paysage' if paysage > n/2 else 'portrait'})")
    print(f"  images : {adir}/page-01.jpg … page-{n:02d}.jpg")

if __name__ == "__main__":
    main()
