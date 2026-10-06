let card = document.getElementById("card");
let cardNumber = document.getElementById("cardNumber");
let cardName = document.getElementById("cardName");
let cardExpiry = document.getElementById("cardExpiry");
let cardCvv = document.getElementById("cardCvv");
let expiryMsg = document.getElementById("expiryErreur");
let cvvMsg = document.getElementById("cvvErreur");
let nomCompt = document.getElementById("nomCompteur");

/* =========================================================
     Utilitaire : ne garder QUE les chiffres, avec limite
     ========================================================= */
function garderChiffres(texte, max) {
  let resultat = "";
  for (let i = 0; i < texte.length; i++) {
    let c = texte.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      if (resultat.length < max) {
        resultat = resultat + texte[i];
      }
    }
  }
  return resultat;
}

/* =========================================================
     Utilitaire : ne garder QUE les lettres + espaces
     ========================================================= */
function garderLettresEtEspaces(texte, max) {
  let resultat = "";
  for (let i = 0; i < texte.length; i++) {
    let c = texte.charCodeAt(i);

    let estLettre =
      (c >= 65 && c <= 90) ||
      (c >= 97 && c <= 122) ||
      (c >= 192 && c <= 255) ||
      c === 338 ||
      c === 339 ||
      c === 352 ||
      c === 353 ||
      c === 376 ||
      c === 381 ||
      c === 382;

    let estEspace = c === 32;

    if (estLettre || estEspace) {
      if (resultat.length < max) {
        resultat = resultat + texte[i];
      }
    }
  }
  return resultat;
}

/* =========================================================
     Utilitaire : réduire les espaces multiples à un seul
     SANS toucher aux espaces de début / fin
     ========================================================= */
function reduireEspacesMultiples(texte) {
  let resultat = "";
  let dernierEtaitEspace = false;

  for (let i = 0; i < texte.length; i++) {
    let c = texte[i];
    let estEspace = c === " ";

    if (estEspace) {
      if (dernierEtaitEspace === false) {
        resultat = resultat + " ";
      }
      dernierEtaitEspace = true;
    } else {
      resultat = resultat + c;
      dernierEtaitEspace = false;
    }
  }
  return resultat;
}

/* =========================================================
     Utilitaire : supprimer les espaces en début et fin
     (utilisé uniquement au blur)
     ========================================================= */
function supprimerEspacesExtremes(texte) {
  let debut = 0;
  let fin = texte.length;

  // Avancer tant qu'on a des espaces au début
  while (debut < fin && texte[debut] === " ") {
    debut = debut + 1;
  }
  // Reculer tant qu'on a des espaces à la fin
  while (fin > debut && texte[fin - 1] === " ") {
    fin = fin - 1;
  }

  let resultat = "";
  for (let i = debut; i < fin; i++) {
    resultat = resultat + texte[i];
  }
  return resultat;
}

/* =========================================================
     Utilitaire : convertir chaîne en nombre
     ========================================================= */
function versNombre(texte) {
  let valeur = 0;
  for (let i = 0; i < texte.length; i++) {
    let c = texte.charCodeAt(i) - 48;
    if (c >= 0 && c <= 9) {
      valeur = valeur * 10 + c;
    }
  }
  return valeur;
}

/* =========================================================
     Numéro de carte
     ========================================================= */
function majNumero(input) {
  let chiffres = garderChiffres(input.value, 16);

  let formate = "";
  for (let i = 0; i < chiffres.length; i++) {
    if (i > 0 && i % 4 === 0) {
      formate = formate + " ";
    }
    formate = formate + chiffres[i];
  }
  input.value = formate;

  let affichage = formate;
  while (affichage.length < 19) {
    affichage = affichage + "#";
  }
  cardNumber.textContent = affichage;
}

/* =========================================================
     Nom du titulaire — pendant la frappe :
     - on garde les lettres et les espaces
     - on réduit les espaces multiples à 1 SEUL
       (mais on N'ENLÈVE PAS un espace final tant que l'utilisateur
       est en train de taper → il peut continuer à saisir le mot suivant)
     - on limite à 20 caractères
     ========================================================= */
