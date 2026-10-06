/* ══════════════════════════════════════════════════════════
   🔒 Protection du contenu — Plateforme STI par A. Essouyah
   Couches de dissuasion : clic droit, copier/couper, raccourcis
   clavier, PrintScreen, glisser-déposer, outils de développement,
   filigrane et blocage d'impression.
   NB : aucune protection côté client n'est absolue ; l'objectif est
   de décourager la copie facile et de marquer toute capture.
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var MSG_PROTECT =
    "\uD83D\uDD12 Contenu protégé \u00A9 A. Essouyah \u2014 copie et captures non autorisées";

  /* ─────────────────────────────────────────────
     Toast d'avertissement
     ───────────────────────────────────────────── */
  var toastEl = null;
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "sti-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg || MSG_PROTECT;
    toastEl.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("visible");
    }, 2400);
  }

  /* ─────────────────────────────────────────────
     1) Clic droit bloqué (sauf champs de formulaire)
     ───────────────────────────────────────────── */
  document.addEventListener("contextmenu", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    e.preventDefault();
    toast();
  });

  /* ─────────────────────────────────────────────
     2) Copier / couper bloqués
     ───────────────────────────────────────────── */
  ["copy", "cut"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      e.preventDefault();
      toast();
    });
  });

  /* ─────────────────────────────────────────────
     3) Raccourcis clavier bloqués
        F12 · Ctrl/Cmd+Shift+I/J/C · Ctrl/Cmd+S/P/U/C/X/A
        PrintScreen → presse-papiers vidé
     ───────────────────────────────────────────── */
  document.addEventListener(
    "keydown",
    function (e) {
      var k = (e.key || "").toLowerCase();
      var mod = e.ctrlKey || e.metaKey;
      var bloque = false;

      if (k === "printscreen") {
        // Tente de vider le presse-papiers pour effacer la capture
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("").catch(function () {});
          }
        } catch (err) {
          /* non supporté */
        }
        toast("\uD83D\uDEAB Capture d'écran non autorisée \u2014 contenu protégé");
        bloque = true;
      } else if (k === "f12") {
        bloque = true;
      } else if (mod && e.shiftKey && (k === "i" || k === "j" || k === "c")) {
        bloque = true; // DevTools
      } else if (
        mod &&
        (k === "s" || k === "p" || k === "u" || k === "c" || k === "x" || k === "a")
      ) {
        bloque = true; // enregistrer / imprimer / code source / copier / couper / tout sélectionner
      }

      if (bloque) {
        e.preventDefault();
        e.stopPropagation();
        if (k !== "printscreen") toast();
      }
    },
    true
  );

  /* ─────────────────────────────────────────────
     4) Glisser-déposer bloqué (images, etc.)
     ───────────────────────────────────────────── */
  document.addEventListener("dragstart", function (e) {
    e.preventDefault();
  });

  /* ─────────────────────────────────────────────
     5) Filigrane + message d'impression
     ───────────────────────────────────────────── */
  function installWatermark() {
    if (document.getElementById("sti-watermark")) return;
    var wm = document.createElement("div");
    wm.id = "sti-watermark";
    wm.setAttribute("aria-hidden", "true");
    document.body.appendChild(wm);
  }

  function installPrintBlock() {
    if (document.getElementById("sti-print-msg")) return;
    var box = document.createElement("div");
    box.id = "sti-print-msg";
    box.innerHTML =
      '<div class="sti-print-ico" aria-hidden="true">\uD83D\uDD12</div>' +
      '<div class="sti-print-title">Contenu protégé \u00A9 A. Essouyah</div>' +
      '<div class="sti-print-txt">' +
      "L\u2019impression et la capture d\u2019écran de cette plateforme ne sont pas autoris\u00E9es." +
      "<br>Consultez le cours directement sur le site : aymenessouyah.github.io/STi" +
      "</div>";
    document.body.appendChild(box);
  }

  /* ─────────────────────────────────────────────
     6) Détection des outils de développement
        (heuristique taille de fenêtre, bureau uniquement)
     ───────────────────────────────────────────── */
  var devOverlay = null;
  var devDismissed = false;

  function ensureDevOverlay() {
    if (devOverlay) return devOverlay;
    devOverlay = document.createElement("div");
    devOverlay.id = "sti-devtools-overlay";
    devOverlay.innerHTML =
      '<div class="sti-dev-box">' +
      '<div class="sti-dev-ico" aria-hidden="true">\uD83D\uDEE1\uFE0F</div>' +
      '<div class="sti-dev-title">Outils de développement désactivés</div>' +
      '<div class="sti-dev-txt">Cette plateforme est protégée : la copie du code et du contenu' +
      " n\u2019est pas autoris\u00E9e. Merci de fermer les outils de développement pour continuer la lecture.</div>" +
      '<button type="button" class="sti-dev-btn">J\u2019ai compris</button>' +
      "</div>";
    devOverlay.querySelector(".sti-dev-btn").addEventListener("click", function () {
      devDismissed = true;
      devOverlay.classList.remove("visible");
    });
    document.body.appendChild(devOverlay);
    return devOverlay;
  }

  function checkDevtools() {
    // Uniquement sur bureau (souris/précision), pour éviter les faux positifs mobiles
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    var w = window.outerWidth - window.innerWidth;
    var h = window.outerHeight - window.innerHeight;
    var ouvert = w > 180 || h > 180;
    if (ouvert && !devDismissed) {
      ensureDevOverlay().classList.add("visible");
    } else if (!ouvert && devOverlay) {
      devOverlay.classList.remove("visible");
    }
  }

  /* ─────────────────────────────────────────────
     Mise en place au chargement
     ───────────────────────────────────────────── */
  function init() {
    installWatermark();
    installPrintBlock();
    checkDevtools();
    window.addEventListener("resize", checkDevtools);
    setInterval(checkDevtools, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
