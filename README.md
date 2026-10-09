# 📚 STI By A'e — Le Web de A à Z (Version 2.0 · `v73`)

Plateforme éducative interactive dédiée aux **Sciences et Technologies de l'Informatique (STI)** :
cours complets, leçons animées pas à pas, annexes officielles, flashcards 3D, bac à sable de code en direct, séries d'exercices, TP corrigés, quiz interactifs et épreuves pratiques en **HTML5, CSS3, JavaScript, SQL et PHP / MySQLi**.

> **Auteur** : **Aymen Essouyah** (`By A'e`)  
> **Version** : **V2.0 · `v73`** (PWA 100 % hors-ligne, portail d'accès sécurisé & tableau de bord temps réel)  
> **Accès local / en ligne** : [./index.html](./index.html)

---

## ✨ Fonctionnalités principales de la Version 2.0

### 🔐 1. Portail d'accès & Gestion des profils (`portail.html`)
- **Identité visuelle unifiée** : thème sombre de l'accueil (`#0d1526` + halo orange + grille de points) avec animation dactylo **`STI`**.
- **Double mode d'inscription et de connexion** :
  - **Par e-mail** (avec validation par l'administrateur).
  - **Par téléphone (`+216`)** avec saisie obligatoire du **Nom** et du **Prénom**, préfixe tunisien `+216 ` et validation par **code WhatsApp à 6 chiffres** (6 cases OTP individuelles).
- **Sélection dynamique du lycée et de la classe** synchronisée avec la configuration de l'administrateur.
- **Session permanente « Labo » (`elevelabo3`)** : tout poste connecté avec la classe `elevelabo3` conserve une session permanente illimitée sur le PC du laboratoire sans redemander d'identifiant ni de mot de passe.
- **Restriction automatique par niveau (`3ème SI` vs `4ème SI`)** :
  - Les ressources **PHP / MySQLi**, l'**Atelier Bac Pratique** et le **Projet STI 0** sont automatiquement masqués et verrouillés dès `0 ms` pour toutes les classes autres que **`4SI` (`4SI1` à `4SI5`)**, **`elevelabo3`** et le **Professeur (Admin)**.

---

### 🎓 2. Outils d'étude & Confort Élève (`index.html` & `assets/js/acces.js`)
- **🃏 Mode « Flashcards Bac STI » en 3D réaliste (`Recto / Verso 3D`)** :
  - Plus de **30 cartes de révision officielles** couvrant **HTML5, CSS3, JavaScript, SQL et PHP / MySQLi**.
  - **Moteur physique 3D à 60 images/seconde (`requestAnimationFrame`)** : décollage de la carte au-dessus de la table, rotation en perspective trapézoïdale (`perspective(520px)`), tranche carton bristol épaisse, reflet lumineux et ombre portée dynamique au sol.
  - Filtres par technologie, mode **« 🔁 À revoir uniquement »**, mélange aléatoire (`🔀`), navigation clavier (`Espace`, `Entrée`, `◀`, `▶`, `Échap`) et sauvegarde hors-ligne des cartes maîtrisées (`✅ Je maîtrise`).
- **💻 Mini « Bac à sable » de code en direct (`HTML / CSS / JS`)** :
  - Éditeur interactif **100 % hors-ligne** avec 3 onglets (**HTML**, **CSS**, **JavaScript**), aperçu instantané et **console JS intégrée** (`console.log` & erreurs d'exécution).
  - Modèles Type Bac préchargés : *Formulaire HTML5 + contrôle `verif()`*, *Flexbox & `@keyframes` CSS3*, *Chaînes et fonctions JavaScript (`indexOf`, `substring`, `Date`)* et *Page vierge*.
- **🔍 Recherche profonde globale (`Ctrl + K` ou `/`)** :
  - Recherche instantanée à travers tous les chapitres, balises HTML5 (`<datalist>`, `<fieldset>`…), propriétés CSS3 (`flexbox`, `@keyframes`…), fonctions JS/PHP (`isNaN`, `mysqli_fetch_array`…) et commandes SQL (`FOREIGN KEY`, `GROUP BY`, `HAVING`…) avec ouverture directe de la section exacte.
- **📍 Reprise automatique de lecture & Marque-pages** :
  - Mémorisation automatique du dernier chapitre lu et du pourcentage d'avancement dans chaque cours.
  - Bandeau **« Reprendre votre dernière révision »** en haut de l'accueil, pastilles d'avancement sur les cartes de cours et notification **« Reprendre ➔ »** à l'ouverture d'un cours.
- **📝 Carnet de notes personnel (`Alt + N`)** :
  - Prise de notes personnelle par cours, sauvegardée automatiquement dans le navigateur (100 % hors-ligne) et téléchargeable en fichier `.txt`.

---

### 📖 3. Cours interactifs, Animations & Projets Bac
- **🐘 Cours PHP (`cours/php.html`), `cours/PHP-recap.html` & `cours/php-mysqli.html`** :
  - Bouton magique permanent **`🪄 PHP-recap ✨`** sous l'en-tête ouvrant la fiche récapitulative complète `cours/PHP-recap.html` en boîte modale plein écran.
  - Bouton **`🎬`** dans l'en-tête ouvrant l'animation interactive du guichet Client / Serveur Apache / PHP / MySQL.
  - Boîte interactive dédiée aux fonctions **PHP & MySQLi** (`cours/php-mysqli.html`).
- **🗄️ Cours SQL (`cours/sql.html`) & Animation des contraintes (`cours/sql-contraintes.html`)** :
  - Cours complet LDD / LMD avec bouton **`⚡ Voir l'animation : Effet des contraintes`** en fin de chapitre ouvrant `cours/sql-contraintes.html` en modale néo-brutaliste.
  - Simulateur SQL interactif permettant de tester en direct l'effet de `PRIMARY KEY`, `FOREIGN KEY`, `ON DELETE CASCADE`, `UNIQUE`, `CHECK`, `NOT NULL`, `DEFAULT` et `AUTO_INCREMENT` avec journal SGBD.
- **🎬 Leçons animées pas à pas** :
  - **`cssanimee/`** : découverte visuelle et animée des balises HTML5 et propriétés CSS3 des annexes officielles.
  - **`Positionnement-animee/`** : leçon animée pas à pas sur le positionnement CSS et Flexbox.
- **🧪 Atelier Bac Pratique (`bac-pratique.html`) & Projet STI 0 (`projets/sti0/`)** :
  - Épreuves pratiques complètes avec barème sur 20, correction guidée et téléchargement hors-ligne garanti de l'énoncé PDF (`projetsti0.pdf`) et de l'archive des ressources (`ressources-projet-sti0.zip`).
- **🪪 Carte de visite numérique (`carte-visite.html`)** :
  - Carte professionnelle interactive avec logo **AE** ; l'export contact (`.vcf`) et l'impression sont strictement réservés à l'administrateur.

---

### 📊 4. Tableau de bord Administrateur temps réel (`admin.html`)
- **Verrou anti-flash `0 ms`, Version & Jauge d'espace Supabase** :
  - Protection immédiate de `admin.html` dès `0 ms` avant le premier rendu.
  - Affichage permanent de la version (`STI V2.0 · v73`) accompagné du **pourcentage et de l'espace restant en direct dans Supabase** (sur le quota de 500 Mo via `public.admin_taille_base()`).
- **Gestion complète des abonnés, des classes et des lycées** :
  - L'administrateur n'apparaît jamais dans la liste des abonnés.
  - Ajout, renommage (avec migration automatique des élèves) et suppression de **classes** et de **lycées** synchronisés sur tous les appareils.
  - Affichage en direct de l'**effectif de la classe sélectionnée** et du **nombre d'élèves `🟢 En ligne`**.
  - Deux modes d'affichage : **`📋 Liste détaillée`** (lignes colorées selon l'état : vert clair = actif, doré = 👑 Gold, beige = en attente, rose = exclu) et **`🔵 Nœuds`** compacts.
  - Changement direct de la classe d'un abonné et actions rapides (**`✅ Activer`**, **`👑 Gold`**, **`⏳ Attente`**, **`⛔ Exclure`**, **`🔑 Mot de passe`**, **`🗑️ Supprimer`**) avec **éjection en direct (`< 1 s`)** en cas d'exclusion ou de suppression.
- **📋 Fiche récapitulative individuelle par élève (`#modal-fiche-eleve`)** :
  - En cliquant sur **`📋 Fiche`** (ou sur un nœud en vue `🔵 Nœuds`), ouverture du bilan complet de l'élève : coordonnées, classe, statut, temps d'étude hebdomadaire et global, moyenne générale aux quiz, historique détaillé des notes et messages lus/réponses.
- **📥 Exports Excel (CSV) par classe** :
  - Export CSV des abonnés (incluant le nombre de quiz passés, la moyenne `/20` et le dernier score).
  - Filtre par classe et bouton **`📥 Exporter notes (CSV)`** dans la section *Résultats Quiz & Contrôles*.
- **Affichage compact & Purges ciblées** :
  - Affichage par défaut des **5 premiers éléments** avec bouton **`➕ Voir plus`** pour le journal des connexions, le suivi de lecture des messages et les résultats des quiz.
  - Boutons de nettoyage ciblé : **`🗑️ Effacer par mois…`** (journal des connexions et résultats de quiz) et **`🗑️ Effacer par message…`** (suivi de lecture).
- **📢 Diffusion de messages par classe, Dictée vocale & Contrôle chronométré** :
  - Envoi de messages ciblés par classe avec **🎤 dictée vocale sans répétition**, bouton **🧹 Effacer**, accusé de lecture (`✅ Lu` / `⏳ Non lu`) et réponse directe des élèves.
  - Lancement en direct d'un **`⏱️ Contrôle chronométré`** avec compte à rebours synchronisé sur les écrans de la classe.

---

### 🛡️ 5. Protection du contenu, Compte 👑 Gold & Verrouillage du code source
- **Compte 👑 Gold** :
  - Le statut **👑 Gold** (accordé par l'administrateur) débloque la **copie de texte/code**, la **capture d'écran** et l'**impression (`Ctrl + P` / `🖨️`)** pour l'abonné bénéficiaire.
  - **L'administrateur est toujours 👑 Gold par défaut** sur l'ensemble du site.
- **Verrouillage strict du code source pour 100 % des abonnés (`assets/js/protection.js`)** :
  - Le clic droit, l'enregistrement de page (`Ctrl + S`), l'affichage du code source (`Ctrl + U`), les outils de développement (`F12`, `Ctrl + Shift + I / J / C / K`) et le bouclier **Anti-DevTools (`#sti-devtools-overlay`)** sont **bloqués pour 100 % des abonnés**, y compris les comptes **👑 Gold** et **`elevelabo3`** (seul l'administrateur strict est exempté).
- **Protection Anti-IA (`robots.txt` & balises `noai` / `noimageai`)** :
  - Interdiction d'indexation par les robots d'entraînement IA (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Bytespider`, etc.) sur toutes les pages.

---

## 🗂️ Structure du dépôt

```text
STiV2.0/
│
├── index.html                        # 🏠 Accueil — cours, recherche Ctrl+K, Flashcards 3D & Bac à sable
├── portail.html                      # 🔐 Portail de connexion / inscription (e-mail & WhatsApp +216)
├── admin.html                        # 📊 Tableau de bord administrateur temps réel + quota Supabase
├── bac-pratique.html                 # 🧪 Atelier Épreuve Pratique Bac STI (réservé 4SI / Labo / Admin)
├── carte-visite.html                 # 🪪 Carte de visite numérique AE (.vcf & impression réservés Admin)
├── sw.js                             # ⚙️ Service Worker PWA (cache 100 % hors-ligne v73 — 371 fichiers)
├── manifest.webmanifest              # 📱 Manifeste d'installation PWA
├── robots.txt                        # 🤖 Directives SEO & blocage des crawlers IA
├── sitemap.xml                       # 🗺️ Plan du site
├── README.md                         # 📄 Documentation du projet
│
├── assets/                           # 🎨 Ressources globales
│   ├── css/
│   │   ├── atelier.css               #   Thème principal « L'Atelier » (crème / orange / mode sombre)
│   │   ├── atelier-pages.css         #   Styles des pages de cours et exercices
│   │   ├── atelier-php.css           #   Styles spécifiques au module PHP
│   │   └── protection.css            #   Verrous visuels anti-copie / anti-impression
│   ├── js/
│   │   ├── config.js                 #   Configuration Supabase & identifiant administrateur
│   │   ├── portail.js                #   Inscription/connexion, OTP WhatsApp 6 cases, biométrie, labo3
│   │   ├── acces.js                  #   Session temps réel, roue ⚙️, Flashcards 3D, Sandbox, Notes, Ctrl+K
│   │   ├── admin.js                  #   Tableau de bord, quota Supabase, fiche élève, exports CSV, purges
│   │   ├── protection.js             #   Bouclier code source / Anti-DevTools & privilèges 👑 Gold / Admin
│   │   └── supabase-umd.js           #   Client Supabase UMD local
│   ├── fonts/                        #   Polices locales embarquées (Manrope, Baloo 2, JetBrains Mono)
│   ├── fontawesome/                  #   Icônes Font Awesome locales
│   ├── icons/                        #   Icônes PWA (192, 512) & favicon STI_by_AE.ico
│   ├── images/                       #   Logos & QR code de contact (qr-code-site.png, qr-stiv2.png)
│   ├── audio/                        #   Exemples audio HTML5
│   └── video/                        #   Exemples vidéo HTML5
│
├── cours/                            # 📖 Cours interactifs & Fiches récapitulatives
│   ├── html5.html                    #   Cours HTML5 complet
│   ├── css3.html                     #   Cours CSS3 complet (+ accès aux leçons animées)
│   ├── javascript.html               #   Cours JavaScript
│   ├── sql.html                      #   Cours SQL (+ bouton modale vers l'animation des contraintes)
│   ├── sql-contraintes.html          #   Animation interactive néo-brutaliste : Effet des contraintes SQL
│   ├── sql-bases-ldd-lmd-lcd.html    #   Bases de données : LDD, LMD, LCD
│   ├── php.html                      #   Cours PHP (+ boutons 🪄 PHP-recap ✨, 🎬 Guichet & MySQLi)
│   ├── PHP-recap.html                #   Fiche récapitulative PHP complète (intégrée en modale)
│   ├── php-mysqli.html               #   Boîte interactive PHP & MySQLi
│   ├── datalist.html                 #   Focus interactif sur <datalist>
│   ├── fiche-revision-html5.html     #   Guide & fiche de révision HTML5
│   └── annexe-fleuriste-html5.html   #   Exemple commenté « Le Fleuriste »
│
├── cssanimee/                        # 🎬 Leçon animée 1 : Balises HTML5 & propriétés CSS3 des annexes
│   └── index.html
│
├── Positionnement-animee/            # 📐 Leçon animée 2 : Positionnement CSS & Flexbox pas à pas
│   └── index.html
│
├── quiz/                             # 🎯 Quiz interactifs & Défis (avec remontée des notes à l'Admin)
│   ├── html-css.html                 #   Quiz HTML5 / CSS3
│   ├── javascript.html               #   Quiz JavaScript
│   ├── sql.html                      #   Quiz SQL
│   ├── php.html                      #   Quiz PHP (4SI)
│   └── pp.html                       #   PHP Playground & défis interactifs (4SI)
│
├── exercices/                        # ✏️ Séries d'exercices & TP corrigés
│   ├── series-exercices.html         #   Portail des séries d'exercices (filtré selon le niveau)
│   ├── resume-fonctions-standards.html
│   ├── html-css/                     #   Activités & TP HTML/CSS
│   ├── javascript/                   #   TP JavaScript 1 → 5 + corrigés
│   ├── sql/                          #   TP Bases de données & SQL + atelier 3 fenêtres
│   └── php/                          #   TP PHP 1 → 4 + corrigés (4SI)
│
├── projets/                          # 🛠️ Projets pédagogiques complets
│   ├── sti0/                         #   Projet STI 0 (énoncé PDF + archive ressources ZIP hors-ligne)
│   ├── carte-bancaire/               #   TP Carte bancaire (énoncé + correction)
│   ├── formulaire-inscription/       #   Formulaire d'inscription avancé
│   ├── fleurs/                       #   Projet « Fleuriste » (HTML/CSS/JS + PHP)
│   └── site-tunisie/                 #   Site vitrine Tunisie (Nord / Centre / Sud)
│
├── documents/                        # 📄 Annexes officielles PDF (HTML5, CSS3, JS, SQL, PHP)
│   └── annexes/
│
└── tools/                            # 🔧 Administration & Base de données
    └── supabase-schema.sql           #   Schéma SQL complet (tables, RLS, fonctions RPC & quota base)
```

---

## 🚀 Architecture & Mode 100 % Hors-ligne (`sti-atelier-v73`)

1. **Service Worker (`sw.js`) sans aucun lien mort** :
   - Pré-chargement automatique en tâche de fond des **371 fichiers existants** du site (cours, animations, exercices, quiz, PDF, archives `.zip`, polices et icônes).
   - Purge automatique des anciens fichiers `.html`, `.js` et `.css` lors des changements de version pour garantir l'application immédiate des mises à jour.
   - Génération de `Blob` locaux (et Base64 embarqué pour `ressources-projet-sti0.zip`) permettant de télécharger les archives et sujets PDF même lorsque le PC du laboratoire est totalement déconnecté d'Internet.
2. **Synchronisation différée automatique** :
   - Les scores de quiz, durées d'étude hebdomadaires et réponses aux messages réalisés hors-ligne sont stockés dans `sti-offline-queue` et synchronisés automatiquement vers Supabase dès le retour de la connexion.
3. **Base de données Supabase (`tools/supabase-schema.sql`)** :
   - Tables `public.profiles` et `public.acces` sécurisées par Row-Level Security (RLS).
   - Fonctions RPC d'administration (`admin_creer_abonne`, `admin_maj_statut`, `admin_changer_mdp`, `admin_supprimer_abonne`, `admin_taille_base`).
