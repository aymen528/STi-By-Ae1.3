#!/usr/bin/env python3
"""Réorganisation du dépôt STI-By-A.Essouyah : déplacements + correction des liens."""
import os, re, shutil, hashlib, urllib.parse, posixpath

ROOT = "/home/user/STI-project"
os.chdir(ROOT)

# ---------------------------------------------------------------- moves
file_moves = {
    # --- assets globaux ---
    "medias/STI_by_AE.ico": "assets/icons/STI_by_AE.ico",
    "lycee_logo.png": "assets/images/lycee_logo.png",
    "medias/lycee_logo.png": "assets/images/lycee_logo.png",   # doublon
    "medias/JavaScript_logo.svg": "assets/images/JavaScript_logo.svg",
    "medias/foret.mp3": "assets/audio/foret.mp3",
    "medias/flower.webm": "assets/video/flower.webm",
    # --- cours ---
    "HTML5 By A.E.html": "cours/html5.html",
    "CSS3 By A.E.html": "cours/css3.html",
    "JS By A.E.html": "cours/javascript.html",
    "PHP By A.E.html": "cours/php.html",
    "PHP et MySQLi anime.html": "cours/php-mysqli.html",
    "SQL By A.E.html": "cours/sql.html",
    "Bases de données & SQL — LDD, LMD, LCD (2).html": "cours/sql-bases-ldd-lmd-lcd.html",
    "datalist.html": "cours/datalist.html",
    "medias/fiche_de_cours_html5.html": "cours/fiche-revision-html5.html",
    "medias/le_fleuriste_du_raf_ha.html": "cours/annexe-fleuriste-html5.html",
    # --- quiz ---
    "quiz-html-css.html": "quiz/html-css.html",
    "quiz-javascript.html": "quiz/javascript.html",
    "quiz-php.html": "quiz/php.html",
    "quiz-sql.html": "quiz/sql.html",
    "correction.html": "quiz/sql-correction.html",
    "controle.js": "quiz/sql-controle.js",
    # --- exercices ---
    "series-exercices.html": "exercices/series-exercices.html",
    "pdf/resume.html": "exercices/resume-fonctions-standards.html",
    # --- annexes PDF ---
    "pdf/Annexe CSS3 By A.E.pdf": "documents/annexes/annexe-css3.pdf",
    "pdf/Annexe HTML5 By A.E.pdf": "documents/annexes/annexe-html5.pdf",
    "pdf/Annexe JavaScript By A.E.pdf": "documents/annexes/annexe-javascript.pdf",
    "pdf/Annexe PHP By A.E.pdf": "documents/annexes/annexe-php.pdf",
    "pdf/Annexe SQL By A.E.pdf": "documents/annexes/annexe-sql.pdf",
    # --- app mobile & archive ---
    "STI-By-AE-apk/app-debug.apk": "app-mobile/STI-By-AE.apk",
    "projetHTML_CSS_Js_Fleurs.zip": "projets/fleurs.zip",
}

dir_moves = {
    "pdf/html+css": "exercices/html-css",
    "pdf/js": "exercices/javascript",
    "pdf/php": "exercices/php",
    "pdf/sql": "exercices/sql",
    "Carte bancaire": "projets/carte-bancaire",
    "formulaire_d_inscription_TT_avance_transformations_photo": "projets/formulaire-inscription",
    "projetHTML_CSS_Js_Fleurs": "projets/fleurs",
    "site-tunisie": "projets/site-tunisie",
}

# ---------------------------------------------------------------- mapping complet
mapping = dict(file_moves)

def all_files(base="."):
    for dirpath, dirnames, filenames in os.walk(base):
        if ".git" in dirpath.split(os.sep):
            continue
        for fn in filenames:
            yield os.path.relpath(os.path.join(dirpath, fn), ".")

for old_dir, new_dir in dir_moves.items():
    for p in list(all_files(old_dir)):
        rel = os.path.relpath(p, old_dir)
        mapping[p] = posixpath.join(new_dir, *rel.split(os.sep))

# fichiers inchangés (référencés par eux-mêmes)
for p in all_files():
    mapping.setdefault(p, p)

