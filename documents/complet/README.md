# Documents complets (PDF par année)

Déposez ici, sous ces noms exacts, les deux PDF que vous téléchargerez :

| Fichier | Contenu |
|---|---|
| `complet-3eme-si.pdf` | Tout le programme de la 3ème Sciences Informatique |
| `complet-4eme-si.pdf` | Tout le programme de la 4ème STI |

Dès qu'un PDF est présent, la carte correspondante de la page d'accueil
s'anime toute seule (plus de mention « À venir »).

## Facultatif : version HTML (lecture confortable sur mobile)

Depuis la racine du dépôt :

```bash
python3 tools/pdf2atelier.py documents/complet/complet-3eme-si.pdf "Programme complet — 3ème SI"
python3 tools/pdf2atelier.py documents/complet/complet-4eme-si.pdf "Programme complet — 4ème SI"
```

Cela crée `complet-3eme-si.pdf.html` (+ un dossier d'images à côté) ;
la carte de l'accueil bascule alors automatiquement sur la lecture en ligne.
Le PDF d'origine reste téléchargeable depuis la page.
