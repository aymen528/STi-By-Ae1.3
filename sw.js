/* STI by AE — Service Worker L'Atelier (v36)
   Navigation instantanée : réseau d'abord pour les pages/scripts/styles (sans blocage ni timeout artificiel),
   cache en secours hors-ligne. */

var CACHE = "sti-atelier-v37";
var SHELL = [
  "./",
  "./index.html",
  "./portail.html",
  "./admin.html",
  "./bac-pratique.html",
  "./carte-visite.html",
  "./manifest.webmanifest",
  "./assets/css/atelier.css",
  "./assets/css/atelier-pages.css",
  "./assets/css/protection.css",
  "./assets/js/config.js",
  "./assets/js/supabase-umd.js",
  "./assets/js/protection.js",
  "./assets/js/acces.js",
  "./assets/js/portail.js",
  "./assets/js/admin.js",
  "./assets/fonts/fonts.css",
  "./assets/icons/sti-icon-192.png",
  "./assets/icons/sti-icon-512.png",
  "./cours/html5.html",
  "./cours/css.html",
  "./cours/javascript.html",
  "./cours/php.html",
  "./cours/php-mysqli.html",
  "./cours/sql.html",
  "./exercices/series-exercices.html",
  "./exercices/resume-fonctions-standards.html",
  "./quiz/html-css.html",
  "./quiz/javascript.html",
  "./quiz/php.html",
  "./quiz/pp.html",
  "./quiz/sql.html"
];

