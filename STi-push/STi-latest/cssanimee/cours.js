/* ============================================================
   cours.js — le « lecteur » du cours
   ------------------------------------------------------------
   Fichier volontairement séparé : ni les balises ni les propriétés
   utilisées ici ne concernent l'annexe. index.html et style.css
   restent 100 % conformes (seuls <script src> et les attributs
   d'événements onclick / onkeydown de l'annexe HTML5 sont utilisés).
   ============================================================ */

var etape = 0;
var temps = 0;
var auto = false;
var minuteur = null;
var zone = null;
var sens = 1;
var animation = null;
var enPause = false;
var theme = 'sombre';
var format = 'bureau';
var LARGEUR_MOBILE = 780;

/* ---------- définition des temps de chaque étape ---------- */
var COURS = [
  { id: 'bgimage', titre: 'background-image', temps: [
    { nh: 3, nc: 1, hh: [], hc: [] },
    { nh: 3, nc: 5, hh: [], hc: [3] }
  ] },
  { id: 'repeat', titre: 'background-repeat', temps: [
    { nh: 1, nc: 3, hh: [], hc: [] },
    { nh: 4, nc: 6, hh: [1, 2, 3], hc: [3, 4, 5] }
  ] },
  { id: 'size', titre: 'background-size', temps: [
    { nh: 1, nc: 4, hh: [], hc: [] },
    { nh: 3, nc: 7, hh: [1, 2], hc: [4, 5, 6] },
    { nh: 3, nc: 8, hh: [], hc: [7] }
  ] },
  { id: 'clip', titre: 'background-clip', temps: [
    { nh: 1, nc: 5, hh: [], hc: [] },
    { nh: 2, nc: 7, hh: [1], hc: [5, 6] },
    { nh: 3, nc: 8, hh: [2], hc: [7] },
    { nh: 3, nc: 9, hh: [], hc: [8] }
  ] },
  { id: 'raccourci', titre: 'Le raccourci background', temps: [
    { nh: 1, nc: 7, hh: [], hc: [1, 2, 3, 4, 5] },
    { nh: 1, nc: 12, hh: [], hc: [8, 9, 10] },
    { nh: 1, nc: 12, hh: [], hc: [7] }
  ] },
  { id: 'liens', titre: 'Les 4 états d un lien', temps: [
    { nh: 1, nc: 1, hh: [0], hc: [0] },
    { nh: 4, nc: 5, hh: [1, 2, 3], hc: [1, 2, 3] },
    { nh: 4, nc: 5, hh: [], hc: [4] }
  ] },
  { id: 'boxshadow', titre: 'box-shadow', temps: [
    { nh: 1, nc: 3, hh: [], hc: [1] },
    { nh: 1, nc: 7, hh: [], hc: [5] },
    { nh: 1, nc: 12, hh: [], hc: [9, 10] }
  ] },
  { id: 'textshadow', titre: 'text-shadow', temps: [
    { nh: 1, nc: 3, hh: [], hc: [1] },
    { nh: 1, nc: 8, hh: [], hc: [5, 6] }
  ] },
  { id: 'bordure', titre: 'border & border-radius', temps: [
    { nh: 1, nc: 3, hh: [], hc: [1] },
    { nh: 1, nc: 6, hh: [], hc: [4] },
    { nh: 1, nc: 9, hh: [], hc: [7] }
  ] },
  { id: 'tableau', titre: 'table-layout & border-collapse', temps: [
    { nh: 3, nc: 3, hh: [], hc: [0, 1, 2] },
    { nh: 6, nc: 4, hh: [3, 4, 5], hc: [3] },
    { nh: 6, nc: 5, hh: [], hc: [4] }
  ] },
  { id: 'liste', titre: 'list-style', temps: [
    { nh: 5, nc: 1, hh: [], hc: [0] },
    { nh: 5, nc: 6, hh: [], hc: [2, 3, 4, 5] },
    { nh: 5, nc: 9, hh: [], hc: [7, 8] }
  ] },
  { id: 'recap', titre: 'Récapitulatif et quiz', temps: [
    { nh: 1, nc: 5, hh: [], hc: [] },
    { nh: 1, nc: 5, hh: [], hc: [] }
  ] }
];

