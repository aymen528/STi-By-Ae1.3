#!/usr/bin/env python3
"""Passe 2 : normalisation des noms de fichiers (espaces, accents, &)."""
import os, re, shutil, glob, urllib.parse, posixpath

ROOT = "/home/user/STI-project"
os.chdir(ROOT)

renames = {
    "exercices/html-css/Activité HTML CSS3": "exercices/html-css/activite-html-css",
    "exercices/html-css/Activité1-2 posi-Anima-CSS3.pdf": "exercices/html-css/activite1-2-position-animation-css3.pdf",
    "exercices/html-css/box-shadow&text-shadowCSS3.html": "exercices/html-css/box-shadow-text-shadow-css3.html",
    "exercices/html-css/formulaire inscription.pdf": "exercices/html-css/formulaire-inscription.pdf",
    "projets/carte-bancaire/Enonce Tp Carte Bancaire.html": "projets/carte-bancaire/enonce-tp-carte-bancaire.html",
    "projets/fleurs/affichage condidat.php": "projets/fleurs/affichage-condidat.php",
    "projets/fleurs/mise a jour condidat.php": "projets/fleurs/mise-a-jour-condidat.php",
    "projets/fleurs/media/Projet Fleurs 3sti corrig": "projets/fleurs/media/projet-fleurs-3sti-corrige.docx",
    "projets/fleurs/media/Projet Fleurs 4sti Corrig": "projets/fleurs/media/projet-fleurs-4sti-corrige.docx",
    "projets/fleurs/media/Projet Fleurs 4sti eleve.docx": "projets/fleurs/media/projet-fleurs-4sti-eleve.docx",
    "projets/fleurs/media/Projet Fleurs 4sti eleve.pdf": "projets/fleurs/media/projet-fleurs-4sti-eleve.pdf",
    "projets/fleurs/media/Projet Fleurs.docx": "projets/fleurs/media/projet-fleurs.docx",
    "projets/formulaire-inscription/cvFleurs-énoncé": "projets/formulaire-inscription/enonce",
}
# docx au nom très long : recherché par glob
for p in glob.glob("projets/formulaire-inscription/cvFleurs-énoncé/*Niveau*.docx"):
    renames[p] = "projets/formulaire-inscription/enonce/lycee-rafha-niveau.docx"

# ---- mapping complet (identité pour tout le reste + fichiers sous les dossiers renommés)
mapping = dict(renames)
for old_dir in [o for o, n in renames.items() if os.path.isdir(o)]:
    for dp, dns, fns in os.walk(old_dir):
        for fn in fns:
            p = os.path.join(dp, fn).replace(os.sep, "/")
            if p in renames:
                continue
            rel = os.path.relpath(p, old_dir)
            mapping[p] = posixpath.join(renames[old_dir], *rel.split(os.sep))

for dp, dns, fns in os.walk("."):
    if ".git" in dp:
        continue
    for fn in fns:
        mapping.setdefault(os.path.join(dp, fn).replace(os.sep, "/"), os.path.join(dp, fn).replace(os.sep, "/"))

# ---- réécriture des liens (même mécanique que la passe 1)
ATTR_RE = re.compile(r'((?:href|src|poster|data-src|action)\s*=\s*)(["\'])([^"\']*)\2', re.I)
URL_RE = re.compile(r'(url\(\s*["\']?)([^"\')]+)(["\']?\s*\))', re.I)
SKIP = ("http://", "https://", "//", "data:", "mailto:", "tel:", "javascript:", "#", "/")
TEXT_EXT = {".html", ".htm", ".css", ".js", ".php", ".txt"}
n_links, n_files = 0, 0

def fix_value(value, old_dir, new_dir):
    global n_links
    frag = ""
    v = value
    if "#" in v:
        v, frag = v.split("#", 1); frag = "#" + frag
    v = v.strip()
    if not v or v.startswith(SKIP):
        return None
    target = posixpath.normpath(posixpath.join(old_dir, *urllib.parse.unquote(v).split("/"))) if old_dir != "." \
        else posixpath.normpath(urllib.parse.unquote(v))
    if target not in mapping:
        return None
    n_links += 1
    return os.path.relpath(mapping[target], new_dir if new_dir != "." else ".").replace(os.sep, "/") + frag

for p in sorted(mapping):
    ext = os.path.splitext(p)[1].lower()
    if ext not in TEXT_EXT or not os.path.isfile(p) or os.path.getsize(p) > 3_000_000:
        continue
    try:
        content = open(p, encoding="utf-8").read()
    except UnicodeDecodeError:
        continue
    old_dir = posixpath.dirname(p) or "."
    new_dir = posixpath.dirname(mapping[p]) or "."

    def repl(m, od=old_dir, nd=new_dir):
        if len(m.groups()) == 3:
            fixed = fix_value(m.group(3), od, nd)
            return m.group(1) + m.group(2) + fixed + m.group(2) if fixed else m.group(0)
        fixed = fix_value(m.group(2), od, nd)
        return m.group(1) + fixed + m.group(3) if fixed else m.group(0)

    new_content = ATTR_RE.sub(repl, content)
    if ext in (".css", ".html"):
        new_content = URL_RE.sub(repl, new_content)
    if new_content != content:
        open(p, "w", encoding="utf-8").write(new_content)
        n_files += 1

# ---- renommages physiques, chemins les plus profonds d'abord
for old in sorted(renames, key=lambda x: x.count("/"), reverse=True):
    new = renames[old]
    if not os.path.exists(old):
        print(f"⚠️  introuvable : {old}")
        continue
    os.makedirs(posixpath.dirname(new), exist_ok=True)
    shutil.move(old, new)
    print(f"✏️  {old}  →  {new}")

print(f"\n✅ {n_links} liens corrigés dans {n_files} fichiers")