# ---------------------------------------------------------------- réécriture des liens
ATTR_RE = re.compile(r'((?:href|src|poster|data-src|action)\s*=\s*)(["\'])([^"\']*)\2', re.I)
URL_RE = re.compile(r'(url\(\s*["\']?)([^"\')]+)(["\']?\s*\))', re.I)
SKIP = ("http://", "https://", "//", "data:", "mailto:", "tel:", "javascript:", "#", "/")
TEXT_EXT = {".html", ".htm", ".css", ".js", ".php", ".txt"}

stats = {"files": 0, "links_fixed": 0}

def fix_value(value, old_dir, new_dir):
    frag = ""
    v = value
    if "#" in v:
        v, frag = v.split("#", 1)
        frag = "#" + frag
    v = v.strip()
    if not v or v.startswith(SKIP):
        return None
    decoded = urllib.parse.unquote(v)
    target = posixpath.normpath(posixpath.join(*old_dir.split(os.sep), *decoded.split("/"))
                                if old_dir != "." else posixpath.normpath(decoded))
    if target not in mapping:
        return None
    new_target = mapping[target]
    rel = os.path.relpath(new_target, new_dir if new_dir != "." else ".")
    stats["links_fixed"] += 1
    return rel.replace(os.sep, "/") + frag

rewrites = {}  # old_path -> new_content
for p in sorted(all_files()):
    ext = os.path.splitext(p)[1].lower()
    if ext not in TEXT_EXT or os.path.getsize(p) > 3_000_000:
        continue
    try:
        content = open(p, encoding="utf-8").read()
    except UnicodeDecodeError:
        try:
            content = open(p, encoding="latin-1").read()
        except Exception:
            continue
    old_dir = os.path.dirname(p) or "."
    new_dir = os.path.dirname(mapping[p]) or "."

    def repl(m, old_dir=old_dir, new_dir=new_dir):
        if len(m.groups()) == 3:  # ATTR_RE : (préfixe, quote, valeur)
            fixed = fix_value(m.group(3), old_dir, new_dir)
            return m.group(1) + m.group(2) + fixed + m.group(2) if fixed else m.group(0)
        fixed = fix_value(m.group(2), old_dir, new_dir)
        return m.group(1) + fixed + m.group(3) if fixed else m.group(0)

    new_content = ATTR_RE.sub(repl, content)
    if ext in (".css", ".html"):
        new_content = URL_RE.sub(repl, new_content)
    if new_content != content:
        rewrites[p] = new_content

# corrections manuelles ciblées (liens déjà cassés avant la réorg)
for p in list(rewrites):
    c = rewrites[p]
    if mapping[p] in ("projets/site-tunisie/index.html", "projets/site-tunisie/enonce.html"):
        c = c.replace('href="medias/STI_by_AE.ico"', 'href="../../assets/icons/STI_by_AE.ico"')
    rewrites[p] = c

# ---------------------------------------------------------------- déplacements physiques
def h(path):
    return hashlib.md5(open(path, "rb").read()).hexdigest()

# 1) écrire les contenus modifiés AVANT de déplacer
for p, c in rewrites.items():
    open(p, "w", encoding="utf-8").write(c)
stats["files"] = len(rewrites)

# 2) déplacer les fichiers
for old, new in sorted(file_moves.items()):
    if not os.path.exists(old):
        print(f"⚠️  introuvable : {old}")
        continue
    os.makedirs(os.path.dirname(new), exist_ok=True)
    if os.path.exists(new):
        if h(old) == h(new):
            os.remove(old)          # doublon identique
        else:
            print(f"⚠️  conflit gardé : {old}")
    else:
        shutil.move(old, new)

# 3) déplacer les dossiers
for old, new in dir_moves.items():
    os.makedirs(os.path.dirname(new), exist_ok=True)
    shutil.move(old, new)

# 4) nettoyer les dossiers vides
for d in ["medias", "pdf", "STI-By-AE-apk"]:
    if os.path.isdir(d) and not os.listdir(d):
        os.rmdir(d)
        print(f"🗑️  dossier vide supprimé : {d}/")

print(f"\n✅ {stats['links_fixed']} liens corrigés dans {stats['files']} fichiers")
