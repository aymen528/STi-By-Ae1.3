#!/usr/bin/env python3
"""Injecte la protection du contenu dans toutes les pages HTML du dépôt STi :
   1. meta CSP dans <head>
   2. protection.css + protection.js avant </body>
   Idempotent : les fichiers déjà équipés sont ignorés.
"""
import os
import re
import sys

ROOT = "/home/user/STi-latest"

CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com; "
    "img-src 'self' data: blob: https://images.unsplash.com; "
    "font-src 'self' data: https://fonts.gstatic.com; "
    "media-src 'self' blob: https://www.w3schools.com https://interactive-examples.mdn.mozilla.net; "
    "frame-src https://www.youtube.com https://example.com https://exemple.tn; "
    "connect-src https://fonts.gstatic.com; "
    "object-src 'none'; base-uri 'self'; form-action 'self'"
)
META_CSP = '<meta http-equiv="Content-Security-Policy" content="' + CSP + '" />\n'

MARK_CSP = 'http-equiv="Content-Security-Policy"'
MARK_ASSETS = "assets/css/protection.css"

stats = {"csp": 0, "assets": 0, "skip": 0, "no_body": 0}

html_files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d != ".git"]
    for f in filenames:
        if f.lower().endswith(".html"):
            html_files.append(os.path.join(dirpath, f))

for path in sorted(html_files):
    rel = os.path.relpath(path, ROOT)
    depth = 0 if os.path.dirname(rel) == "" else os.path.dirname(rel).count(os.sep) + 1
    prefix = "../" * depth

    with open(path, "r", encoding="utf-8") as fh:
        src = fh.read()
    orig = src

    # 1) CSP dans <head>
    if MARK_CSP not in src:
        m = re.search(r"<head[^>]*>", src, flags=re.IGNORECASE)
        if m:
            pos = m.end()
            src = src[:pos] + "\n    " + META_CSP.rstrip("\n") + src[pos:]
            stats["csp"] += 1
        else:
            print("  ⚠ pas de <head> : " + rel)

    # 2) CSS + JS protection avant </body>
    if MARK_ASSETS not in src:
        snippet = (
            "<!-- \U0001F512 Protection du contenu STI -->\n"
            '<link rel="stylesheet" href="' + prefix + 'assets/css/protection.css" />\n'
            '<script src="' + prefix + 'assets/js/protection.js" defer></script>\n'
            "<!-- /Protection -->\n"
        )
        m = None
        for m in re.finditer(r"</body\s*>", src, flags=re.IGNORECASE):
            pass
        if m:
            src = src[: m.start()] + snippet + src[m.start():]
        else:
            stats["no_body"] += 1
            m = None
            for m in re.finditer(r"</html\s*>", src, flags=re.IGNORECASE):
                pass
            if m:
                src = src[: m.start()] + snippet + src[m.start():]
            else:
                src = src + "\n" + snippet
        stats["assets"] += 1

    if src != orig:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(src)
    else:
        stats["skip"] += 1

print("Fichiers HTML :", len(html_files))
print("CSP ajoutées :", stats["csp"])
print("CSS/JS protection ajoutés :", stats["assets"])
print("Sans </body> (fallback </html>/EOF) :", stats["no_body"])
print("Déjà équipés (inchangés) :", stats["skip"])
