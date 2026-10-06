# 🔎 Déclarer le site STI à Google — Google Search Console

> Site : `https://aymenessouyah.github.io/STi/`
> Prérequis déjà en place ✅ : `sitemap.xml` (64 pages) + `robots.txt` qui **autorise Google**
> (le blocage ne vise que les robots IA). Temps total : ~5 minutes.

---

## Étape 1 — Ouvrir Search Console

1. Allez sur : **https://search.google.com/search-console**
2. Connectez-vous avec votre compte Google (n'importe lequel, par exemple votre Gmail).

## Étape 2 — Ajouter le site

1. Dans le menu de gauche, cliquez sur **« Ajouter une propriété »** (ou le sélecteur en haut à gauche).
2. Choisissez le type **« Préfixe de l'URL »** (colonne de droite), et collez :
   ```
   https://aymenessouyah.github.io/STi/
   ```
3. Cliquez sur **« Continuer »**.

## Étape 3 — Vérifier que le site vous appartient

Google propose plusieurs méthodes. Les deux plus simples avec GitHub Pages :

### Méthode A — Balise HTML (recommandée, je peux la faire pour vous)
1. Choisissez **« Balise HTML »** : Google affiche une ligne du type :
   ```html
   <meta name="google-site-verification" content="XXXX...XXXX" />
   ```
2. **Copiez-moi cette ligne exacte dans le chat** : je l'ajoute à votre `index.html` et je la pousse sur GitHub (2 minutes).
3. Revenez sur Search Console et cliquez sur **« Vérifier »**. ✅

### Méthode B — Fichier HTML (je peux aussi la faire pour vous)
1. Choisissez **« Fichier HTML »** : Google vous fait télécharger un fichier nommé
   `google1234abcd....html`.
2. **Donnez-moi son contenu** (ouvrez-le : c'est une seule ligne) : je le dépose à la racine
   du site et je pousse.
3. Cliquez sur **« Vérifier »**. ✅

> ⚠️ Évitez la méthode « Fournisseur de nom de domaine » (DNS) : elle ne fonctionne pas avec GitHub Pages.

## Étape 4 — Déclarer le sitemap

Une fois la vérification réussie :

1. Dans le menu de gauche : **« Sitemaps »**.
2. Dans le champ « Ajouter un sitemap », tapez : `sitemap.xml`
3. Cliquez sur **« Envoyer »**.
   → Le statut passera à **« Réussite »** et Google découvrira vos 64 pages.

## Étape 5 — (Facultatif) Accélérer l'indexation de la page d'accueil

1. En haut, collez `https://aymenessouyah.github.io/STi/` dans **« Inspection des URL »**.
2. Cliquez sur **« Demander l'indexation »**.

---

## Après ?

- Sous **2 à 7 jours**, votre site apparaîtra dans Google quand un élève cherchera
  « cours STI », « exercice SQL », etc.
- Dans Search Console, vous verrez combien de fois le site est vu et cliqué 📈.
- Aucune action régulière n'est nécessaire : le sitemap se met à jour tout seul à chaque
  nouvelle page que vous ajoutez.

> 🔒 Rappel : votre protection anti-IA reste active. Google Search Console n'autorise
> **que Google** à indexer — les robots IA (GPTBot, ClaudeBot, etc.) restent bloqués par
> `robots.txt` et les balises `noai`.