function majNom(input) {
  // 1. Garde lettres + espaces (limite large pour permettre le nettoyage)
  let brut = garderLettresEtEspaces(input.value, 30);

  // 2. Réduction des espaces multiples à un seul
  //    (on NE supprime PAS les espaces début/fin ici)
  let reduit = reduireEspacesMultiples(brut);

  // 3. Troncature à 20 caractères
  let valeur = "";
  for (let i = 0; i < reduit.length && i < 20; i++) {
    valeur = valeur + reduit[i];
  }

  // 4. Réécriture de l'input
  input.value = valeur;
  nomCompt.textContent = valeur.length + " / 20";

  // 5. Affichage carte : on retire les espaces extrêmes UNIQUEMENT pour l'affichage
  let pourCarte = supprimerEspacesExtremes(valeur);

  if (pourCarte.length === 0) {
    cardName.textContent = "NOM PRÉNOM";
  } else {
    cardName.textContent = pourCarte.toUpperCase();
  }
}

/* =========================================================
     Nom du titulaire — au blur :
     - on nettoie les espaces en début et fin
     - la valeur finale est propre
     ========================================================= */
function finaliserNom(input) {
  let propre = supprimerEspacesExtremes(input.value);

  // Troncature à 20
  let valeur = "";
  for (let i = 0; i < propre.length && i < 20; i++) {
    valeur = valeur + propre[i];
  }

  input.value = valeur;
  nomCompt.textContent = valeur.length + " / 20";

  if (valeur.length === 0) {
    cardName.textContent = "NOM PRÉNOM";
  } else {
    cardName.textContent = valeur.toUpperCase();
  }
}

/* =========================================================
     Expiration : '/' inséré après le mois
     ========================================================= */
function majExpiry(input) {
  let chiffres = garderChiffres(input.value, 4);

  let moisTexte = "";
  for (let i = 0; i < chiffres.length && i < 2; i++) {
    moisTexte = moisTexte + chiffres[i];
  }
  let mois = versNombre(moisTexte);

  let erreur = "";
  if (moisTexte.length === 1) {
    if (moisTexte !== "0" && moisTexte !== "1") {
      erreur = "Le mois doit être entre 01 et 12";
    }
  } else if (moisTexte.length === 2) {
    if (mois < 1 || mois > 12) {
      erreur = "Le mois doit être entre 01 et 12";
    }
  }

  let anneeTexte = "";
  for (let j = 2; j < chiffres.length; j++) {
    anneeTexte = anneeTexte + chiffres[j];
  }

  if (erreur === "" && anneeTexte.length === 2 && moisTexte.length === 2) {
    let annee = versNombre(anneeTexte);
    let dateSysteme = new Date();
    let anneeSysteme = dateSysteme.getFullYear() % 100;
    let moisSysteme = dateSysteme.getMonth() + 1;

    if (
      annee < anneeSysteme ||
      (annee === anneeSysteme && mois < moisSysteme)
    ) {
      erreur = "La carte est expirée";
    }
  }

  // Construction affichage avec '/' après le mois
  let affichageInput = "";
  for (let k = 0; k < chiffres.length; k++) {
    if (k === 2) {
      affichageInput = affichageInput + "/";
    }
    affichageInput = affichageInput + chiffres[k];
  }
  input.value = affichageInput;

  expiryMsg.textContent = erreur;
  input.className = erreur !== "" ? "erreur" : "";

  if (erreur === "" && moisTexte.length === 2 && anneeTexte.length === 2) {
    cardExpiry.textContent = moisTexte + "/" + anneeTexte;
  } else {
    cardExpiry.textContent = "MM/AA";
  }
}

/* =========================================================
     CVV
     ========================================================= */
function majCvv(input) {
  let chiffres = garderChiffres(input.value, 3);
  input.value = chiffres;
  cardCvv.textContent = chiffres.length > 0 ? chiffres : "•••";

  let erreur = "";
  if (chiffres.length > 0 && chiffres.length < 3) {
    erreur = "Le CVV doit contenir exactement 3 chiffres";
    input.className = "erreur";
  } else {
    input.className = "";
  }
  cvvMsg.textContent = erreur;
}

/* =========================================================
     Retournement 3D
     ========================================================= */
function retournerCarte() {
  card.style.transform = "rotateY(180deg)";
}

function remettreCarte() {
  card.style.transform = "rotateY(0deg)";

  let cvvInput = document.getElementById("cvv");
  let chiffres = garderChiffres(cvvInput.value, 3);
  if (chiffres.length > 0 && chiffres.length < 3) {
    cvvMsg.textContent = "Le CVV doit contenir exactement 3 chiffres";
    cvvInput.className = "erreur";
  }
}
