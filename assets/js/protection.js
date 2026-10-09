/* ══════════════════════════════════════════════════════════
   🔒 Protection du contenu — Plateforme STI par A. Essouyah
   Couches de dissuasion : clic droit, copier/couper, raccourcis
   clavier, PrintScreen, glisser-déposer, outils de développement,
   filigrane et blocage d'impression.
   👑 Exception Administrateur & Compte GOLD :
   L'administrateur (par défaut, toujours Gold) ainsi que tout abonné
   ayant reçu le statut 👑 Gold ont la capture d'écran, la copie et
   l'impression intégralement débloquées.
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var MSG_PROTECT =
    "\uD83D\uDD12 Contenu protégé \u00A9 A. Essouyah \u2014 copie et captures non autorisées";

  /* Détecte immédiatement (0 ms) si l'utilisateur connecté est l'Admin, la classe elevelabo3 ou un compte Gold */
  function estGoldActif() {
    try {
      if (window.__STI_GOLD === true) return true;
      if (window.top && window.top !== window && window.top.__STI_GOLD === true) return true;
      if (localStorage.getItem("sti-gold") === "1" || localStorage.getItem("sti-admin-gold") === "1") {
        return true;
      }
      var permLab = JSON.parse(localStorage.getItem("sti-labo3-permanent") || "null");
      var cSess = permLab || JSON.parse(localStorage.getItem("sti-session-cache") || "null");
      if (cSess) {
        var clNorm = String(cSess.classe || "").trim().toLowerCase();
        try { clNorm = clNorm.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
        clNorm = clNorm.replace(/[\s._\-]+/g, "");
        if (cSess.gold === true || cSess.isAdmin === true || clNorm === "elevelabo3") {
          localStorage.setItem("sti-gold", "1");
          window.__STI_GOLD = true;
          return true;
        }
      }
      var adminEmail = (
        (window.STI_AUTH && window.STI_AUTH.ADMIN) ||
        "aymenessouyah@gmail.com"
      ).toLowerCase();
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i) || "";
        if (k.indexOf("sb-") === 0 || k === "sti-cred") {
          var v = (localStorage.getItem(k) || "").toLowerCase();
          if (v.indexOf(adminEmail) !== -1) {
            localStorage.setItem("sti-gold", "1");
            localStorage.setItem("sti-admin-gold", "1");
            window.__STI_GOLD = true;
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  function synchroniserDomGold() {
    var ok = estGoldActif();
    if (document.documentElement) document.documentElement.classList.toggle("sti-gold", ok);
    if (document.body) document.body.classList.toggle("sti-gold", ok);

    /* Désactive complètement la feuille protection.css pour l'Admin et les comptes Gold */
    try {
      var liens = document.querySelectorAll('link[href*="protection.css"]');
      for (var i = 0; i < liens.length; i++) {
        liens[i].disabled = ok;
      }
    } catch (e) {}

    var wm = document.getElementById("sti-watermark");
    var pm = document.getElementById("sti-print-msg");
    if (ok) {
      if (wm && wm.parentNode) wm.parentNode.removeChild(wm);
      if (pm && pm.parentNode) pm.parentNode.removeChild(pm);
      var stOvr = document.getElementById("sti-gold-override");
      if (!stOvr && document.head) {
        stOvr = document.createElement("style");
        stOvr.id = "sti-gold-override";
        stOvr.textContent =
          "html.sti-gold body,html.sti-gold body *,body.sti-gold,body.sti-gold *{-webkit-user-select:text!important;-moz-user-select:text!important;user-select:text!important}" +
          "html.sti-gold img,body.sti-gold img{-webkit-user-drag:auto!important;user-drag:auto!important}" +
          "#sti-watermark,#sti-print-msg,#sti-devtools-overlay{display:none!important}" +
          "@media print{.sti-no-print,#sti-watermark,#sti-print-msg,#sti-devtools-overlay,#sti-toast{display:none!important}}";
        document.head.appendChild(stOvr);
      }
    } else {
      var stOvrOff = document.getElementById("sti-gold-override");
      if (stOvrOff && stOvrOff.parentNode) stOvrOff.parentNode.removeChild(stOvrOff);
      if ( document.body ) {
        installWatermark();
        installPrintBlock();
      }
    }
    return ok;
  }

  /* Exécution immédiate dès le chargement du script */
  synchroniserDomGold();

  window.addEventListener("storage", function (e) {
    if (e && (e.key === "sti-gold" || e.key === "sti-admin-gold")) {
      synchroniserDomGold();
    }
  });
  window.addEventListener("beforeprint", function () {
    synchroniserDomGold();
  });

  /* ─────────────────────────────────────────────
     Toast d'avertissement
     ───────────────────────────────────────────── */
  var toastEl = null;
  var toastTimer = null;
  function toast(msg) {
    if (estGoldActif()) return;
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
     1) Clic droit bloqué (sauf Admin / Compte GOLD ou champs de formulaire)
     ───────────────────────────────────────────── */
  document.addEventListener("contextmenu", function (e) {
    if (synchroniserDomGold()) return;
    var t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    e.preventDefault();
    toast();
  });

  /* ─────────────────────────────────────────────
     2) Copier / couper bloqués (sauf Admin / Compte GOLD)
     ───────────────────────────────────────────── */
  ["copy", "cut"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (synchroniserDomGold()) return;
      e.preventDefault();
      toast();
    });
  });

  /* ─────────────────────────────────────────────
     3) Raccourcis clavier bloqués (sauf Admin / Compte GOLD)
        F12 · Ctrl/Cmd+Shift+I/J/C · Ctrl/Cmd+S/P/U/C/X/A
        PrintScreen → presse-papiers vidé si compte standard
     ───────────────────────────────────────────── */
  document.addEventListener(
    "keydown",
    function (e) {
      if (synchroniserDomGold()) return; /* 👑 Admin & Compte Gold : tout est autorisé (copier, imprimer, capturer) */
      var k = (e.key || "").toLowerCase();
      var mod = e.ctrlKey || e.metaKey;
      var bloque = false;

      if (k === "printscreen") {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("").catch(function () {});
          }
        } catch (err) {}
        toast("\uD83D\uDEAB Capture d'écran non autorisée \u2014 contenu protégé");
        bloque = true;
      } else if (k === "f12") {
        bloque = true;
      } else if (mod && e.shiftKey && (k === "i" || k === "j" || k === "c")) {
        bloque = true;
      } else if (
        mod &&
        (k === "s" || k === "p" || k === "u" || k === "c" || k === "x" || k === "a")
      ) {
        bloque = true;
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
     4) Glisser-déposer bloqué (sauf Admin / Compte GOLD)
     ───────────────────────────────────────────── */
  document.addEventListener("dragstart", function (e) {
    if (synchroniserDomGold()) return;
    e.preventDefault();
  });

  /* ─────────────────────────────────────────────
     5) Filigrane + message d'impression (uniquement comptes standards)
     ───────────────────────────────────────────── */
  function installWatermark() {
    if (estGoldActif()) return;
    if (document.getElementById("sti-watermark")) return;
    var wm = document.createElement("div");
    wm.id = "sti-watermark";
    wm.setAttribute("aria-hidden", "true");
    document.body.appendChild(wm);
  }

  function installPrintBlock() {
    if (estGoldActif()) return;
    if (document.getElementById("sti-print-msg")) return;
    var box = document.createElement("div");
    box.id = "sti-print-msg";
    box.innerHTML =
      '<div class="sti-print-ico" aria-hidden="true">\uD83D\uDD12</div>' +
      '<div class="sti-print-title">Contenu protégé \u00A9 A. Essouyah</div>' +
      '<div class="sti-print-txt">' +
      "L\u2019impression et la capture d\u2019écran de cette plateforme ne sont pas autoris\u00E9es." +
      "<br>Consultez le cours directement sur le site : aymenessouyah.github.io/STiV2.0" +
      "</div>";
    document.body.appendChild(box);
  }

  /* ─────────────────────────────────────────────
     6) Détection des outils de développement
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
    if (synchroniserDomGold()) {
      if (devOverlay) devOverlay.classList.remove("visible");
      return;
    }
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
    if (!synchroniserDomGold()) {
      installWatermark();
      installPrintBlock();
    }
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