var OFFLINE_LIST = [
  "./404.html",
  "./admin.html",
  "./bac-pratique.html",
  "./carte-visite.html",
  "./index.html",
  "./manifest.webmanifest",
  "./portail.html",
  "./quiz/html-css.html",
  "./quiz/javascript.html",
  "./quiz/php.html",
  "./quiz/pp.html",
  "./quiz/sql.html",
  "./projets/fleurs.zip",
  "./projets/site-tunisie/enonce.html",
  "./projets/site-tunisie/index.html",
  "./projets/site-tunisie/ressources-site-tunisie.rar",
  "./projets/site-tunisie/site-tunisie-Correction-animation-html-css.html",
  "./projets/site-tunisie/pages/accueil.html",
  "./projets/site-tunisie/pages/centre.html",
  "./projets/site-tunisie/pages/nord.html",
  "./projets/site-tunisie/pages/sud.html",
  "./projets/site-tunisie/images/carte-tunisie.png",
  "./projets/site-tunisie/images/centre.jpg",
  "./projets/site-tunisie/images/nord.jpg",
  "./projets/site-tunisie/images/oud-c-arabian.mp3",
  "./projets/site-tunisie/images/portrait.jpg",
  "./projets/site-tunisie/images/sidibou.mp4",
  "./projets/site-tunisie/images/sud.jpg",
  "./projets/site-tunisie/correction-details/carte-timbre-droite-haut.html",
  "./projets/formulaire-inscription/cvFleurs.html",
  "./projets/formulaire-inscription/media/SON.mp3",
  "./projets/formulaire-inscription/media/femme.jpg",
  "./projets/formulaire-inscription/media/fleur.png",
  "./projets/formulaire-inscription/media/flower.webm",
  "./projets/formulaire-inscription/media/homme.png",
  "./projets/formulaire-inscription/media/imageslider1.jpg",
  "./projets/formulaire-inscription/media/imageslider2.jpg",
  "./projets/formulaire-inscription/media/imageslider3.jpg",
  "./projets/formulaire-inscription/media/imageslider4.jpg",
  "./projets/formulaire-inscription/media/logo.png",
  "./projets/formulaire-inscription/media/orchidee.jpg",
  "./projets/formulaire-inscription/media/pageindex.png",
  "./projets/formulaire-inscription/media/pivoine.jpg",
  "./projets/formulaire-inscription/media/tulipes.jpg",
  "./projets/formulaire-inscription/enonce/lycee-rafha-niveau.docx",
  "./projets/formulaire-inscription/enonce/cvFleurs-énoncé/formulaire inscription.pdf",
  "./projets/formulaire-inscription/enonce/cvFleurs-énoncé/formulaire inscription.pdf.html",
  "./projets/formulaire-inscription/enonce/cvFleurs-énoncé/formulaire inscription.pdf.assets/page-01.jpg",
  "./projets/formulaire-inscription/enonce/cvFleurs-énoncé/formulaire inscription.pdf.assets/page-02.jpg",
  "./projets/fleurs/Corrections.html",
  "./projets/fleurs/affichage-condidat.php",
  "./projets/fleurs/ajout.php",
  "./projets/fleurs/controle.js",
  "./projets/fleurs/controlecorrection.js",
  "./projets/fleurs/index.html",
  "./projets/fleurs/inscription.html",
  "./projets/fleurs/mise-a-jour-condidat.php",
  "./projets/fleurs/stylecorrection.css",
  "./projets/fleurs/styles.css",
  "./projets/fleurs/media/Lyc",
  "./projets/fleurs/media/femme.jpg",
  "./projets/fleurs/media/fleur.png",
  "./projets/fleurs/media/flower.webm",
  "./projets/fleurs/media/formulaire1.png",
  "./projets/fleurs/media/formulaire2.png",
  "./projets/fleurs/media/formulaire3.png",
  "./projets/fleurs/media/homme.png",
  "./projets/fleurs/media/lesTextes.txt",
  "./projets/fleurs/media/logo.png",
  "./projets/fleurs/media/orchidee.jpg",
  "./projets/fleurs/media/pageindex.png",
  "./projets/fleurs/media/pivoine.jpg",
  "./projets/fleurs/media/projet-fleurs-3sti-corrige.docx",
  "./projets/fleurs/media/projet-fleurs-4sti-corrige.docx",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.docx",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.pdf",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.pdf.html",
  "./projets/fleurs/media/projet-fleurs.docx",
  "./projets/fleurs/media/tulipes.jpg",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.pdf.assets/page-01.jpg",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.pdf.assets/page-02.jpg",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.pdf.assets/page-03.jpg",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.pdf.assets/page-04.jpg",
  "./projets/fleurs/media/projet-fleurs-4sti-eleve.pdf.assets/page-05.jpg",
  "./projets/carte-bancaire/cb.html",
  "./projets/carte-bancaire/controle.js",
  "./projets/carte-bancaire/enonce-tp-carte-bancaire.html",
  "./projets/carte-bancaire/style.css",
  "./projets/carte-bancaire/media/STI_by_AE.ico",
  "./projets/carte-bancaire/media/cap1.png",
  "./projets/carte-bancaire/media/cap2.png",
  "./exercices/resume-fonctions-standards.html",
  "./exercices/series-exercices.html",
  "./exercices/sql/Tp-BD-Jointure-sous-requetes-Group-By.html",
  "./exercices/sql/Tp-GroupBy-bd.html",
  "./exercices/sql/Tp-date-ssr-j-gp-bd.html",
  "./exercices/sql/Tp-date-ssr-j-gp-correction-bd.html",
  "./exercices/sql/Tp1-bd.html",
  "./exercices/sql/Tp2-Correction-bd.html",
  "./exercices/sql/Tp2-bd.html",
  "./exercices/sql/Tp4-correction-bd.html",
  "./exercices/sql/atelier_sql_3_fenetres.html",
  "./exercices/sql/sql-controle.js",
  "./exercices/sql/sql-correction.html",
  "./exercices/sql/sql.html",
  "./exercices/php/Tp1-php.html",
  "./exercices/php/Tp2-Correction-php.html",
  "./exercices/php/Tp2-php.html",
  "./exercices/php/Tp3-correction-php.html",
  "./exercices/php/Tp3-php.html",
  "./exercices/php/Tp4-php.html",
  "./exercices/javascript/Tp1-Correction-js.html",
  "./exercices/javascript/Tp1-js.html",
  "./exercices/javascript/Tp2-Correction-js.html",
  "./exercices/javascript/Tp2-js.html",
  "./exercices/javascript/Tp3-Correction-js.html",
  "./exercices/javascript/Tp3-js.html",
  "./exercices/javascript/Tp4-Correction-js.html",
  "./exercices/javascript/Tp4-js.html",
  "./exercices/javascript/Tp5-Correction-js.html",
  "./exercices/javascript/Tp5-js.html",
  "./exercices/html-css/TP1-css.pdf",
  "./exercices/html-css/TP1-css.pdf.html",
  "./exercices/html-css/TP2-css.pdf",
  "./exercices/html-css/TP2-css.pdf.html",
  "./exercices/html-css/TP3-css.pdf",
  "./exercices/html-css/TP3-css.pdf.html",
  "./exercices/html-css/activite1-2-position-animation-css3.pdf",
  "./exercices/html-css/activite1-2-position-animation-css3.pdf.html",
  "./exercices/html-css/box-shadow-text-shadow-css3.html",
  "./exercices/html-css/formulaire-inscription.pdf",
  "./exercices/html-css/formulaire-inscription.pdf.html",
  "./exercices/html-css/formulaire-inscription.pdf.assets/page-01.jpg",
  "./exercices/html-css/formulaire-inscription.pdf.assets/page-02.jpg",
  "./exercices/html-css/emploi-temps/emploidutemps.html",
  "./exercices/html-css/activite1-2-position-animation-css3.pdf.assets/page-01.jpg",
  "./exercices/html-css/activite1-2-position-animation-css3.pdf.assets/page-02.jpg",
  "./exercices/html-css/activite1-2-position-animation-css3.pdf.assets/page-03.jpg",
  "./exercices/html-css/activite-html-css/Act2/page2.html",
  "./exercices/html-css/activite-html-css/Act2/style2.css",
  "./exercices/html-css/activite-html-css/Act1/page1.html",
  "./exercices/html-css/activite-html-css/Act1/style.css",
  "./exercices/html-css/TP3-css.pdf.assets/page-01.jpg",
  "./exercices/html-css/TP3-css.pdf.assets/page-02.jpg",
  "./exercices/html-css/TP2/style2.css",
  "./exercices/html-css/TP2/tp2corrposition.html",
  "./exercices/html-css/TP2-css.pdf.assets/page-01.jpg",
  "./exercices/html-css/TP2-css.pdf.assets/page-02.jpg",
  "./exercices/html-css/TP2-css.pdf.assets/page-03.jpg",
  "./exercices/html-css/TP1-css.pdf.assets/page-01.jpg",
  "./documents/complet/.gitkeep",
  "./documents/complet/complet-3eme-si-bd.pdf",
  "./documents/complet/complet-3eme-si-bd.pdf.html",
  "./documents/complet/complet-3eme-si.pdf",
  "./documents/complet/complet-3eme-si.pdf.html",
  "./documents/complet/complet-4eme-si-cours.pdf",
  "./documents/complet/complet-4eme-si-cours.pdf.html",
  "./documents/complet/complet-4eme-si-resume.pdf",
  "./documents/complet/complet-4eme-si-resume.pdf.html",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-01.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-02.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-03.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-04.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-05.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-06.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-07.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-08.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-09.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-10.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-11.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-12.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-13.jpg",
  "./documents/complet/complet-4eme-si-resume.pdf.assets/page-14.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-01.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-02.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-03.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-04.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-05.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-06.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-07.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-08.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-09.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-10.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-11.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-12.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-13.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-14.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-15.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-16.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-17.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-18.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-19.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-20.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-21.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-22.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-23.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-24.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-25.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-26.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-27.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-28.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-29.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-30.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-31.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-32.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-33.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-34.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-35.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-36.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-37.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-38.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-39.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-40.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-41.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-42.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-43.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-44.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-45.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-46.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-47.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-48.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-49.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-50.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-51.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-52.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-53.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-54.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-55.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-56.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-57.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-58.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-59.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-60.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-61.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-62.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-63.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-64.jpg",
  "./documents/complet/complet-4eme-si-cours.pdf.assets/page-65.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-01.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-02.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-03.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-04.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-05.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-06.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-07.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-08.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-09.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-10.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-11.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-12.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-13.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-14.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-15.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-16.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-17.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-18.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-19.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-20.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-21.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-22.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-23.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-24.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-25.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-26.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-27.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-28.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-29.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-30.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-31.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-32.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-33.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-34.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-35.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-36.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-37.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-38.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-39.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-40.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-41.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-42.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-43.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-44.jpg",
  "./documents/complet/complet-3eme-si.pdf.assets/page-45.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-01.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-02.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-03.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-04.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-05.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-06.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-07.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-08.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-09.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-10.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-11.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-12.jpg",
  "./documents/complet/complet-3eme-si-bd.pdf.assets/page-13.jpg",
  "./documents/annexes/annexe-css3.pdf",
  "./documents/annexes/annexe-css3.pdf.html",
  "./documents/annexes/annexe-html5.pdf",
  "./documents/annexes/annexe-html5.pdf.html",
  "./documents/annexes/annexe-javascript.pdf",
  "./documents/annexes/annexe-javascript.pdf.html",
  "./documents/annexes/annexe-php.pdf",
  "./documents/annexes/annexe-php.pdf.html",
  "./documents/annexes/annexe-sql.pdf",
  "./documents/annexes/annexe-sql.pdf.html",
  "./documents/annexes/annexe-sql.pdf.assets/page-01.jpg",
  "./documents/annexes/annexe-sql.pdf.assets/page-02.jpg",
  "./documents/annexes/annexe-sql.pdf.assets/page-03.jpg",
  "./documents/annexes/annexe-sql.pdf.assets/page-04.jpg",
  "./documents/annexes/annexe-sql.pdf.assets/page-05.jpg",
  "./documents/annexes/annexe-sql.pdf.assets/page-06.jpg",
  "./documents/annexes/annexe-sql.pdf.assets/page-07.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-01.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-02.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-03.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-04.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-05.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-06.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-07.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-08.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-09.jpg",
  "./documents/annexes/annexe-php.pdf.assets/page-10.jpg",
  "./documents/annexes/annexe-javascript.pdf.assets/page-01.jpg",
  "./documents/annexes/annexe-javascript.pdf.assets/page-02.jpg",
  "./documents/annexes/annexe-javascript.pdf.assets/page-03.jpg",
  "./documents/annexes/annexe-javascript.pdf.assets/page-04.jpg",
  "./documents/annexes/annexe-html5.pdf.assets/page-01.jpg",
  "./documents/annexes/annexe-html5.pdf.assets/page-02.jpg",
  "./documents/annexes/annexe-html5.pdf.assets/page-03.jpg",
  "./documents/annexes/annexe-html5.pdf.assets/page-04.jpg",
  "./documents/annexes/annexe-html5.pdf.assets/page-05.jpg",
  "./documents/annexes/annexe-html5.pdf.assets/page-06.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-01.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-02.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-03.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-04.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-05.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-06.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-07.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-08.jpg",
  "./documents/annexes/annexe-css3.pdf.assets/page-09.jpg",
  "./cssanimee/cours.js",
  "./cssanimee/index.html",
  "./cssanimee/style.css",
  "./cours/annexe-fleuriste-html5.html",
  "./cours/courscss3.html",
  "./cours/courshtml5.html",
  "./cours/coursphp.html",
  "./cours/css3.html",
  "./cours/datalist.html",
  "./cours/fiche-revision-html5.html",
  "./cours/html5.html",
  "./cours/javascript.html",
  "./cours/php-mysqli.html",
  "./cours/php.html",
  "./cours/sql-bases-ldd-lmd-lcd.html",
  "./cours/sql.html",
  "./assets/video/flower.webm",
  "./assets/js/acces.js",
  "./assets/js/admin.js",
  "./assets/js/config.js",
  "./assets/js/portail.js",
  "./assets/js/protection.js",
  "./assets/js/supabase-umd.js",
  "./assets/images/JavaScript_logo.svg",
  "./assets/images/carte-visite-sti-v2.png",
  "./assets/images/lycee_logo.png",
  "./assets/images/qr-code-site.png",
  "./assets/images/qr-stiv2.png",
  "./assets/icons/STI_by_AE.ico",
  "./assets/icons/sti-icon-192.png",
  "./assets/icons/sti-icon-512.png",
  "./assets/fonts/baloo-2-latin-ext.woff2",
  "./assets/fonts/baloo-2-latin.woff2",
  "./assets/fonts/fonts.css",
  "./assets/fonts/jetbrains-mono-latin-ext.woff2",
  "./assets/fonts/jetbrains-mono-latin.woff2",
  "./assets/fonts/manrope-latin-ext.woff2",
  "./assets/fonts/manrope-latin.woff2",
  "./assets/fontawesome/LICENSE.txt",
  "./assets/fontawesome/webfonts/fa-brands-400.woff2",
  "./assets/fontawesome/webfonts/fa-regular-400.woff2",
  "./assets/fontawesome/webfonts/fa-solid-900.woff2",
  "./assets/fontawesome/css/all.min.css",
  "./assets/css/atelier-pages.css",
  "./assets/css/atelier-php.css",
  "./assets/css/atelier.css",
  "./assets/css/css.css",
  "./assets/css/html.css",
  "./assets/css/js.css",
  "./assets/css/php.css",
  "./assets/css/protection.css",
  "./assets/css/sql.css",
  "./assets/css/tailwind.css",
  "./assets/audio/foret.mp3",
  "./assets/assets/fontawesome/LICENSE.txt",
  "./assets/assets/fontawesome/webfonts/fa-brands-400.woff2",
  "./assets/assets/fontawesome/webfonts/fa-regular-400.woff2",
  "./assets/assets/fontawesome/webfonts/fa-solid-900.woff2",
  "./assets/assets/fontawesome/css/all.min.css",
  "./assets/assets/css/tailwind.css",
  "./Positionnement-animee/bonus-flex.css",
  "./Positionnement-animee/cours.js",
  "./Positionnement-animee/index.html",
  "./Positionnement-animee/style.css",
  "./Positionnement-animee/verif-annexes.py",
  "./Positionnement-animee/uploads/Annexe CSS3 By A.E.pdf",
  "./Positionnement-animee/uploads/Annexe HTML5 By A.E.pdf"
];

