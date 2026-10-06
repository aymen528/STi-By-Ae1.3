# 📚 STI By A. Essouyah — Plateforme éducative

Site éducatif dédié aux **Sciences et Technologies de l'Informatique (STI)** :
cours, annexes, exercices, TP, quiz et projets en **HTML5, CSS3, JavaScript, SQL et PHP**,
avec des exemples, des animations et du code en temps réel.

> Auteur : **Aymen Essouyah** — Version 2.0

---

## 🗂️ Structure du projet

```
STI-By-A.Essouyah/
│
├── index.html                  # 🏠 Accueil — plateforme de quiz & navigation
├── README.md
│
├── assets/                     # Ressources globales du site
│   ├── audio/                  #   fichiers audio (foret.mp3…)
│   ├── icons/                  #   favicon STI_by_AE.ico
│   ├── images/                 #   logos (lycee_logo.png…)
│   └── video/                  #   vidéos (flower.webm…)
│
├── cours/                      # 📖 Leçons par langage
│   ├── html5.html              #   cours HTML5
│   ├── css3.html               #   cours CSS3
│   ├── javascript.html         #   cours JavaScript
│   ├── php.html                #   cours PHP
│   ├── php-mysqli.html         #   PHP & MySQLi (animations)
│   ├── sql.html                #   cours SQL
│   ├── sql-bases-ldd-lmd-lcd.html  # Bases de données : LDD, LMD, LCD
│   ├── datalist.html           #   focus sur <datalist>
│   ├── fiche-revision-html5.html   # guide & fiche de révision
│   └── annexe-fleuriste-html5.html # exemple « Le Fleuriste du Rafèha »
│
├── quiz/                       # 🎯 Quiz interactifs
│   ├── html-css.html
│   ├── javascript.html
│   ├── php.html
│   ├── sql.html
│   ├── sql-correction.html     #   correction du quiz SQL
│   └── sql-controle.js         #   logique du quiz SQL
│
├── exercices/                  # ✏️ TP & séries d'exercices
│   ├── series-exercices.html   #   page des séries d'exercices
│   ├── resume-fonctions-standards.html
│   ├── html-css/               #   TP HTML/CSS (Act1-2, TP1-3, ombres…)
│   ├── javascript/             #   TP JS 1→5 + corrections
│   ├── php/                    #   TP PHP 1→4 + corrections
│   └── sql/                    #   TP bases de données (jointures, GroupBy…)
│
├── projets/                    # 🛠️ Projets pédagogiques complets
│   ├── carte-bancaire/         #   TP Carte bancaire (énoncé + correction)
│   ├── formulaire-inscription/ #   formulaire d'inscription avancé
│   ├── fleurs/                 #   projet « Fleuriste » (HTML/CSS/JS + PHP)
│   └── site-tunisie/           #   site vitrine Tunisie (nord/centre/sud)
│
├── documents/                  # 📄 Documents téléchargeables
│   └── annexes/                #   annexes PDF des 5 cours
│       ├── annexe-html5.pdf
│       ├── annexe-css3.pdf
│       ├── annexe-javascript.pdf
│       ├── annexe-php.pdf
│       └── annexe-sql.pdf
│
└── app-mobile/                 # 📱 Application mobile Android
    └── STI-By-AE.apk
```

---

## 🧭 Conventions

- **Un dossier par type de contenu** : cours / quiz / exercices / projets / documents.
- **Noms de fichiers en minuscules**, mots séparés par des tirets (`sql-bases-ldd-lmd-lcd.html`),
  sans espaces ni caractères spéciaux → compatible avec tous les hébergements et le SEO.
- **Chaque projet est autonome** : ses pages, styles, scripts et médias sont dans son propre dossier.
- **Ressources partagées** dans `assets/` (logo, favicon, médias globaux).

## 🚀 Utilisation

Site statique : ouvrir `index.html` dans un navigateur, ou servir le dossier avec
n'importe quel serveur web (GitHub Pages, Netlify, Apache, Nginx…).
Les fichiers `.php` du projet `fleurs` nécessitent un serveur PHP + MySQL.
