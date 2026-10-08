# 📚 STI By A'e — Le Web de A à Z (Version 2.0)

Plateforme éducative interactive dédiée aux **Sciences et Technologies de l'Informatique (STI)** :
cours complets, leçons animées pas à pas, annexes, séries d'exercices, TP corrigés, quiz interactifs et projets en **HTML5, CSS3, JavaScript, SQL et PHP / MySQLi**.

> **Auteur** : **Aymen Essouyah** (`By A'e`)  
> **Version** : **2.0** (PWA installable, portail d'accès sécurisé & tableau de bord temps réel)  
> **Site en ligne (V2.0)** : [https://aymenessouyah.github.io/STiV2.0/](https://aymenessouyah.github.io/STiV2.0/)

---

## ✨ Nouveautés de la Version 2.0

### 🔐 Portail d'accès & Authentification (`portail.html`)
- **Double mode d'inscription et de connexion** :
  - **Par e-mail** (validation par l'administrateur).
  - **Par téléphone (`+216`)** avec saisie du **nom et prénom**, préfixe tunisien automatique `+216 ` et validation par **code WhatsApp à 6 chiffres** (6 cases OTP individuelles).
- **Sélection du lycée et de la classe** (`Lycée Farhat Hached Rades`, `3ème SI`, `4ème SI`, ou saisie libre).
- **Captcha visuel anti-robot** à la connexion et à l'inscription.
- **Connexion biométrique** (empreinte digitale / reconnaissance faciale WebAuthn) et **mode hors-ligne** (cache PWA 24 h pour les abonnés déjà validés).

### 📊 Tableau de bord Administrateur temps réel (`admin.html`)
- **Gestion en direct des abonnés** (l'administrateur n'est jamais listé parmi les abonnés) :
  - **✅ Activer**, **⏳ Mettre en attente**, **⛔ Exclure**, **🗑️ Supprimer définitivement** et **🔑 Réinitialiser le mot de passe** (via modales sécurisées).
  - **Éjection instantanée en direct** : toute exclusion (`⛔`), mise en attente (`⏳`) ou suppression (`🗑️`) coupe immédiatement la session active du candidat (< 1 s) et le renvoie vers le portail.
- **👑 Compte GOLD** :
  - Un bouton **👑** permet d'accorder (ou de retirer en direct) le statut **Gold** à un abonné : déblocage de la **capture d'écran**, de l'**impression (`Ctrl + P` / bouton `🖨️ Imprimer`)** et de la **copie de texte/code**.
  - **L'administrateur est toujours 👑 Gold par défaut** sur toutes les pages et boîtes du site (avec bouton `🖨️` d'impression rapide).
- **⏱️ Comptage de la durée totale d'accès par semaine & Indicateur `🟢 En ligne`** :
  - Indicateur **`🟢 En ligne (page en cours)`** en temps réel à côté des élèves connectés et compteur global en haut du tableau de bord.
  - Calcul automatique du temps passé par chaque candidat **semaine par semaine** (du lundi au dimanche) et en **cumul global**, avec sélecteur de semaine et historique détaillé par candidat.
- **🔎 Recherche instantanée, filtres par classe/état, validation groupée & Export Excel (CSV)** :
  - Barre de recherche et filtres rapides (*En ligne*, *Actifs*, *👑 Gold*, *En attente*, *Exclus*, ou par classe).
  - Bouton **`✅ Tout activer`** pour valider en un clic toutes les demandes en attente d'une classe.
  - Bouton **`📥 Exporter Excel (CSV)`** pour télécharger la fiche complète de présence, durée et scores de la classe.
- **🏆 Suivi des Quiz, Atelier Bac Pratique (`/20`) & Contrôles chronométrés** :
  - Enregistrement automatique des scores obtenus aux **Quiz** et à l'**Atelier Épreuve Pratique Bac STI (`bac-pratique.html`)** directement dans le tableau de bord administrateur.
  - Bouton **`⏱️ Contrôle chronométré`** permettant de lancer en direct une épreuve avec compte à rebours sur l'écran de tous les élèves d'une classe.
- **📢 Diffusion de messages par classe, Dictée vocale & Réponses des élèves** :
  - Envoi d'un message à **toute une classe** (ou toutes les classes) en un clic : affichage instantané sur l'écran des élèves connectés, ouverture WhatsApp ou e-mail groupé (`BCC`).
  - **🎤 Dictée vocale intégrée** (sans doublon de mots) avec bouton **🧹 Effacer**.
  - **📋 Tableau de suivi de lecture & réponses en direct** : affiche l'état **`✅ Lu`** / **`⏳ Non lu`** ainsi que la **réponse ou question écrite par l'élève**.
- **🔔 Notifications instantanées** : alerte sonore et notification système (PC & smartphone via `ntfy.sh` et Supabase Realtime) à chaque nouvelle demande d'inscription.

### 🛡️ Protection du contenu & Sécurité (`protection.js` / `protection.css` / `robots.txt`)
- **Protection anti-copie et anti-capture** pour les comptes standards : clic droit, `Ctrl+C/X/A/S/P`, `PrintScreen`, glisser-déposer, filigrane diagonal et blocage d'impression.
- **Déconnexion globale immédiate** : cliquer sur **🚪 Déconnexion** (même depuis une boîte `iframe` ouverte dans une page scrollée) purge la session et redirige instantanément toute l'application vers le portail.
- **Protection anti-IA (`noai` / `noimageai`)** : blocage des robots d'entraînement IA (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, etc.) dans `robots.txt` et balises meta sur toutes les pages.

### 📱 Application PWA & Partage
- **PWA installable** sur ordinateur, Android et iOS (`manifest.webmanifest` + Service Worker `sw.js` en stratégie *Network-First* pour les pages, scripts et styles) ; le bouton **« Installer STI by AE »** disparaît automatiquement une fois l'application installée.
- **QR Codes intégrés** (portail et badge fixe *« Scanner-moi ! »* sur l'accueil) pointant vers `https://aymenessouyah.github.io/STiV2.0/`.
- **Aperçu Open Graph (Facebook / WhatsApp)** configuré avec le logo officiel `assets/icons/sti-icon-512.png`.

---

## 🗂️ Structure du dépôt

```text
STiV2.0/
│
├── index.html                        # 🏠 Accueil — navigation, splash V2.0, leçons animées & QR code
├── portail.html                      # 🔐 Portail de connexion / inscription (e-mail & WhatsApp +216)
├── admin.html                        # 📊 Tableau de bord administrateur temps réel
├── sw.js                             # ⚙️ Service Worker PWA (cache & mode hors-ligne)
├── manifest.webmanifest              # 📱 Manifeste d'installation PWA
├── robots.txt                        # 🤖 Directives SEO & interdiction des crawlers IA
├── sitemap.xml                       # 🗺️ Plan du site
├── README.md                         # 📄 Documentation du projet
│
├── assets/                           # 🎨 Ressources globales
│   ├── css/
│   │   ├── atelier.css               #   Thème principal « L'Atelier » (crème / orange / mode sombre)
│   │   ├── atelier-pages.css         #   Styles des pages de cours et exercices
│   │   └── protection.css            #   Verrous visuels anti-copie / anti-impression (sauf 👑 Gold)
│   ├── js/
│   │   ├── config.js                 #   Configuration Supabase & identifiant admin
│   │   ├── portail.js                #   Logique d'inscription/connexion, OTP 6 cases, captcha, biométrie
│   │   ├── acces.js                  #   Verrou de session temps réel, roue compte, 👑 Gold, journal durée
│   │   ├── admin.js                  #   Logique du tableau de bord, stats par semaine, diffusion & dictée
│   │   ├── protection.js             #   Protection du contenu & déverrouillage automatique Admin / 👑 Gold
│   │   └── supabase-umd.js           #   Client Supabase UMD local
│   ├── icons/                        #   Icônes PWA (192, 512) & favicon STI_by_AE.ico
│   ├── images/                       #   Logos & illustrations (qr-stiv2.png, lycee_logo.png…)
│   ├── audio/                        #   Exemples audio HTML5
│   └── video/                        #   Exemples vidéo HTML5
│
├── cours/                            # 📖 Cours interactifs
│   ├── html5.html                    #   Cours HTML5 complet
│   ├── css3.html                     #   Cours CSS3 complet (+ lien leçons animées en fin de page)
│   ├── javascript.html               #   Cours JavaScript
│   ├── php.html                      #   Cours PHP (+ boîte interactive PHP & MySQLi)
│   ├── php-mysqli.html               #   Boîte animée PHP & MySQLi
│   ├── sql.html                      #   Cours SQL
│   ├── sql-bases-ldd-lmd-lcd.html    #   Bases de données : LDD, LMD, LCD
│   ├── datalist.html                 #   Focus interactif sur <datalist>
│   ├── fiche-revision-html5.html     #   Guide & fiche de révision HTML5
│   └── annexe-fleuriste-html5.html   #   Exemple commenté « Le Fleuriste »
│
├── cssanimee/                        # 🎬 Leçon animée 1 : Les balises HTML5 & propriétés CSS3 pas à pas
│   └── index.html
│
├── Positionnement-animee/            # 📐 Leçon animée 2 : Le positionnement CSS pas à pas
│   └── index.html
│
├── quiz/                             # 🎯 Quiz interactifs & défis
│   ├── html-css.html                 #   Quiz HTML5 / CSS3
│   ├── javascript.html               #   Quiz JavaScript
│   ├── php.html                      #   Quiz PHP
│   ├── pp.html                       #   PHP Playground & défis interactifs
│   └── sql.html                      #   Quiz SQL
│
├── exercices/                        # ✏️ Séries d'exercices & TP corrigés
│   ├── series-exercices.html         #   Portail des séries d'exercices (avec boîtes modales)
│   ├── resume-fonctions-standards.html
│   ├── html-css/                     #   Activités & TP HTML/CSS
│   ├── javascript/                   #   TP JavaScript 1 → 5 + corrigés
│   ├── php/                          #   TP PHP 1 → 4 + corrigés
│   └── sql/                          #   TP Bases de données & SQL + atelier 3 fenêtres
│
├── projets/                          # 🛠️ Projets pédagogiques complets
│   ├── carte-bancaire/               #   TP Carte bancaire (énoncé + correction)
│   ├── formulaire-inscription/       #   Formulaire d'inscription avancé
│   ├── fleurs/                       #   Projet « Fleuriste » (HTML/CSS/JS + PHP)
│   └── site-tunisie/                 #   Site vitrine Tunisie (Nord / Centre / Sud)
│
├── documents/                        # 📄 Documents & annexes PDF
│   └── annexes/                      #   Annexes officielles des 5 modules (HTML5, CSS3, JS, PHP, SQL)
│
├── tools/                            # 🔧 Scripts & schéma de base de données
│   └── supabase-schema.sql           #   Script SQL complet (tables profiles & acces, RLS, fonctions admin)
│
└── app-mobile/                       # 📱 Package Android
    └── STI-By-AE.apk
```

---

## 🚀 Déploiement & Architecture

- **Hébergement** : GitHub Pages ([https://aymenessouyah.github.io/STiV2.0/](https://aymenessouyah.github.io/STiV2.0/)).
- **Backend & Temps réel** : Supabase (PostgreSQL, Row-Level Security, Auth, Realtime Broadcast & Postgres Changes) + relais de notifications `ntfy.sh`.
- **Mode 100 % Hors-ligne (PWA `sti-atelier-v34`)** :
  - Pré-chargement automatique en tâche de fond de toutes les pages du site (cours, leçons animées, séries d'exercices, TP, projets, quiz, annexes, Atelier Bac Pratique, portail et tableau de bord) + bouton **« 📲 Télécharger 100 % hors-ligne »** dans le panneau du compte abonné.
  - Maintien de la session abonné et Admin hors-ligne (`sti-session-cache` / `sti-offline` jusqu'à 30 jours) + reconnexion hors-ligne par empreinte SHA-256 (`sti-cred`).
  - File d'attente hors-ligne (`sti-offline-queue`) synchronisant automatiquement vers Supabase les scores de quiz, durées d'étude et questions au professeur dès le retour de la connexion Internet.
  - Consultation hors-ligne du tableau de bord administrateur (`sti-admin-cache` : abonnés, durées, notes de quiz, filtres et export CSV).
- **Installation base de données** : exécuter `tools/supabase-schema.sql` dans l'éditeur SQL Supabase pour initialiser ou reconstruire les tables `public.profiles`, `public.acces`, les politiques RLS et les fonctions d'administration.