var precacheEnCours = false;

async function prechargerSequentiel() {
  if (precacheEnCours) return;
  precacheEnCours = true;
  try {
    var cache = await caches.open(CACHE);
    var total = OFFLINE_LIST.length;
    var done = 0;
    for (var i = 0; i < total; i++) {
      var u = OFFLINE_LIST[i];
      try {
        var ex = await cache.match(u, { ignoreSearch: true });
        if (!ex) {
          var rep = await fetch(u);
          if (rep && rep.ok) await cache.put(u, rep);
        }
      } catch (e) {}
      done++;
      if (done % 10 === 0 || done === total) {
        var clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (var c of clients) {
          c.postMessage({ type: "STI_OFFLINE_PROGRESS", done: done, total: total });
        }
      }
    }
  } catch (e) {}
  precacheEnCours = false;
}

self.addEventListener("install", function (evt) {
  self.skipWaiting();
  evt.waitUntil(
    caches
      .open(CACHE)
      .then(function (c) {
        return c.addAll(SHELL);
      })
      .catch(function () {})
  );
});

self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches
      .keys()
      .then(function (cles) {
        return Promise.all(
          cles
            .filter(function (k) {
              return k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("message", function (evt) {
  if (!evt.data) return;
  if (evt.data.type === "PRECACHE_ALL") {
    prechargerSequentiel();
  }
});

self.addEventListener("fetch", function (evt) {
  var req = evt.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Pages (navigation et documents HTML/iframes) : réseau d'abord, cache exact en secours hors-ligne */
  if (req.mode === "navigate" || /\.html$/i.test(url.pathname)) {
    evt.respondWith(
      fetch(req)
        .then(function (rep) {
          if (rep && rep.ok) {
            var copie = rep.clone();
            caches.open(CACHE).then(function (c) {
              c.put(req, copie);
            });
          }
          return rep;
        })
        .catch(function () {
          return caches.match(req, { ignoreSearch: true }).then(function (m) {
            return m || Response.error();
          });
        })
    );
    return;
  }

  /* Scripts et feuilles de style : réseau d'abord (toujours à jour), cache hors-ligne */
  if (/\.(css|js|webmanifest)$/i.test(url.pathname)) {
    evt.respondWith(
      fetch(req)
        .then(function (rep) {
          if (rep && rep.ok) {
            var copie = rep.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copie); });
          }
          return rep;
        })
        .catch(function () {
          return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || Response.error(); });
        })
    );
    return;
  }

  /* Médias, PDF et polices : cache d'abord puis réseau */
  if (/\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|mp3|webm|pdf)$/i.test(url.pathname)) {
    evt.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (m) {
        var reseau = fetch(req)
          .then(function (rep) {
            if (rep && rep.ok) {
              var copie = rep.clone();
              caches.open(CACHE).then(function (c) { c.put(req, copie); });
            }
            return rep;
          })
          .catch(function () {
            return m || Response.error();
          });
        return m || reseau;
      })
    );
  }
});
