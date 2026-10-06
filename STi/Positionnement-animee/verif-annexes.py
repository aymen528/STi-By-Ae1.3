# -*- coding: utf-8 -*-
"""Vérifie que index.html / style.css n'utilisent QUE le contenu des annexes."""
import re
from html.parser import HTMLParser

# --------------------------------------------------- listes tirées des annexes
CSS_OK = set("""
font font-family font-weight font-style font-size
text-align text-shadow text-transform color
list-style list-style-type list-style-position list-style-image
background background-color background-image background-repeat background-size
table-layout border-collapse
width height position float padding margin box-shadow display
top bottom left right overflow opacity
border border-color border-style border-width border-radius
transform filter
transition transition-delay transition-duration transition-property
animation animation-name animation-delay animation-duration
animation-iteration-count animation-direction
""".split())

def ok_selecteur(sel):
    """Un sélecteur de l'annexe : * | element | #id | .classe | element[attr]
       | element[attr=valeur] | element.class — jamais de combinateur."""
    if sel == '*':
        return True
    if re.search(r'[\s>+~]', sel) or '::' in sel:
        return False
    m = re.search(r':(link|visited|hover|active)$', sel)
    if m:
        sel = sel[:m.start()]
    if not sel:
        return False
    return re.match(r'^([a-zA-Z][\w-]*)?((?:\.[\w-]+)|(?:#[\w-]+)|(?:\[[\w-]+(?:=[^\]]+)?\]))*$', sel) is not None

HTML_OK = set("""
html head body link meta script style title header nav footer section article aside main
span div iframe ul ol li table thead tbody tfoot caption tr th td cite p source
h1 h2 h3 h4 h5 h6 hr img figure figcaption audio video a br address output mark
details summary form fieldset legend label input datalist option select textarea
""".split())

ATTR_OK = set("""
class hidden id lang style title
href rel type src charset http-equiv content name value
border for colspan rowspan size controls alt width height
onclick onkeydown onkeyup onblur onfocus oninput onload onchange
onmouseover onmouseout onplay onpause onsubmit
open reversed start placeholder min max readonly required disabled checked
""".split())

# ---------------------------------------------------------------- analyse CSS
css = open('style.css', encoding='utf-8').read()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)

problemes = []

# propriétés
props = set()
for bloc in re.findall(r'\{([^{}]*)\}', css):
    for decl in bloc.split(';'):
        if ':' in decl:
            props.add(decl.split(':')[0].strip().lower())
inconnues = sorted(p for p in props if p not in CSS_OK)
if inconnues:
    problemes.append('CSS — propriétés hors annexe : ' + ', '.join(inconnues))
else:
    print('CSS — propriétés : %d utilisées, toutes dans l’annexe' % len(props))

# sélecteurs
selecteurs = set()
for m in re.finditer(r'([^{}]+)\{', css):
    for s in m.group(1).split(','):
        s = s.strip()
        if s:
            selecteurs.add(s)
# on sépare les @keyframes (nom d'animation) des vrais sélecteurs
selecteurs = set(s for s in selecteurs
                 if not re.match(r'^\d+%$', s) and not re.match(r'^(from|to)$', s)
                 and not s.startswith('@'))   # @keyframes : règle @ de l'annexe, pas un sélecteur
mauvais = sorted(s for s in selecteurs if not ok_selecteur(s))
if mauvais:
    problemes.append('CSS — sélecteurs non conformes : ' + ', '.join(mauvais[:12]))
else:
    print('CSS — sélecteurs : %d, tous de type simple (classe, id, élément, attribut)' % len(selecteurs))

# unités
unites = {}
for m in re.finditer(r':\s*([-+0-9.]+)([a-z%]*)', css):
    u = m.group(2)
    if u and u not in ('s', 'ms', 'deg', 'px', '%'):
        unites.setdefault(u, []).append(m.group(0))
if unites:
    problemes.append('CSS — unités interdites : ' + str({k: v[:3] for k, v in unites.items()}))
else:
    print('CSS — unités : uniquement px, %, s et deg')

# ---------------------------------------------------------------- analyse HTML
class Verif(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = set()
        self.attrs = set()
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag)
        for a, v in attrs:
            self.attrs.add(a)

v = Verif()
v.feed(open('index.html', encoding='utf-8').read())

tags_inconnus = sorted(t for t in v.tags if t not in HTML_OK)
if tags_inconnus:
    problemes.append('HTML — balises hors annexe : ' + ', '.join(tags_inconnus))
else:
    print('HTML — balises : %d utilisées, toutes dans l’annexe' % len(v.tags))

attrs_inconnus = sorted(a for a in v.attrs if a not in ATTR_OK)
if attrs_inconnus:
    problemes.append('HTML — attributs hors annexe : ' + ', '.join(attrs_inconnus))
else:
    print('HTML — attributs : %d utilisés, tous dans l’annexe' % len(v.attrs))

# ---------------------------------------------------------------- bonus
bonus = open('bonus-flex.css', encoding='utf-8').read()
bonus_props = set()
for bloc in re.findall(r'\{([^{}]*)\}', re.sub(r'/\*.*?\*/', '', bonus, flags=re.S)):
    for decl in bloc.split(';'):
        if ':' in decl:
            bonus_props.add(decl.split(':')[0].strip())
hors = sorted(p for p in bonus_props if p not in CSS_OK)
print('\nBONUS (volontairement hors annexe) : ' + ', '.join(hors))

print('\n' + '=' * 70)
if problemes:
    print('PROBLÈMES :')
    for p in problemes:
        print('  ✖ ' + p)
else:
    print('CONFORME : index.html et style.css n’utilisent que les annexes.')
