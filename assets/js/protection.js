/* ══════════════════════════════════════════════════════════
   🔒 Protection du contenu — Plateforme STI par A. Essouyah
   Couches de dissuasion : clic droit, copier/couper, raccourcis
   clavier, PrintScreen, glisser-déposer, outils de développement,
   filigrane et blocage d'impression.
   👑 Exception Compte GOLD : si l'administrateur a accordé le
   statut Gold à l'abonné, la capture d'écran, l'impression et
   la sélection/copie sont automatiquement déverrouillées.
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var MSG_PROTECT =
    "\uD83D\uDD12 Contenu protégé \u00A9 A. Essouyah \u2014 copie et captures non autorisées";

  function estGoldActif() {
    try {
      if (window.__STI_GOLD === true) return true;
      if (window.top && window.top !== window && window.top.__STI_GOLD === true) return true;
      if (localStorage.getItem("sti-gold") === "1") return true;
    } catch (e) {}
    return false;
  }

  function synchroniserDomGold() {
    var ok = estGoldActif();
    if (document.documentElement) document.documentElement.classList.toggle("sti-gold", ok);
    if (document.body) document.body.classList.toggle("sti-gold", ok);
    var wm = document.getElementById("sti-watermark");
    if (wm) wm.style.display = ok ? "none" : "";
    var pm = document.getElementById("sti-print-msg");
    if (pm) pm.style.display = "none";
    return ok;
  }

  window.addEventListener("storage", function (e) {
    if (e && e.key === "sti-gold") synchroniserDomGold();
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
     1) Clic droit bloqué (sauf Compte GOLD ou champs de formulaire)
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
     2) Copier / couper bloqués (sauf Compte GOLD)
     ───────────────────────────────────────────── */
  ["copy", "cut"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (synchroniserDomGold()) return;
      e.preventDefault();
      toast();
    });
  });

  /* ─────────────────────────────────────────────
     3) Raccourcis clavier bloqués (sauf Compte GOLD pour PrintScreen, Ctrl+P, Ctrl+C/A/S)
        F12 · Ctrl/Cmd+Shift+I/J/C · Ctrl/Cmd+S/P/U/C/X/A
        PrintScreen → presse-papiers vidé si compte standard
     ───────────────────────────────────────────── */
  document.addEventListener(
    "keydown",
    function (e) {
      var gold = synchroniserDomGold();
      var k = (e.key || "").toLowerCase();
      var mod = e.ctrlKey || e.metaKey;
      var bloque = false;

      if (k === "printscreen") {
        if (gold) return; /* 👑 Compte Gold : capture d'écran autorisée */
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("").catch(function () {});
          }
        } catch (err) {}
        toast("\uD83D\uDEAB Capture d'écran non autorisée \u2014 contenu protégé");
        bloque = true;
      } else if (mod && (k === "p" || k === "c" || k === "a" || k === "s")) {
        if (gold) return; /* 👑 Compte Gold : impression (Ctrl+P) et copie autorisées */
        bloque = true;
      } else if (k === "f12") {
        if (gold) return;
        bloque = true;
      } else if (mod && e.shiftKey && (k === "i" || k === "j" || k === "c")) {
        if (gold) return;
        bloque = true;
      } else if (mod && (k === "u" || k === "x")) {
        if (gold) return;
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
     4) Glisser-déposer bloqué (sauf Compte GOLD)
     ───────────────────────────────────────────── */
  document.addEventListener("dragstart", function (e) {
    if (synchroniserDomGold()) return;
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
    installWatermark();
    installPrintBlock();
    synchroniserDomGold();
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