/* ---------- déplacement ---------- */
function aller(n) {
  etape = n;
  temps = 0;
  afficher();
  arreterAuto();
}

function allerTemps(n) {
  temps = n;
  afficher();
  arreterAuto();
}

function suivant() {
  var t = COURS[etape].temps.length;
  if (temps < t - 1) { temps = temps + 1; }
  else if (etape < COURS.length - 1) { etape = etape + 1; temps = 0; }
  else { arreterAuto(); return false; }
  afficher();
  return true;
}

function precedent() {
  if (temps > 0) { temps = temps - 1; }
  else if (etape > 0) { etape = etape - 1; temps = COURS[etape].temps.length - 1; }
  else { return false; }
  afficher();
  return true;
}

function rejouer() {
  temps = 0;
  afficher();
}

function clavier(e) {
  if (e.key === 'ArrowRight') { suivant(); arreterAuto(); }
  else if (e.key === 'ArrowLeft') { precedent(); arreterAuto(); }
  else if (e.key === ' ') { lectureAuto(); }
  else if (e.key === 'Home') { aller(0); }
  else if (e.key === 'End') { aller(COURS.length - 1); }
}

/* ---------- affichage ---------- */
function afficher() {
  var i, j, t, total, fait, pastilles;

  t = COURS[etape].temps[temps];

  /* une seule scène et une seule paire de fichiers visibles */
  for (i = 0; i < COURS.length; i++) {
    document.getElementById('scene-' + i).hidden = (i !== etape);
    document.getElementById('code-html-' + i).hidden = (i !== etape);
    document.getElementById('code-css-' + i).hidden = (i !== etape);
  }

  /* une seule note visible */
  for (j = 0; j < COURS[etape].temps.length; j++) {
    document.getElementById('note-' + etape + '-' + j).hidden = (j !== temps);
  }

  habiller();

  /* le code : lignes écrites et lignes mises en évidence */
  ecrireCode('code-html-' + etape, t.nh, t.hh);
  ecrireCode('code-css-' + etape, t.nc, t.hc);

  /* pastilles + compteur + jauge */
  pastilles = '';
  for (j = 0; j < COURS[etape].temps.length; j++) {
    pastilles = pastilles + '<input type="button" class="point ' +
      (j === temps ? 'actif' : (j < temps ? 'fait' : '')) +
      ' ' + theme + ' ' + format +
      '" value="" onclick="allerTemps(' + j + ')" />';
  }
  document.getElementById('pastilles').innerHTML = pastilles;

  for (i = 0; i < COURS.length; i++) {
    document.getElementById('chip-' + i).className =
      'chip' + (i === etape ? ' actif' : '') + ' ' + theme + ' ' + format;
  }

  document.getElementById('compteur').innerHTML =
    'étape ' + (etape + 1) + '/' + COURS.length +
    ' · temps ' + (temps + 1) + '/' + COURS[etape].temps.length;

  total = 0; fait = 0;
  for (i = 0; i < COURS.length; i++) {
    total = total + COURS[i].temps.length;
    if (i < etape) { fait = fait + COURS[i].temps.length; }
  }
  fait = fait + temps + 1;
  document.getElementById('jauge').style.width = Math.round(fait / total * 100) + '%';
}

function ecrireCode(idTable, nombre, actifs) {
  var lignes = document.getElementById(idTable).getElementsByTagName('tr');
  var i, j, actif, cls, cellule;
  for (i = 0; i < lignes.length; i++) {
    actif = false;
    for (j = 0; j < actifs.length; j++) { if (actifs[j] === i) { actif = true; } }
    if (i >= nombre) { cls = 'ln'; }
    else if (actif) { cls = 'ln ecrit actif'; }
    else { cls = 'ln ecrit'; }
    lignes[i].className = cls + ' ' + theme + ' ' + format;
    cellule = lignes[i].getElementsByTagName('td')[0];
    cellule.className = 'numero' + (actif ? ' numero-actif' : '') + ' ' + theme + ' ' + format;
  }
}

