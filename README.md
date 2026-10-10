# 📚 STI By A'e — Le Web de A à Z (Version 2.0 · `v100`)

Plateforme éducative interactive dédiée aux **Sciences et Technologies de l'Informatique (STI)** :
cours complets, leçons animées pas à pas, annexes officielles, flashcards 3D, bac à sable de code en direct, chasse aux erreurs (débogage Bac STI), messagerie temps réel avec pièces jointes, questions flash en direct, séries d'exercices, TP corrigés, quiz interactifs et épreuves pratiques en **HTML5, CSS3, JavaScript, SQL et PHP / MySQLi**.

> **Auteur** : **Aymen Essouyah** (`By A'e`)  
> **Version** : **V2.0 · `v98`** (PWA 100 % hors-ligne, Portail sécurisé, Mode Examen, Pack Sécurité Totale, Téléportation, Appel automatique & Chasse aux erreurs Bac STI)

---

## ✨ Fonctionnalités principales de la Version 2.0

### 🔐 1. Portail d'accès & Gestion des profils (`portail.html`)
- **Identité visuelle unifiée** : thème sombre de l'accueil (`#0d1526` + halo orange + grille de points) avec animation dactylo **`STI`**.
- **Double mode d'inscription et de connexion** :
  - **Par e-mail** (avec validation par l'administrateur).
  - **Par téléphone (`+216`)** avec saisie obligatoire du **Nom** et du **Prénom**, préfixe tunisien `+216 ` et validation par **code WhatsApp à 6 chiffres** (6 cases OTP individuelles).
- **Protection Anti-Brute-Force** : blocage temporaire automatique de 60 secondes avec compte à rebours après 5 tentatives de connexion infructueuses.
- **Sélection dynamique du lycée et de la classe** synchronisée avec la configuration de l'administrateur.
- **Session permanente « Labo » (`elevelabo3`)** : tout poste connecté avec la classe `elevelabo3` conserve une session permanente illimitée sur le PC du laboratoire avec accès à tous les cours et projets (ainsi qu'au bouton `🚪 Déconnexion`), **mais sans aucun accès à `admin.html`**.
- **Restriction automatique par niveau (`3ème SI` vs `4ème SI`)** :
  - Les ressources **PHP / MySQLi**, l'**Atelier Bac Pratique** et le **Projet STI 0** (`projetsti0.pdf` et `ressources-projet-sti0.zip`) sont automatiquement masqués et verrouillés dès `0 ms` pour toutes les classes autres que **`4SI` (`4SI1` à `4SI5`)**, **`elevelabo3`** et le **Professeur (Admin)**.

---

### 🎓 2. Outils d'étude, Révision interactive & Confort Élève (`index.html` & `assets/js/acces.js`)
- **🃏 Mode « Flashcards Bac STI » en 3D réaliste (`Recto / Verso 3D`)** :
  - Plus de **30 cartes de révision officielles** couvrant **HTML5, CSS3, JavaScript, SQL et PHP / MySQLi**.
  - **Moteur physique 3D à 60 images/seconde (`requestAnimationFrame`)** : décollage de la carte au-dessus de la table, rotation en perspective trapézoïdale (`perspective(620px)`), tranche carton bristol épaisse, reflet lumineux et ombre portée dynamique au sol.
  - Filtres par technologie, mode **« 🔁 À revoir uniquement »**, mélange aléatoire (`🔀`), navigation clavier (`Espace`, `Entrée`, `◀`, `▶`, `Échap`) et sauvegarde hors-ligne des cartes maîtrisées (`✅ Je maîtrise`).
- **💻 Mini « Bac à sable » de code en direct (`HTML / CSS / JS`)** :
  - Éditeur interactif **100 % hors-ligne** avec 3 onglets (**HTML**, **CSS**, **JavaScript**), aperçu instantané et **console JS intégrée** (`console.log` & erreurs d'exécution).
  - Modèles Type Bac préchargés : *Formulaire HTML5 + contrôle `verif()`*, *Flexbox & `@keyframes` CSS3*, *Chaînes et fonctions JavaScript (`indexOf`, `substring`, `Date`)* et *Page vierge*.
- **🐞 Mode « Chasse aux erreurs (Débogage Bac STI) »** :
  - **10 défis officiels de débogage type Bac STI** (3 erreurs classiques par défi = **30 pièges du Bac**) :
    - **HTML5** : `onsubmit="return verif()"`, `<datalist id="...">` relié à `list="..."`, même `name` sur les boutons `radio`, `colspan="3"`, `pattern="[0-9]{8}"`, `controls` sur `<audio>`.
    - **CSS3** : `display: flex;`, sélecteur `.carte:hover`, `color`, `border-radius`, `@keyframes`, `transform: rotate(...)`.
    - **JavaScript** : `.value` (au lieu de `.innerHTML`), `.length` (au lieu de `.size`), `if (isNaN(cin))`, `charAt(0)`, `.selectedIndex` sur `<select>`, `.checked` sur les radios.
    - **SQL** : `PRIMARY KEY`, `CHECK (qte > 0)`, `REFERENCES Client(id_cl)` (avec `S`), `YEAR(date_cmd)`, `HAVING COUNT(*) >= 3` après `GROUP BY`, `ORDER BY total DESC`.
    - **PHP & MySQLi** (réservés aux `4SI`, `elevelabo3` et Admin) : `$_POST["cin"]`, ordre `mysqli_query($con, $req)`, `mysqli_affected_rows($con)` après `INSERT`, ordre `mysqli_connect("localhost", "root", "", "bd_sport")`, `mysqli_num_rows($res)` et `mysqli_fetch_array($res)`.
  - Diagnostic en direct des 3 erreurs (`🐞` → `✅`), indices progressifs (`💡 Indice 1/3`), corrigé expliqué et envoi automatique de la note `/20` au professeur (`🏆 Envoyer mon score`).
- **💬 Messenger STI bidirectionnel avec pièces jointes (`📎`) sur 100 % des pages** :
  - Fenêtre de discussion style Facebook Messenger accessible depuis toutes les pages du site (PC et mobile avec adaptation automatique au clavier virtuel).
  - Envoi et réception bidirectionnels de messages texte, d'images (aperçu + téléchargement) et de documents/codes (`.pdf`, `.zip`, `.html`, `.css`, `.js`, `.sql`, `.php`, `.txt`), dictée vocale sans répétition et alerte sonore/visuelle en temps réel.
- **⚡ Question Flash / Sondage Live en classe** :
  - Réception en direct sur l'écran de l'élève des questions flash minutées lancées par le professeur (QCM `A/B/C/D`, `Vrai / Faux` ou `Réponse courte`), avec compte à rebours, envoi en 1 clic et affichage de la correction officielle.
- **🔍 Recherche profonde globale (`Ctrl + K` ou `/`)** :
  - Recherche instantanée à travers tous les chapitres, balises HTML5 (`<datalist>`, `<fieldset>`…), propriétés CSS3 (`flexbox`, `@keyframes`…), fonctions JS/PHP (`isNaN`, `mysqli_fetch_array`…) et commandes SQL (`FOREIGN KEY`, `GROUP BY`, `HAVING`…) avec ouverture directe de la section exacte.
- **📍 Reprise automatique de lecture, 📝 Carnet de notes (`Alt + N`) & Bouton `⬆ Haut` universel** :
  - Mémorisation automatique du dernier chapitre lu et du pourcentage d'avancement dans chaque cours.
  - Prise de notes personnelle par cours, sauvegardée automatiquement hors-ligne et téléchargeable en fichier `.txt`.
  - Bouton flottant **`⬆ Haut`** présent sur 100 % des pages du site.

---

### 📖 3. Cours interactifs, Animations & Projets Bac
- **🐘 Cours PHP (`cours/php.html`), `cours/PHP-recap.html` & `cours/php-mysqli.html`** :
  - Bouton magique permanent **`🪄 PHP-recap ✨`** sous l'en-tête ouvrant la fiche récapitulative complète `cours/PHP-recap.html` en boîte modale plein écran.
  - Bouton **`🎬`** dans l'en-tête ouvrant l'animation interactive du guichet Client / Serveur Apache / PHP / MySQL (avec bouton « Tournez-moi ! 🔄 » sur mobile portrait).
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

### 📊 4. Tableau de bord Administrateur temps réel & Pilotage de classe (`admin.html`)
- **Sécurité d'accès exclusive, Verrou anti-flash `0 ms`, Version & Jauge Supabase** :
  - Accès à `admin.html` **strictement réservé au seul compte administrateur** avec protection immédiate dès `0 ms` avant le premier rendu.
  - Affichage permanent de la version (`STI V2.0 · v100`) accompagné du **pourcentage et de l'espace restant en direct dans Supabase** (sur le quota de 500 Mo via `public.admin_taille_base()`).
  - **🔒 Verrouillage rapide de l'écran Admin par code PIN (`#modal-verrou-ecran-admin`)** : permet au professeur de verrouiller l'écran du tableau de bord en 1 clic lorsqu'il circule dans les rangs.
- **📋 Feuille d'appel & présence automatique du jour par classe (`#modal-appel-presence`)** :
  - Croisement automatique des abonnés de la classe choisie avec les connexions du jour : liste claire des **`🟢 Présents`** (avec heure exacte de 1re connexion et appareil) et des **`🔴 Absents`**, prête à être **imprimée (`🖨️`)** ou **exportée en CSV (`📥`)**.
- **🚀 Téléportation d'écran en direct & ⏸️ Pause écran individuel** :
  - **🚀 Téléporter les écrans** : depuis `🛡️ Sécurité`, le professeur choisit une ressource (cours, TP, série d'exercices, quiz, Bac Pratique) et l'ouvre instantanément sur tous les postes des élèves de la classe cible.
  - **⏸️ Pause écran individuel (`⏸️` / `▶️`)** : bouton direct sur chaque ligne et nœud d'abonné permettant de geler/dégeler instantanément l'écran d'un élève précis avec le message plein écran *« ⏸️ Écran mis en pause par M. Essouyah — Regardez le tableau ! »*.
- **⚡ Question Flash / Sondage Live en classe** :
  - Lancement en direct depuis `admin.html` **ou depuis n'importe quelle page du site** (où le bouton **`⚡`** remplace le bouton Imprimer `🖨️` pour l'administrateur) d'une question minutée avec réception instantanée des réponses des élèves, barres de progression par option (`A/B/C/D`, `Vrai/Faux` ou texte) et révélation de la bonne réponse.
- **Gestion complète des abonnés, des classes et des lycées** :
  - L'administrateur n'apparaît jamais dans la liste des abonnés.
  - Ajout, renommage (avec migration automatique des élèves) et suppression de **classes** et de **lycées** synchronisés sur tous les appareils.
  - Affichage en direct de l'**effectif de la classe sélectionnée** et du **nombre d'élèves `🟢 En ligne`**.
  - Deux modes d'affichage : **`📋 Liste détaillée`** (lignes colorées selon l'état : vert clair = actif, doré = 👑 Gold, beige = en attente, rose = exclu) et **`🔵 Nœuds`** compacts.
  - Changement direct de la classe d'un abonné et actions rapides (**`✅ Activer`**, **`👑 Gold`**, **`⏸️ Pause`**, **`⏳ Attente`**, **`⛔ Exclure`**, **`🔑 Mot de passe`**, **`🗑️ Supprimer`**) avec **éjection en direct (`< 1 s`)**.
- **📋 Fiche récapitulative individuelle par élève (`#modal-fiche-eleve`) & 📥 Exports CSV** :
  - Bilan complet de l'élève : coordonnées, classe, statut, cumul hebdomadaire (du lundi 00h00 à aujourd'hui) et global, appareils utilisés (`#XXXX`), moyenne générale `/20`, historique des Quiz et Défis de débogage, messages lus/réponses, bouton `✕` fixe sur mobile et export CSV.
- **Affichage compact & Purges ciblées** :
  - Affichage par défaut des **5 premiers éléments** avec bouton **`➕ Voir plus`** pour le journal des connexions (incluant Lycée et Classe dans la colonne Candidat), le suivi de lecture des messages et les résultats des quiz.
  - Boutons de nettoyage ciblé : **`🗑️ Effacer par mois…`** (connexions et quiz) et **`🗑️ Effacer par message…`** (suivi de lecture).

---

### 🛡️ 5. Pack Sécurité Totale, Compte 👑 Gold, PDF & Verrouillage du code source
- **📄 Documents PDF accessibles à tous & Compte 👑 Gold** :
  - **Tous les liens et documents PDF (`.pdf` et `.pdf.html`) peuvent être ouverts, téléchargés et imprimés par tous les abonnés actifs** (même non-Gold).
  - Le statut **👑 Gold** (accordé par l'administrateur, et actif par défaut pour l'Admin) débloque en plus la copie de texte/code, la capture d'écran et l'impression des pages de cours interactives.
- **Verrouillage strict du code source pour 100 % des abonnés (`assets/js/protection.js`)** :
  - Le clic droit, l'enregistrement de page (`Ctrl + S`), l'affichage du code source (`Ctrl + U`), les outils de développement (`F12`, `Ctrl + Shift + I / J / C / K`) et le bouclier **Anti-DevTools (`#sti-devtools-overlay`)** sont **bloqués pour 100 % des abonnés**, y compris les comptes **👑 Gold** et **`elevelabo3`** (seul l'administrateur strict est exempté).
- **🛡️ Centre de Sécurité temps réel (`#modal-securite` dans `admin.html`)** :
  1. **🔒 Mode Examen / Verrouillage par classe** : bloque l'accès aux cours pour une classe ou tout le site et maintient les élèves sur la seule page d'épreuve autorisée.
  2. **🖥️ Plein Écran (`F11`) obligatoire en Mode Examen** : masque la barre d'adresse et les onglets du navigateur pendant l'épreuve et alerte le professeur en cas de sortie du plein écran.
  3. **🚫 Anti-partage de compte (Session unique)** : 1 seule session simultanée par élève (déconnexion immédiate de l'ancien appareil avec `#partage`).
  4. **⚡ Éjection auto Code Source (`3/3`)** : déconnexion immédiate (`#securite`) après 3 tentatives d'ouverture de `F12` / `Ctrl+U` / DevTools.
  5. **👀 Anti-triche sortie d'onglet (`Alt+Tab`)** : détection et alerte temps réel si l'élève quitte l'onglet pendant un Quiz, un Contrôle ou le Mode Examen.
  6. **📐 Anti-Écran partagé (`Split-screen < 80 %`) & 🌐 Anti-Traduction automatique (`translate="no"`)** : bloque l'affichage côte à côte avec une IA/antisèche pendant les épreuves et interdit à Google Translate de traduire et fausser les mots-clés `SELECT`, `WHERE`, `input`, `function`…
  7. **🤖 Anti-collage massif externe (Anti-ChatGPT)** : bloque le collage de blocs de texte/code externes (`≥ 35` caractères) dans les champs de réponse et alerte le professeur.
  8. **🕵️ Filigrane nominatif anti-photo smartphone** : affiche en diagonale semi-transparente l'identité, la classe, l'empreinte d'appareil `#XXXX` et l'heure sur toutes les pages.
  9. **📱 Identification d'appareil (`#XXXX`), Alerte multi-appareils (`≥ 3`), ⏳ Auto-déconnexion après inactivité (15–60 min) & 💾 Backup JSON complet** en 1 clic.
- **Protection Anti-IA (`robots.txt` & balises `noai` / `noimageai`)** :
  - Interdiction d'indexation par les robots d'entraînement IA (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Bytespider`, etc.) sur toutes les pages.

---

## 🗂️ Structure du projet

```text
STI-Atelier-V2.0/
│
├── index.html                        # 🏠 Accueil — cours, recherche Ctrl+K, Flashcards 3D, Sandbox & Chasse aux erreurs
├── portail.html                      # 🔐 Portail de connexion / inscription (e-mail, WhatsApp +216 & anti-brute-force)
├── admin.html                        # 📊 Tableau de bord Admin temps réel, Appel, Sécurité, Flash & Messenger
├── bac-pratique.html                 # 🧪 Atelier Épreuve Pratique Bac STI (réservé 4SI / Labo / Admin)
├── carte-visite.html                 # 🪪 Carte de visite numérique AE (.vcf & impression réservés Admin)
├── sw.js                             # ⚙️ Service Worker PWA (cache 100 % hors-ligne sti-atelier-v100)
├── manifest.webmanifest              # 📱 Manifeste d'installation PWA
├── robots.txt                        # 🤖 Directives SEO & blocage des crawlers IA
├── sitemap.xml                       # 🗺️ Plan du site
├── README.md                         # 📄 Documentation complète du projet
│
├── assets/                           # 🎨 Ressources globales
│   ├── css/
│   │   ├── atelier.css               #   Thème principal « L'Atelier » (crème / orange / mode sombre)
│   │   ├── atelier-pages.css         #   Styles des pages de cours et exercices
│   │   ├── atelier-php.css           #   Styles spécifiques au module PHP
│   │   └── protection.css            #   Verrous visuels anti-copie / anti-impression & exemption PDF
│   ├── js/
│   │   ├── config.js                 #   Configuration Supabase, RACINE & identifiant administrateur
│   │   ├── portail.js                #   Inscription/connexion, OTP WhatsApp 6 cases, biométrie, labo3
│   │   ├── acces.js                  #   Session, roue ⚙️, Flashcards 3D, Sandbox, Débogage, Messenger 📎, Sécurité
│   │   ├── admin.js                  #   Tableau de bord, Appel, Sécurité, Téléportation, Pause, Flash, CSV
│   │   ├── protection.js             #   Bouclier code source / Anti-DevTools & privilèges 👑 Gold / Admin / PDF
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
├── documents/                        # 📄 Annexes officielles PDF & Cours complets imprimables par tous
│   ├── annexes/
│   └── complet/
│
└── tools/                            # 🔧 Administration & Base de données
    └── supabase-schema.sql           #   Schéma SQL complet (tables, RLS blindé, triggers & fonctions RPC)
```

---

## 🚀 Architecture & Mode 100 % Hors-ligne (`sti-atelier-v100`)

1. **Service Worker (`sw.js`) sans aucun lien mort** :
   - Pré-chargement automatique en tâche de fond de l'ensemble des fichiers du site (cours, animations, exercices, quiz, PDF, archives `.zip`, polices et icônes) avec résolution exacte des sous-dossiers (`/cssanimee/`, `/Positionnement-animee/`, etc.).
   - Purge automatique des anciens fichiers `.html`, `.js` et `.css` lors des changements de version pour garantir l'application immédiate des mises à jour.
   - Génération de `Blob` locaux (et Base64 embarqué pour `ressources-projet-sti0.zip`) permettant de télécharger les archives et sujets PDF même lorsque le PC du laboratoire est totalement déconnecté d'Internet.
2. **Synchronisation différée automatique** :
   - Les scores de quiz et de débogage, durées d'étude hebdomadaires, alertes de sécurité et réponses Messenger réalisés hors-ligne sont stockés dans `sti-offline-queue` et synchronisés automatiquement vers Supabase dès le retour de la connexion.
3. **Base de données Supabase (`tools/supabase-schema.sql`)** :
   - Tables `public.profiles` et `public.acces` sécurisées par Row-Level Security (RLS) avec trigger `trg_verrou_profil_securite` interdisant toute élévation de privilèges côté client (`statut`, `classe`, `|GOLD`, événements réservés à l'administrateur).
   - Fonctions RPC d'administration (`admin_creer_abonne`, `admin_maj_statut`, `admin_changer_mdp`, `admin_supprimer_abonne`, `admin_taille_base`).
