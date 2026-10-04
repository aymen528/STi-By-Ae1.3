# Documents complets (PDF par année)

| Fichier | Année | Contenu | Version HTML |
|---|---|---|---|
| `complet-3eme-si.pdf` | 3ème SI | Cours HTML5 + CSS3 + JavaScript (45 p.) | ✅ `complet-3eme-si.pdf.html` |
| `complet-4eme-si-cours.pdf` | 4ème SI | Cours HTML5 + JS + PHP + BD (65 p.) | ✅ `complet-4eme-si-cours.pdf.html` |
| `complet-4eme-si-resume.pdf` | 4ème SI | Résumé fonctions standards JS/PHP/SQL (14 p., paysage) | ✅ `complet-4eme-si-resume.pdf.html` |

Chaque document existe en **deux formats** :
- le PDF d'origine (téléchargeable / imprimable),
- la page `.pdf.html` générée (rendu page à page, marche partout y compris
  sur mobile) — c'est elle que la carte de l'accueil propose en priorité
  (« 📖 Lire en ligne »).

## Ajouter un nouveau document complet

1. Déposer le PDF ici, avec un nom sans espaces ni accents
   (ex. `complet-bac-si.pdf`).
2. Convertir depuis la racine du dépôt :

```bash
pip install pypdfium2   # une seule fois
python3 tools/pdf2atelier.py documents/complet/complet-bac-si.pdf "Titre affiché"
```

3. Copier une carte dans `index.html` (section `#complet`) en pointant le
   `href` vers le `.pdf` — le script de la page basculera tout seul vers la
   version `.pdf.html`.