/* ---------- habillage : thème (sombre / clair) + format (bureau / mobile)
   L'annexe CSS3 ne contient ni @media ni variables : on pose donc une
   classe sur chaque élément, comme pour les temps de l'étape.        ------ */
function baseDe(el) {
  if (el._base === undefined) {
    el._base = el.className
      .replace(/\sb\d+/g, '')
      .replace(/\b(sombre|clair|bureau|mobile|actif|ecrit|numero-actif|fait)\b/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }
  return el._base;
}

function habiller() {
  var tous = document.body.getElementsByTagName('*');
  var demo = document.getElementById('demo-' + etape);
  var i, el, cls;
  document.body.className = theme + ' ' + format;
  for (i = 0; i < tous.length; i++) {
    el = tous[i];
    cls = baseDe(el);
    if (demo && (el === demo || demo.contains(el))) { cls = cls + ' b' + temps; }
    el.className = cls + ' ' + theme + ' ' + format;
  }
  /* boutons de thème : celui qui est actif garde la couleur */
  document.getElementById('bouton-sombre').className =
    'btn ' + (theme === 'sombre' ? 'btn-violet ' : '') + theme + ' ' + format;
  document.getElementById('bouton-clair').className =
    'btn ' + (theme === 'clair' ? 'btn-violet ' : '') + theme + ' ' + format;
}

function choisirTheme(nom) {
  theme = nom;
  try { window.localStorage.setItem('fond-du-cours-deco', theme); } catch (e) { }
  habiller();
  /* le code doit être réécrit : ses lignes portent aussi le thème */
  ecrireCode('code-html-' + etape, COURS[etape].temps[temps].nh, COURS[etape].temps[temps].hh);
  ecrireCode('code-css-' + etape, COURS[etape].temps[temps].nc, COURS[etape].temps[temps].hc);
}

function calculerFormat() {
  var large = window.innerWidth || document.documentElement.clientWidth;
  return large < LARGEUR_MOBILE ? 'mobile' : 'bureau';
}

function appliquerFormat() {
  /* sur mobile la liste des étapes est repliée pour libérer de la hauteur */
  var liste = document.getElementById('liste-etapes');
  if (liste) { liste.open = (format === 'bureau'); }
}

window.addEventListener('resize', function () {
  var f = calculerFormat();
  if (f !== format) { format = f; appliquerFormat(); habiller(); }
});

/* ---------- lecture automatique ---------- */
function duree() {
  return 4200;
}

function programmer() {
  minuteur = setTimeout(function () {
    if (!auto) { return; }
    if (suivant()) { programmer(); }
    else { arreterAuto(); }
  }, duree());
}

function lectureAuto() {
  if (auto) { arreterAuto(); return; }
  auto = true;
  document.getElementById('bouton-auto').value = '❚❚ Pause';
  programmer();
}

function arreterAuto() {
  auto = false;
  clearTimeout(minuteur);
  document.getElementById('bouton-auto').value = '▶ Lecture auto';
}

/* ---------- quiz ---------- */
function repondre(idQuestion, bonne, bouton) {
  var q = document.getElementById(idQuestion);
  var boutons = q.getElementsByTagName('input');
  var i, fb, texte;
  for (i = 0; i < boutons.length; i++) { boutons[i].className = 'proposition'; }
  bouton.className = 'proposition ' + (bonne ? 'bon' : 'mauvais');
  fb = document.getElementById(idQuestion + '-fb');
  texte = document.getElementById(idQuestion + (bonne ? '-ok' : '-ko')).innerHTML;
  fb.className = 'feedback ' + (bonne ? 'bon' : 'mauvais');
  fb.innerHTML = (bonne ? '✔ ' : '✖ ') + texte;
}

/* ---------- démarrage ---------- */
try {
  if (window.localStorage.getItem('fond-du-cours-deco') === 'clair') { theme = 'clair'; }
} catch (e) { }
format = calculerFormat();
appliquerFormat();
afficher();
