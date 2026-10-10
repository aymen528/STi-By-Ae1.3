/* STI v2 — verrou d'accès temps réel + mode Compte GOLD + progression élève + quiz auto + contrôle chronométré + réponses élèves
   Chargé sur toutes les pages SAUF portail.html et admin.html. */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  if (!cfg || cfg.URL.indexOf("https://") !== 0) return;
  var chemin = location.pathname.split("/").pop() || "index.html";
  if (chemin === "portail.html" || chemin === "admin.html") return;

  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
  var PORTAIL = cfg.RACINE + "portail.html";
  var CANAL_DIFFUSION = "sti_v2_diffusion_9482";
  var enSortie = false;
  var currentUid = null;
  var currentClasse = "";

  /* S'assurer que protection.css et protection.js sont chargés sur 100 % des pages (code source verrouillé pour tous les abonnés) */
  (function assurerProtectionActive() {
    try {
      if (!document.querySelector('link[href*="protection.css"]') && document.head) {
        var lnk = document.createElement("link");
        lnk.rel = "stylesheet";
        lnk.href = cfg.RACINE + "assets/css/protection.css";
        document.head.appendChild(lnk);
      }
      if (!document.querySelector('script[src*="protection.js"]') && (document.head || document.documentElement)) {
        var scr = document.createElement("script");
        scr.src = cfg.RACINE + "assets/js/protection.js?v=80";
        scr.defer = true;
        (document.head || document.documentElement).appendChild(scr);
      }
    } catch (e) {}
  })();

  /* Enregistrement du Service Worker et pré-chargement automatique en arrière-plan pour le mode 100 % Hors-ligne (PC Windows & Mobile) */
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(cfg.RACINE + "sw.js").then(function (reg) {
        if (reg) reg.update().catch(function () {});
        setTimeout(function () {
          try {
            var swTarget = (reg && reg.active) || navigator.serviceWorker.controller;
            if (swTarget && navigator.onLine) {
              swTarget.postMessage({ type: "PRECACHE_ALL" });
            }
          } catch (e) {}
        }, 2000);
      }).catch(function () {});
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        try {
          if (sessionStorage.getItem("sti-sw-reload-80") === "1") return;
          sessionStorage.setItem("sti-sw-reload-80", "1");
        } catch (e) {}
        location.reload();
      });
    }
  } catch (e) {}

  function estClasseProfLabo(classe) {
    var c = String(classe || "").trim().toLowerCase();
    try { c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    c = c.replace(/[\s._\-]+/g, "");
    return c === "elevelabo3";
  }

  function estGoldProfil(p) {
    if (!p) return false;
    if (estClasseProfLabo(p.classe)) return true;
    return Boolean(p.gold === true || /\|\s*GOLD$/i.test(p.lycee || ""));
  }
  function lyceePropre(p) {
    return ((p && p.lycee) || "—").replace(/\s*\|\s*GOLD$/i, "") || "—";
  }
  function esc(t) { var d = document.createElement("i"); d.textContent = t || ""; return d.innerHTML; }

  /* ---------- Restriction des espaces réservés exclusivement aux classes de 4e SI (4SI 1, 2, 3, 4 ou 5), à la classe elevelabo3 et au Prof (Admin) ----------
     Tout ce qui est PHP + Atelier Bac Pratique est caché par défaut et affiché uniquement pour 4SI (1 à 5), elevelabo3 et le Prof :
     - Atelier Bac Pratique (bac-pratique.html)
     - PHP Cours (cours/php.html, cours/coursphp.html, cours/php-mysqli.html, supports-pdf/cours-php.html, documents/annexes/annexe-php*, documents/complet/complet-4eme-si*)
     - PHP Exercices (section #php dans exercices/series-exercices.html + exercices/php/* + exercices/resume-fonctions-standards.html)
     - PHP Quiz (quiz/php.html, quiz/pp.html) */
  var estAdminGlobal = false;
  (function injecterStyle4SIZeroFlash() {
    if (document.getElementById("sti-style-4si-global")) return;
    var st = document.createElement("style");
    st.id = "sti-style-4si-global";
    st.textContent =
      "html:not(.sti-4si-autorise) .sti-4si-only," +
      "html:not(.sti-4si-autorise) a[href*='bac-pratique.html']," +
      "html:not(.sti-4si-autorise) a[href*='cours/php.html']," +
      "html:not(.sti-4si-autorise) a[href*='cours/coursphp.html']," +
      "html:not(.sti-4si-autorise) a[href*='cours/php-mysqli.html']," +
      "html:not(.sti-4si-autorise) a[href*='annexe-php']," +
      "html:not(.sti-4si-autorise) a[href*='complet-4eme-si']," +
      "html:not(.sti-4si-autorise) [data-complet='4eme']," +
      "html:not(.sti-4si-autorise) [data-complet='4eme-resume']," +
      "html:not(.sti-4si-autorise) a[href*='quiz/php.html']," +
      "html:not(.sti-4si-autorise) a[href*='quiz/pp.html']," +
      "html:not(.sti-4si-autorise) button[data-filter='php']," +
      "html:not(.sti-4si-autorise) [data-tech='php']," +
      "html:not(.sti-4si-autorise) [data-course-id='php']," +
      "html:not(.sti-4si-autorise) section#php," +
      "html:not(.sti-4si-autorise) a[href='#php']," +
      "html:not(.sti-4si-autorise) a[href*='#php']," +
      "html:not(.sti-4si-autorise) #sti-btn-bac-pan{display:none!important;}" +
      "html.sti-4si-autorise .sti-non-4si-only{display:none!important;}";
    (document.head || document.documentElement).appendChild(st);
  })();

  function estAutorise4SI(classe, estAdmin) {
    if (estAdmin || estAdminGlobal || estClasseProfLabo(classe)) return true;
    var c = String(classe || "").trim().toUpperCase().replace(/[\s._\-]+/g, "");
    return /^4(E|ÈME|EME)?SI([1-5])?$/i.test(c);
  }
  function nomEspaceReserve4SI(urlOuChemin) {
    var u = String(urlOuChemin || "").toLowerCase();
    if (!u) return null;
    if (u.indexOf("bac-pratique") !== -1 || u.indexOf("projets/sti0") !== -1 || u.indexOf("projetsti0") !== -1) return "l'Atelier Bac Pratique (Projet STI 0)";
    if (u.indexOf("cours/php") !== -1 || u.indexOf("cours/coursphp") !== -1 || u.indexOf("cours-php") !== -1 || u.indexOf("annexe-php") !== -1 || u.indexOf("complet-4eme-si") !== -1) return "le Cours PHP (4e SI)";
    if (u.indexOf("exercices/php/") !== -1 || u.indexOf("tp1-php") !== -1 || u.indexOf("tp2-php") !== -1 || u.indexOf("tp2-correction-php") !== -1 || u.indexOf("tp3-php") !== -1 || u.indexOf("tp3-correction-php") !== -1 || u.indexOf("tp4-php") !== -1 || u.indexOf("resume-fonctions-standards") !== -1 || u === "#php" || u.slice(-4) === "#php") return "les Exercices PHP";
    if (u.indexOf("quiz/php") !== -1 || u.indexOf("quiz/pp.html") !== -1) return "le Quiz PHP";
    return null;
  }

  function appliquerVerrou4SI(classe, estAdmin) {
    estAdminGlobal = Boolean(estAdmin);
    currentClasse = classe || currentClasse || "";
    var autorise = estAutorise4SI(currentClasse, estAdminGlobal);
    if (document.documentElement) {
      document.documentElement.classList.toggle("sti-4si-autorise", autorise);
    }

    /* 1. Si l'utilisateur ouvre directement une page réservée aux 4e SI alors qu'il n'est ni en 4e SI ni Prof */
    var espacePage = nomEspaceReserve4SI(location.pathname);
    var existLock = document.getElementById("sti-lock-4si");
    if (espacePage && !autorise) {
      if (!existLock) {
        var ov = document.createElement("div");
        ov.id = "sti-lock-4si";
        ov.className = "sti-no-print";
        ov.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#f9f1e3;color:#23201a;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;";
        ov.innerHTML =
          '<div style="max-width:460px;background:#fffdf7;border:2.5px solid #23201a;border-radius:22px;padding:28px 24px;box-shadow:6px 6px 0 #f4511e">' +
          '<div style="font-size:48px;margin-bottom:8px">🔒</div>' +
          '<h2 style="font-size:20px;font-weight:900;margin:0 0 10px;color:#23201a">Espace réservé aux 4<sup>e</sup> SI &amp; au Professeur</h2>' +
          '<p style="font-size:14px;line-height:1.55;color:#5a5244;margin:0 0 12px;font-weight:600">' +
          'L\'accès à <b style="color:#f4511e">' + esc(espacePage) + '</b> est réservé exclusivement aux classes de <b>4<sup>e</sup> SI (1, 2, 3, 4 ou 5)</b> et au professeur.' +
          '</p>' +
          '<div style="display:inline-block;background:#f3ead9;border:1.5px solid #23201a;border-radius:999px;padding:5px 14px;font-size:12.5px;font-weight:800;margin-bottom:18px">' +
          '🏫 Votre classe actuelle : <span style="color:#c0392b">' + esc(currentClasse || "Non 4e SI") + '</span>' +
          '</div><br>' +
          '<a href="' + cfg.RACINE + 'index.html" style="display:inline-block;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border:2px solid #23201a;border-radius:999px;padding:11px 24px;font-weight:900;font-size:14px;text-decoration:none;box-shadow:3px 3px 0 #23201a">🏠 Retourner à l\'accueil</a>' +
          '</div>';
        (document.body || document.documentElement).appendChild(ov);
      }
    } else if (existLock && autorise) {
      existLock.remove();
    }

    /* 2. Masquer ou afficher sur index.html, series-exercices.html et le panneau compte tous les éléments PHP / 4e SI */
    function majDomElements() {
      if (document.documentElement) {
        document.documentElement.classList.toggle("sti-4si-autorise", autorise);
      }
      var selecteurs = [
        '.sti-4si-only',
        'a[href*="bac-pratique.html"]',
        'a[href*="cours/php.html"]',
        'a[href*="cours/coursphp.html"]',
        'a[href*="cours/php-mysqli.html"]',
        'a[href*="annexe-php"]',
        'a[href*="complet-4eme-si"]',
        '[data-complet="4eme"]',
        '[data-complet="4eme-resume"]',
        'a[href*="quiz/php.html"]',
        'a[href*="quiz/pp.html"]',
        'button[data-filter="php"]',
        '[data-tech="php"]',
        '[data-course-id="php"]',
        'section#php',
        'a[href="#php"]',
        'a[href*="#php"]',
        '#sti-btn-bac-pan'
      ];
      try {
        var els = document.querySelectorAll(selecteurs.join(","));
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          el.hidden = !autorise;
          el.style.display = autorise ? "" : "none";
        }
      } catch (e) {}
      if (typeof window.__stiMaj4SI === "function") {
        try { window.__stiMaj4SI(); } catch (e) {}
      }
    }
    majDomElements();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", majDomElements);
    }

    /* 3. Intercepter l'ouverture de modales PDF d'exercices PHP si non 4e SI */
    if (typeof window.openPdfModal === "function" && !window.openPdfModal.__sti4si) {
      var origOpenPdf = window.openPdfModal;
      var wrappedOpenPdf = function (url, titre) {
        var esp = nomEspaceReserve4SI(url);
        if (esp && !estAutorise4SI(currentClasse, estAdminGlobal)) {
          afficherToastSynchro("🔒 " + esp + " est réservé uniquement aux classes de 4e SI (1 à 5) et au professeur.");
          return false;
        }
        return origOpenPdf.apply(this, arguments);
      };
      wrappedOpenPdf.__sti4si = true;
      window.openPdfModal = wrappedOpenPdf;
    }
  }

  /* Application immédiate dès 0 ms à partir du cache de session local (ou session permanente elevelabo3) */
  try {
    var permInit = JSON.parse(localStorage.getItem("sti-labo3-permanent") || "null");
    var cacheInit = permInit || JSON.parse(localStorage.getItem("sti-session-cache") || "null");
    var admInit = localStorage.getItem("sti-admin-gold") === "1" || Boolean(cacheInit && (cacheInit.isAdmin || estClasseProfLabo(cacheInit.classe)));
    appliquerVerrou4SI((cacheInit && cacheInit.classe) || "", admInit);
  } catch (e) {
    appliquerVerrou4SI("", false);
  }

  /* Intercepteur universel de téléchargement hors-ligne (<a download>) :
     En mode hors-ligne sur Chrome/Edge, un clic natif sur <a download> contourne parfois le Service Worker.
     On récupère le fichier depuis le Cache Storage (ou via fetch SW) et on déclenche un téléchargement Blob en mémoire. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!href || href.indexOf("blob:") === 0 || href.indexOf("data:") === 0) return;
    if (a.hasAttribute("data-sti-blob-ready")) return;
    e.preventDefault();
    var nomDl = a.getAttribute("download") || href.split("/").pop() || "ressource";
    var absUrl = a.href;
    (async function () {
      try {
        var rep = null;
        if ("caches" in window) {
          rep = await caches.match(absUrl, { ignoreSearch: true });
          if (!rep) rep = await caches.match(href, { ignoreSearch: true });
        }
        if (!rep) {
          rep = await fetch(absUrl);
        }
        if (rep && rep.ok) {
          var blob = await rep.blob();
          var bUrl = URL.createObjectURL(blob);
          var tmp = document.createElement("a");
          tmp.href = bUrl;
          tmp.download = nomDl;
          tmp.setAttribute("data-sti-blob-ready", "1");
          document.body.appendChild(tmp);
          tmp.click();
          setTimeout(function () {
            if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
            URL.revokeObjectURL(bUrl);
          }, 2000);
          return;
        }
      } catch (err) {}
      /* Secours si non trouvé */
      window.open(absUrl, "_blank");
    })();
  });

  /* ---------- Activation / révocation en direct du mode Compte GOLD (capture d'écran + impression) ---------- */
  function appliquerModeGold(actif) {
    var ok = Boolean(actif);
    window.__STI_GOLD = ok;
    try {
      if (ok) localStorage.setItem("sti-gold", "1");
      else localStorage.removeItem("sti-gold");
    } catch (e) {}
    if (document.documentElement) document.documentElement.classList.toggle("sti-gold", ok);
    if (document.body) document.body.classList.toggle("sti-gold", ok);

    try {
      var liens = document.querySelectorAll('link[href*="protection.css"]');
      for (var i = 0; i < liens.length; i++) liens[i].disabled = ok;
    } catch (e) {}

    var wm = document.getElementById("sti-watermark");
    if (wm) {
      if (ok && wm.parentNode) wm.parentNode.removeChild(wm);
      else wm.style.display = ok ? "none" : "";
    }
    var pm = document.getElementById("sti-print-msg");
    if (pm) {
      if (ok && pm.parentNode) pm.parentNode.removeChild(pm);
      else pm.style.display = "none";
    }

    try {
      var fr = document.getElementById("pdfFrame");
      if (fr && fr.contentWindow) {
        fr.contentWindow.__STI_GOLD = ok;
        if (fr.contentDocument) {
          if (fr.contentDocument.documentElement) fr.contentDocument.documentElement.classList.toggle("sti-gold", ok);
          if (fr.contentDocument.body) fr.contentDocument.body.classList.toggle("sti-gold", ok);
          var liensFr = fr.contentDocument.querySelectorAll('link[href*="protection.css"]');
          for (var j = 0; j < liensFr.length; j++) liensFr[j].disabled = ok;
          var wmFr = fr.contentDocument.getElementById("sti-watermark");
          if (ok && wmFr && wmFr.parentNode) wmFr.parentNode.removeChild(wmFr);
          var pmFr = fr.contentDocument.getElementById("sti-print-msg");
          if (ok && pmFr && pmFr.parentNode) pmFr.parentNode.removeChild(pmFr);
        }
      }
    } catch (e) {}

    var bdgGold = document.getElementById("sti-badge-gold");
    if (bdgGold) bdgGold.style.display = ok ? "inline-block" : "none";
    var btnImp = document.getElementById("sti-btn-print-gold");
    if (btnImp) btnImp.style.display = ok ? "block" : "none";
    var btnRoue = document.getElementById("sti-roue-btn");
    if (btnRoue) {
      btnRoue.textContent = "⚙️";
      btnRoue.title = ok ? "Mon compte GOLD (capture & impression autorisées)" : "Mon compte";
      btnRoue.style.background = ok
        ? "radial-gradient(circle at 32% 30%,#fff6b3,#ffb300 68%)"
        : "radial-gradient(circle at 32% 30%,#ffb27a,#f4511e 68%)";
    }
    var elLycee = document.getElementById("sti-pan-lycee");
    if (elLycee && arguments.length > 1 && arguments[1]) {
      elLycee.textContent = lyceePropre(arguments[1]) + " · " + (arguments[1].classe || "—");
    }
  }

  function imprimerContenuGold() {
    appliquerModeGold(true);
    try {
      var modal = document.getElementById("pdfModal");
      var fr = document.getElementById("pdfFrame");
      if (modal && modal.classList.contains("open") && fr && fr.contentWindow) {
        try {
          if (fr.contentDocument && fr.contentDocument.documentElement) {
            fr.contentDocument.documentElement.classList.add("sti-gold");
          }
          if (fr.contentDocument && fr.contentDocument.body) {
            fr.contentDocument.body.classList.add("sti-gold");
          }
        } catch (e) {}
        fr.contentWindow.focus();
        fr.contentWindow.print();
        return;
      }
    } catch (e) {}
    window.print();
  }

  try {
    if (localStorage.getItem("sti-gold") === "1" || localStorage.getItem("sti-admin-gold") === "1") {
      appliquerModeGold(true);
    }
  } catch (e) {}

  /* ---------- Enregistrement automatique des chapitres visités (Progression élève) ---------- */
  function marquerChapitreVisite() {
    var p = location.pathname.toLowerCase();
    var mod = null;
    if (p.indexOf("html5") !== -1 || p.indexOf("datalist") !== -1 || p.indexOf("fleuriste") !== -1) mod = "HTML5";
    else if (p.indexOf("css") !== -1 || p.indexOf("positionnement") !== -1) mod = "CSS3";
    else if (p.indexOf("javascript") !== -1 || p.indexOf("-js") !== -1) mod = "JS";
    else if (p.indexOf("php") !== -1 || p.indexOf("pp.html") !== -1) mod = "PHP";
    else if (p.indexOf("sql") !== -1 || p.indexOf("-bd") !== -1) mod = "SQL";
    if (!mod) return;
    try {
      var vus = JSON.parse(localStorage.getItem("sti-chapitres-vus") || "{}");
      vus[mod] = 1;
      localStorage.setItem("sti-chapitres-vus", JSON.stringify(vus));
    } catch (e) {}
  }
  marquerChapitreVisite();

  /* ---------- File d'attente hors-ligne (synchronisée automatiquement dès le retour d'Internet) ---------- */
  var CLE_FILE_OFFLINE = "sti-offline-queue";
  function empilerHorsLigne(ligne) {
    try {
      var q = JSON.parse(localStorage.getItem(CLE_FILE_OFFLINE) || "[]");
      q.push(ligne);
      if (q.length > 200) q = q.slice(-200);
      localStorage.setItem(CLE_FILE_OFFLINE, JSON.stringify(q));
    } catch (e) {}
  }

  function afficherToastSynchro(texte) {
    if (window !== window.top) return;
    try {
      var ex = document.getElementById("sti-toast-sync");
      if (ex) ex.remove();
      var t = document.createElement("div");
      t.id = "sti-toast-sync";
      t.className = "sti-no-print";
      t.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:2147483647;background:#fffdf7;color:#177245;border:2px solid #23201a;border-radius:999px;padding:8px 15px;font:800 12px/1.3 system-ui,'Segoe UI',sans-serif;box-shadow:3px 3px 0 #23201a;transition:opacity .35s ease;";
      t.textContent = texte;
      (document.body || document.documentElement).appendChild(t);
      setTimeout(function () {
        t.style.opacity = "0";
        setTimeout(function () { if (t.parentNode) t.remove(); }, 400);
      }, 3800);
    } catch (e) {}
  }

  /* Garantit une vraie session Supabase dès que l'appareil est connecté à Internet */
  function assurerSessionEnLigne(cb) {
    if (!navigator.onLine) return;
    sb.auth.getSession().then(function (r) {
      var s = r && r.data ? r.data.session : null;
      if (s && s.user) {
        currentUid = s.user.id;
        cb(s.user);
        return;
      }
      var re = null;
      try { re = JSON.parse(localStorage.getItem("sti-reauth") || "null"); } catch (e) {}
      if (re && re.e && re.p) {
        var mdpClair = "";
        try { mdpClair = decodeURIComponent(escape(atob(re.p))); } catch (e) {}
        if (mdpClair) {
          sb.auth.signInWithPassword({ email: re.e, password: mdpClair }).then(function (rs) {
            if (rs && rs.data && rs.data.user) {
              currentUid = rs.data.user.id;
              cb(rs.data.user);
            }
          }).catch(function () {});
        }
      }
    }).catch(function () {});
  }

  /* Envoie les données enregistrées hors-ligne + reçoit les dernières données du serveur + met à jour le SW */
  function synchroniserFileHorsLigne(estRetourInternet) {
    if (!navigator.onLine) return;
    /* 1. Demander au Service Worker de vérifier et mettre à jour les fichiers du site */
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg) reg.update();
      }).catch(function () {});
      if (navigator.serviceWorker.controller) {
        try { navigator.serviceWorker.controller.postMessage({ type: "SYNC_UPDATE" }); } catch (e) {}
      }
    }
    var btnOff = document.getElementById("sti-btn-precache");
    if (btnOff && localStorage.getItem("sti-precache-100") === "1") {
      btnOff.textContent = "✅ 100 % prêt hors-ligne";
    }

    assurerSessionEnLigne(function (user) {
      /* 2. ENVOYER la file d'attente hors-ligne (scores Quiz/Bac, durées d'étude, questions au prof) */
      var q = [];
      try { q = JSON.parse(localStorage.getItem(CLE_FILE_OFFLINE) || "[]"); } catch (e) {}
      var avaitFile = q.length > 0;
      if (avaitFile) {
        try { localStorage.removeItem(CLE_FILE_OFFLINE); } catch (e) {}
        var propres = q.map(function (it) {
          var c = Object.assign({}, it);
          delete c._sid;
          if (!c.user_id || c.user_id === "offline-user") c.user_id = user.id;
          return c;
        });
        sb.from("acces").insert(propres).then(function (r) {
          if (r && r.error) {
            q.forEach(empilerHorsLigne);
          } else {
            /* Diffuser en temps réel les scores ou messages qui étaient en attente */
            propres.forEach(function (row) {
              var pg = String(row.page || "");
              if (pg.indexOf("QUIZ:") === 0) {
                try {
                  var pQuiz = JSON.parse(row.lieu || "{}");
                  sb.channel("sti-diffusion").send({ type: "broadcast", event: "quiz", payload: { uid: user.id, data: pQuiz } });
                } catch (e) {}
              } else if (pg.indexOf("MSG_LU:") === 0) {
                var mid = pg.replace("MSG_LU:", "");
                var repTxt = "";
                try { repTxt = JSON.parse(row.lieu || "{}").reponse || ""; } catch (e) {}
                try {
                  sb.channel("sti-diffusion").send({ type: "broadcast", event: "lu", payload: { msgId: mid, uid: user.id, ts: row.fin, reponse: repTxt } });
                } catch (e) {}
                fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
                  method: "POST",
                  body: JSON.stringify({ type: "lu", msgId: mid, uid: user.id, ts: row.fin, reponse: repTxt })
                }).catch(function () {});
              }
            });
          }
        }).catch(function () {
          q.forEach(empilerHorsLigne);
        });
      }

      /* 3. RECEVOIR les données à jour depuis Supabase (statut, Gold, classe, durée semaine, scores Quiz) */
      if ((user.email || "").toLowerCase() !== (cfg.ADMIN || "").toLowerCase()) {
        sb.from("profiles").select("statut,lycee,classe").eq("id", user.id).maybeSingle().then(function (rp) {
          if (!rp || rp.error || !rp.data) return;
          var st = rp.data.statut;
          if (st === "en_attente") { sortirImmediatement("#attente"); return; }
          if (st === "exclu") { sortirImmediatement("#exclu"); return; }
          if (st !== "actif") { sortirImmediatement("#refuse"); return; }
          currentClasse = rp.data.classe || "";
          var isG = estGoldProfil(rp.data);
          appliquerModeGold(isG, rp.data);
          try {
            localStorage.setItem("sti-offline", String(Date.now()));
            localStorage.setItem("sti-session-cache", JSON.stringify({
              id: user.id,
              email: user.email,
              user_metadata: user.user_metadata || {},
              lycee: rp.data.lycee || "—",
              classe: rp.data.classe || "—",
              statut: "actif",
              gold: isG,
              isAdmin: false,
              ts: Date.now()
            }));
          } catch (e) {}
        });
        rafraichirDureeEtScoresServeur(user.id);
      }

      if (estRetourInternet || avaitFile) {
        afficherToastSynchro("🔄 Connexion Internet : données envoyées, reçues et mises à jour ✅");
      }
    });
  }
  window.addEventListener("online", function () {
    synchroniserFileHorsLigne(true);
  });

  function rafraichirDureeEtScoresServeur(uid) {
    if (!uid || uid === "offline-user") return;
    /* Affichage immédiat depuis le cache local si disponible */
    var elD = document.getElementById("sti-ma-duree-sem");
    try {
      var secCache = parseInt(localStorage.getItem("sti-duree-sem-cache") || "0", 10);
      var qOff = JSON.parse(localStorage.getItem(CLE_FILE_OFFLINE) || "[]");
      qOff.forEach(function (it) {
        var pg = String((it && it.page) || "");
        if (pg.indexOf("MSG_") !== 0 && pg.indexOf("QUIZ:") !== 0 && pg.indexOf("CTRL_") !== 0) {
          secCache += Number((it && it.duree_sec) || 0);
        }
      });
      if (elD && secCache > 0) {
        var m0 = Math.round(secCache / 60);
        elD.textContent = "⏱️ Cette semaine : " + (m0 < 60 ? m0 + " min" : Math.floor(m0 / 60) + " h " + (m0 % 60) + " min");
      }
    } catch (e) {}

    if (!navigator.onLine) {
      if (elD && elD.textContent.indexOf("calcul") !== -1) {
        elD.textContent = "⏱️ Cette semaine : 0 min (hors-ligne)";
      }
      return;
    }

    var dNow = new Date();
    var jour = dNow.getDay();
    var decal = jour === 0 ? -6 : 1 - jour;
    var lun = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate() + decal, 0, 0, 0);
    sb.from("acces").select("debut,duree_sec,page,lieu").eq("user_id", uid).gte("debut", lun.toISOString()).then(function (ra) {
      if (ra.error || !ra.data) return;
      var tot = 0;
      var mesScores = {};
      try { mesScores = JSON.parse(localStorage.getItem("sti-mes-scores") || "{}"); } catch (e) {}
      ra.data.forEach(function (a) {
        var pg = a.page || "";
        if (pg.indexOf("QUIZ:") === 0) {
          try {
            var qz = JSON.parse(a.lieu || "{}");
            if (qz && qz.quiz && qz.note) mesScores[qz.quiz] = qz.note;
          } catch (e) {}
          return;
        }
        if (pg.indexOf("MSG_") === 0 || pg.indexOf("CTRL_") === 0) return;
        tot += Number(a.duree_sec || 0);
      });
      try {
        localStorage.setItem("sti-duree-sem-cache", String(tot));
        localStorage.setItem("sti-mes-scores", JSON.stringify(mesScores));
      } catch (e) {}
      var elD2 = document.getElementById("sti-ma-duree-sem");
      if (elD2) {
        var m = Math.round(tot / 60);
        elD2.textContent = "⏱️ Cette semaine : " + (m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min");
      }
    });
  }

  /* ---------- Enregistrement d'un score de Quiz ou Bac Pratique vers Supabase (ou file hors-ligne) ---------- */
  window.enregistrerScoreQuizSTI = function (nomQuiz, noteTexte, sur20) {
    if (!currentUid) return;
    var payload = {
      quiz: nomQuiz,
      note: String(noteTexte || ""),
      sur20: typeof sur20 === "number" ? Math.round(sur20 * 10) / 10 : null,
      classe: currentClasse || "—",
      ts: new Date().toISOString()
    };
    try {
      var mesScores = JSON.parse(localStorage.getItem("sti-mes-scores") || "{}");
      mesScores[nomQuiz] = payload.note;
      localStorage.setItem("sti-mes-scores", JSON.stringify(mesScores));
    } catch (e) {}
    var row = {
      user_id: currentUid,
      page: "QUIZ:" + nomQuiz,
      lieu: JSON.stringify(payload),
      debut: payload.ts,
      fin: payload.ts,
      duree_sec: payload.sur20 != null ? Math.round(payload.sur20) : 0
    };
    if (!navigator.onLine) {
      empilerHorsLigne(row);
      return;
    }
    sb.from("acces").insert(row).then(function (r) {
      if (r.error) empilerHorsLigne(row);
    });
    try {
      sb.channel("sti-diffusion").send({ type: "broadcast", event: "quiz", payload: { uid: currentUid, data: payload } });
    } catch (e) {}
  };

  /* ---------- Éjection immédiate (fenêtre principale + boîtes/iframes + purge totale) ---------- */
  function purgerStockageLocal() {
    try {
      localStorage.removeItem("sti-labo3-permanent");
      localStorage.removeItem("sti-offline");
      localStorage.removeItem("sti-session-cache");
      localStorage.removeItem("sti-reauth");
      localStorage.removeItem("sti-cred");
      localStorage.removeItem("sti-gold");
      localStorage.removeItem("sti-admin-gold");
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("sb-") === 0 || k.indexOf("supabase") !== -1) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {}
    try { sessionStorage.removeItem("sti-demo"); } catch (e) {}
    window.__STI_GOLD = false;
  }

  function redirigerTop(cible) {
    try {
      if (window.top && window.top !== window) {
        try { if (window.top.document && window.top.document.body) window.top.document.body.innerHTML = ""; } catch (e) {}
        window.top.location.replace(cible);
        return;
      }
    } catch (e) {}
    location.replace(cible);
  }

  function sortirImmediatement(hash) {
    if (enSortie) return;
    enSortie = true;
    var h = hash || "#deconnecte";
    var cible = PORTAIL + h;
    purgerStockageLocal();
    try { localStorage.setItem("sti-force-exit", h + "|" + Date.now()); } catch (e) {}
    try { if (document.body) document.body.innerHTML = ""; } catch (e) {}
    try { sb.auth.signOut().catch(function () {}); } catch (e) {}
    redirigerTop(cible);
  }

  window.addEventListener("storage", function (e) {
    if (!e) return;
    if (e.key === "sti-force-exit" && e.newValue) {
      var h = String(e.newValue).split("|")[0] || "#deconnecte";
      sortirImmediatement(h);
    } else if (e.key === "sti-gold") {
      appliquerModeGold(e.newValue === "1");
    }
  });

  var sessionInitialisee = false;
  var ADMIN_MAIL_STRICT = ((cfg && cfg.ADMIN) || "aymenessouyah@gmail.com").trim().toLowerCase();
  function lireCacheSessionLocal() {
    try {
      var perm = JSON.parse(localStorage.getItem("sti-labo3-permanent") || "null");
      if (perm && estClasseProfLabo(perm.classe)) {
        perm.ts = Date.now();
        perm.gold = true;
        perm.statut = "actif";
        perm.permanent = true;
        perm.isAdmin = false;
        try { localStorage.removeItem("sti-admin-gold"); } catch (e) {}
        return perm;
      }
      var c = JSON.parse(localStorage.getItem("sti-session-cache") || "null");
      if (c && estClasseProfLabo(c.classe)) {
        c.ts = Date.now();
        c.gold = true;
        c.statut = "actif";
        c.permanent = true;
        c.isAdmin = false;
        try {
          localStorage.removeItem("sti-admin-gold");
          localStorage.setItem("sti-labo3-permanent", JSON.stringify(c));
        } catch (e) {}
        return c;
      }
      return c;
    } catch (e) { return null; }
  }

  function restaurerDepuisCacheLocal() {
    var cache = lireCacheSessionLocal();
    var estLaboPerm = Boolean(cache && (cache.permanent || estClasseProfLabo(cache.classe)));
    var tOff = parseInt(localStorage.getItem("sti-offline") || "0", 10);
    var tsValide = (cache && cache.ts) || tOff;
    if (estLaboPerm || (tsValide && Date.now() - tsValide < 30 * 86400000)) {
      sessionInitialisee = true;
      if (estLaboPerm) {
        try {
          cache.isAdmin = false;
          localStorage.removeItem("sti-admin-gold");
          localStorage.setItem("sti-gold", "1");
          localStorage.setItem("sti-offline", String(Date.now()));
          localStorage.setItem("sti-session-cache", JSON.stringify(cache));
          localStorage.setItem("sti-labo3-permanent", JSON.stringify(cache));
        } catch (e) {}
      }
      if (cache && cache.isAdmin === true && !estLaboPerm && String(cache.email || "").trim().toLowerCase() === ADMIN_MAIL_STRICT) {
        currentUid = cache.id || "admin";
        appliquerModeGold(true);
        appliquerVerrou4SI("Admin", true);
        if (window === window.top && !document.getElementById("sti-badge-admin-flottant")) badgeAdmin();
        if (navigator.onLine) synchroniserFileHorsLigne(false);
        return true;
      }
      try {
        localStorage.removeItem("sti-admin-gold");
        var bAncien = document.getElementById("sti-badge-admin-flottant");
        if (bAncien) bAncien.remove();
      } catch (e) {}
      var fakeUser = {
        id: (cache && cache.id) || "offline-user",
        email: (cache && cache.email) || (estLaboPerm ? "Poste Labo 3" : "Abonné hors-ligne"),
        user_metadata: (cache && cache.user_metadata) || {}
      };
      currentUid = fakeUser.id;
      currentClasse = (cache && cache.classe) || "";
      appliquerModeGold(Boolean(estLaboPerm || (cache && cache.gold)), cache || {});
      appliquerVerrou4SI(currentClasse, estLaboPerm);
      panneauCompte(fakeUser, cache || {});
      installerSuiviQuizAuto();
      journal(fakeUser.id);
      if (navigator.onLine) synchroniserFileHorsLigne(true);
      return true;
    }
    return false;
  }

  /* Si ce PC du labo possède une session permanente elevelabo3 (ou si hors-ligne), restaurer dès 0 ms sans jamais redemander login/mot de passe */
  (function verifImmediateLabo3OuHorsLigne() {
    var cInit = lireCacheSessionLocal();
    if (!navigator.onLine || (cInit && (cInit.permanent || estClasseProfLabo(cInit.classe)))) {
      restaurerDepuisCacheLocal();
    }
  })();
  var timerSecoursHorsLigne = setTimeout(function () {
    if (!sessionInitialisee) restaurerDepuisCacheLocal();
  }, 1500);

  sb.auth.getSession().then(function (r) {
    clearTimeout(timerSecoursHorsLigne);
    var session = r && r.data ? r.data.session : null;
    if (!session) {
      /* Mode hors-ligne ou jeton expiré : restauration immédiate de la session locale */
      if (restaurerDepuisCacheLocal()) return;
      localStorage.removeItem("sti-labo3-permanent");
      localStorage.removeItem("sti-offline");
      localStorage.removeItem("sti-session-cache");
      localStorage.removeItem("sti-gold");
      localStorage.removeItem("sti-admin-gold");
      redirigerTop(PORTAIL + "#connexion");
      return;
    }
    sessionInitialisee = true;
    var user = session.user;
    currentUid = user.id;
    synchroniserFileHorsLigne();
    if ((user.email || "").trim().toLowerCase() === ADMIN_MAIL_STRICT) {
      try {
        localStorage.removeItem("sti-labo3-permanent");
        localStorage.setItem("sti-admin-gold", "1");
        localStorage.setItem("sti-offline", String(Date.now()));
        localStorage.setItem("sti-session-cache", JSON.stringify({
          id: user.id,
          email: user.email,
          statut: "actif",
          gold: true,
          isAdmin: true,
          ts: Date.now()
        }));
      } catch (e) {}
      appliquerModeGold(true);
      appliquerVerrou4SI("Admin", true);
      if (window === window.top && !document.getElementById("sti-badge-admin-flottant")) badgeAdmin();
      journal(user.id);
      return;
    }

    /* Compte non-admin (ex: elevelabo3@exemple.tn) : supprimer immédiatement tout badge ou indicateur admin */
    try {
      localStorage.removeItem("sti-admin-gold");
      var exBadgeAdm = document.getElementById("sti-badge-admin-flottant");
      if (exBadgeAdm) exBadgeAdm.remove();
    } catch (e) {}

    function appliquerStatut(rp) {
      if (!rp || rp.error) return true;
      if (!rp.data) {
        sortirImmediatement("#refuse");
        return false;
      }
      var st = rp.data.statut;
      if (st === "actif") {
        currentClasse = rp.data.classe || "";
        var isLaboP = estClasseProfLabo(currentClasse);
        var isG = estGoldProfil(rp.data);
        appliquerModeGold(isG, rp.data);
        appliquerVerrou4SI(currentClasse, isLaboP);
        try {
          var objSess = {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata || {},
            lycee: rp.data.lycee || "—",
            classe: rp.data.classe || "—",
            statut: "actif",
            gold: isG,
            permanent: isLaboP,
            isAdmin: false,
            ts: Date.now()
          };
          localStorage.setItem("sti-offline", String(Date.now()));
          localStorage.setItem("sti-session-cache", JSON.stringify(objSess));
          if (isLaboP) {
            localStorage.setItem("sti-labo3-permanent", JSON.stringify(objSess));
          } else {
            localStorage.removeItem("sti-labo3-permanent");
          }
        } catch (e) {}
        return true;
      }
      if (st === "en_attente") { sortirImmediatement("#attente"); return false; }
      if (st === "exclu") { sortirImmediatement("#exclu"); return false; }
      sortirImmediatement("#refuse");
      return false;
    }

    function entrer(profil) {
      var cacheFallback = lireCacheSessionLocal() || {};
      var p = (profil && (profil.classe || profil.lycee)) ? profil : cacheFallback;
      currentClasse = (p && p.classe) || "";
      var isLaboP = estClasseProfLabo(currentClasse);
      appliquerModeGold(estGoldProfil(p), p);
      appliquerVerrou4SI(currentClasse, isLaboP);
      var suiteEntree = function () {
        panneauCompte(user, p || {});
        surveillerSessionTempsReel(user.id, appliquerStatut);
        installerSuiviQuizAuto();
        journal(user.id);
      };
      if (isLaboP) suiteEntree();
      else verrouBio(user, suiteEntree);
    }

    var dejaEntre = false;
    var timerProfilOff = setTimeout(function () {
      if (!dejaEntre) {
        dejaEntre = true;
        entrer(lireCacheSessionLocal() || {});
      }
    }, 2000);

    sb.from("profiles").select("statut,lycee,classe").eq("id", user.id).maybeSingle().then(function (rp) {
      clearTimeout(timerProfilOff);
      if (!rp || rp.error) {
        if (!dejaEntre) { dejaEntre = true; entrer(lireCacheSessionLocal() || {}); }
        return;
      }
      if (!appliquerStatut(rp)) return;
      if (!dejaEntre) {
        dejaEntre = true;
        entrer(rp.data || {});
      }
    }).catch(function () {
      clearTimeout(timerProfilOff);
      if (!dejaEntre) { dejaEntre = true; entrer(lireCacheSessionLocal() || {}); }
    });
  }).catch(function () {
    clearTimeout(timerSecoursHorsLigne);
    if (!restaurerDepuisCacheLocal()) {
      redirigerTop(PORTAIL + "#connexion");
    }
  });

  /* ---------- Surveillance continue : exclusion / retrait / mise en attente / passage Gold en direct ---------- */
  function surveillerSessionTempsReel(uid, appliquerStatut) {
    function verifDirecte() {
      if (enSortie) return;
      sb.from("profiles").select("statut,lycee,classe").eq("id", uid).maybeSingle().then(function (rp) {
        appliquerStatut(rp);
      });
    }
    setInterval(verifDirecte, 8000);
    window.addEventListener("focus", verifDirecte);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) verifDirecte();
    });
    try {
      sb.channel("sti-user-" + uid)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: "id=eq." + uid }, function (payload) {
          if (payload.eventType === "DELETE") {
            sortirImmediatement("#refuse");
            return;
          }
          var nv = payload.new;
          if (nv && nv.statut) {
            appliquerStatut({ data: nv, error: null });
          } else {
            verifDirecte();
          }
        })
        .subscribe();
    } catch (e) {}
  }

  /* ---------- Point 5 : Détection automatique des scores sur les pages Quiz + bouton d'envoi ---------- */
  function installerSuiviQuizAuto() {
    if (window !== window.top) return;
    var p = location.pathname.toLowerCase();
    if (p.indexOf("/quiz/") === -1) return;

    var nomQuiz = "Quiz STI";
    if (p.indexOf("html-css") !== -1) nomQuiz = "Quiz HTML/CSS";
    else if (p.indexOf("javascript") !== -1) nomQuiz = "Quiz JS";
    else if (p.indexOf("pp.html") !== -1) nomQuiz = "Défi PHP";
    else if (p.indexOf("php") !== -1) nomQuiz = "Quiz PHP";
    else if (p.indexOf("sql") !== -1) nomQuiz = "Quiz SQL";

    var dernierEnvoye = "";

    function extraireScoreCourant() {
      /* 1. Quiz HTML/CSS : #finalScore (ex: 16/20) */
      var fs = document.getElementById("finalScore");
      if (fs && fs.textContent && fs.textContent.trim() !== "0/0") {
        var txt1 = fs.textContent.trim();
        var m1 = txt1.match(/(\d+)\s*\/\s*(\d+)/);
        if (m1 && parseInt(m1[2], 10) > 0) {
          var s20 = (parseInt(m1[1], 10) / parseInt(m1[2], 10)) * 20;
          return { note: txt1 + " (" + Math.round(s20) + "/20)", sur20: s20 };
        }
      }
      /* 2. Quiz JS : #screen-result visible + #res-accuracy / #res-score */
      var scrRes = document.getElementById("screen-result");
      if (scrRes && !scrRes.classList.contains("hidden")) {
        var acc = document.getElementById("res-accuracy");
        var sc = document.getElementById("res-score");
        var pctTxt = acc ? acc.textContent.trim() : "";
        var scTxt = sc ? sc.textContent.trim() : "";
        var mPct = pctTxt.match(/(\d+)/);
        if (mPct) {
          var s20js = Math.round((parseInt(mPct[1], 10) / 100) * 20);
          return { note: s20js + "/20 (" + pctTxt + " · " + scTxt + " pts)", sur20: s20js };
        }
      }
      /* 3. Quiz PHP / SQL / PP : #resultsOverlay ou #resScore */
      var resEl = document.getElementById("resScore");
      var certEl = document.getElementById("certScore");
      if (resEl && resEl.textContent.trim() && resEl.textContent.trim() !== "0") {
        var tRes = (certEl && certEl.textContent.trim()) ? certEl.textContent.trim() : resEl.textContent.trim();
        var mPct2 = tRes.match(/(\d+)\s*%/);
        var s20p = mPct2 ? Math.round((parseInt(mPct2[1], 10) / 100) * 20) : null;
        return { note: s20p != null ? (s20p + "/20 (" + tRes + ")") : tRes, sur20: s20p != null ? s20p : 15 };
      }
      /* Score en direct pendant la partie */
      var liveEl = document.getElementById("heroScore") || document.getElementById("stat-score") || document.getElementById("qScore") || document.getElementById("quizScore");
      if (liveEl && liveEl.textContent.trim() && liveEl.textContent.trim() !== "0" && liveEl.textContent.trim() !== "Score : 0") {
        return { note: liveEl.textContent.trim() + " pts", sur20: null };
      }
      return null;
    }

    /* Bouton flottant discret en bas à gauche pour envoyer son score au prof à tout moment */
    var btnScore = document.createElement("button");
    btnScore.type = "button";
    btnScore.className = "sti-no-print";
    btnScore.textContent = "🏆 Envoyer mon score au prof";
    btnScore.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:2147483645;border:2px solid #23201a;background:linear-gradient(120deg,#fff3b0,#ffd54f);color:#23201a;border-radius:999px;padding:8px 14px;font:800 12px/1 system-ui,'Segoe UI',sans-serif;cursor:pointer;box-shadow:3px 3px 0 #23201a;";
    btnScore.addEventListener("click", function () {
      var info = extraireScoreCourant();
      if (!info) {
        btnScore.textContent = "⚠️ Terminez d'abord quelques questions !";
        setTimeout(function () { btnScore.textContent = "🏆 Envoyer mon score au prof"; }, 2200);
        return;
      }
      window.enregistrerScoreQuizSTI(nomQuiz, info.note, info.sur20);
      dernierEnvoye = info.note;
      btnScore.textContent = "✅ Score transmis (" + info.note + ")";
      setTimeout(function () { btnScore.textContent = "🏆 Envoyer mon score au prof"; }, 3000);
    });
    (document.body || document.documentElement).appendChild(btnScore);

    /* Envoi automatique dès que l'écran de résultat final apparaît */
    setInterval(function () {
      var info = extraireScoreCourant();
      if (info && info.sur20 != null && info.note !== dernierEnvoye) {
        dernierEnvoye = info.note;
        window.enregistrerScoreQuizSTI(nomQuiz, info.note, info.sur20);
        btnScore.textContent = "✅ Score final transmis (" + info.note + ")";
      }
    }, 3000);
  }

  /* ---------- roue « mon compte » chic + Progression personnelle + Écrire au prof ---------- */
  function panneauCompte(user, profil) {
    var existWrap = document.getElementById("sti-roue-wrap");
    if (existWrap) existWrap.remove();
    var isG = estGoldProfil(profil);
    var st = document.createElement("style");
    st.textContent =
      ".sti-roue{transition:transform 1.15s cubic-bezier(.34,1.2,.4,1),box-shadow .3s}" +
      ".sti-roue:hover{box-shadow:0 0 0 6px rgba(244,81,30,.18),3px 3px 0 #23201a}" +
      ".sti-wrap{transition:transform 1.15s cubic-bezier(.34,1.2,.4,1)}" +
      ".sti-pan{opacity:0;transform:translateX(26px) scale(.96);pointer-events:none;transition:opacity .8s ease,transform .8s ease}" +
      ".sti-pan.ouvert{opacity:1;transform:translateX(0) scale(1);pointer-events:auto}";
    document.head.appendChild(st);

    var wrap = document.createElement("div");
    wrap.id = "sti-roue-wrap";
    wrap.className = "sti-no-print";
    wrap.style.cssText = "position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:2147483646;display:flex;align-items:center;";

    var pan = document.createElement("div");
    pan.className = "sti-pan";
    pan.style.cssText = "position:absolute;right:0;background:#fffdf7;border:2px solid #23201a;border-radius:16px;padding:13px 15px;box-shadow:5px 5px 0 rgba(244,81,30,.5);font:600 12px/1.5 system-ui,'Segoe UI',sans-serif;color:#23201a;width:252px;text-align:right;color-scheme:light;";
    var affLogin = user.email || user.phone || "—";
    if (/@tel\.sti\.tn$/i.test(affLogin)) {
      var meta = user.user_metadata || {};
      affLogin = "📱 " + (meta.phone || ("+" + affLogin.replace(/@tel\.sti\.tn$/i, "")));
      var np = ((meta.prenom || "") + " " + (meta.nom || "")).trim();
      if (np) affLogin += " · " + np;
    }

    var vus = {};
    try { vus = JSON.parse(localStorage.getItem("sti-chapitres-vus") || "{}"); } catch (e) {}
    var ok4SI = estAutorise4SI(profil.classe, false);
    var mods = ok4SI ? ["HTML5", "CSS3", "JS", "PHP", "SQL"] : ["HTML5", "CSS3", "JS", "SQL"];
    var nbVus = 0;
    var badgesMod = mods.map(function (m) {
      var ok = Boolean(vus[m]);
      if (ok) nbVus++;
      return "<span style='display:inline-block;padding:1px 6px;margin:1px;border-radius:6px;font-size:10px;font-weight:800;border:1px solid #23201a;background:" +
        (ok ? "#e3f6e8;color:#177245" : "#f3ead9;color:#7a6f5d") + "'>" + m + (ok ? " ✔" : "") + "</span>";
    }).join("");
    var pctProg = Math.round((nbVus / mods.length) * 100);

    pan.innerHTML =
      "<span id='sti-badge-gold' style='display:" + (isG ? "inline-block" : "none") + ";background:linear-gradient(120deg,#fff3b0,#ffd54f);color:#6d4c00;border:1.5px solid #23201a;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:900;margin-bottom:4px;box-shadow:1.5px 1.5px 0 #23201a'>👑 COMPTE GOLD</span><br>" +
      "<span style='color:#7a6f5d;font-size:10px;text-transform:uppercase;letter-spacing:1px'>Mon Compte STI</span><br>" +
      "<b style='font-size:12.5px'>" + esc(affLogin) + "</b><br>" +
      "<span id='sti-pan-lycee' style='color:#7a6f5d;font-size:11.5px'>" + esc(lyceePropre(profil)) + " · " + esc(profil.classe || "—") + "</span>" +
      "<div style='margin-top:8px;padding-top:7px;border-top:1px dashed #e2d5be;text-align:left'>" +
      "<div style='display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:#23201a'><span>📈 Progression cours</span><span style='color:#f4511e'>" + pctProg + "%</span></div>" +
      "<div style='margin-top:4px'>" + badgesMod + "</div>" +
      "<div id='sti-ma-duree-sem' style='margin-top:5px;font-size:11px;font-weight:800;color:#177245'>⏱️ Cette semaine : calcul…</div>" +
      "</div>";

    var btnSearchPan = document.createElement("button");
    btnSearchPan.type = "button";
    btnSearchPan.textContent = "🔍 Recherche rapide (Ctrl+K)";
    btnSearchPan.style.cssText = "display:block;width:100%;margin:8px 0 0 auto;border:1.5px solid #23201a;background:linear-gradient(120deg,#fffdf7,#f3ead9);color:#23201a;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;cursor:pointer;";
    btnSearchPan.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fermer();
      if (window.ouvrirRechercheGlobaleSTI) window.ouvrirRechercheGlobaleSTI("");
    });
    pan.appendChild(btnSearchPan);

    var btnNotesPan = document.createElement("button");
    btnNotesPan.type = "button";
    btnNotesPan.textContent = "📝 Mes notes de révision";
    btnNotesPan.style.cssText = "display:block;width:100%;margin:6px 0 0 auto;border:1.5px solid #23201a;background:#fff;color:#23201a;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;cursor:pointer;";
    btnNotesPan.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fermer();
      if (window.ouvrirCarnetNotesSTI) window.ouvrirCarnetNotesSTI();
    });
    pan.appendChild(btnNotesPan);

    var btnFlashPan = document.createElement("button");
    btnFlashPan.type = "button";
    btnFlashPan.textContent = "🃏 Flashcards Bac (Recto/Verso)";
    btnFlashPan.style.cssText = "display:block;width:100%;margin:6px 0 0 auto;border:1.5px solid #23201a;background:#fff;color:#23201a;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;cursor:pointer;";
    btnFlashPan.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fermer();
      if (window.ouvrirFlashcardsSTI) window.ouvrirFlashcardsSTI("all");
    });
    pan.appendChild(btnFlashPan);

    var btnSandboxPan = document.createElement("button");
    btnSandboxPan.type = "button";
    btnSandboxPan.textContent = "💻 Tester du code (Bac à sable)";
    btnSandboxPan.style.cssText = "display:block;width:100%;margin:6px 0 0 auto;border:1.5px solid #23201a;background:#fff;color:#23201a;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;cursor:pointer;";
    btnSandboxPan.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fermer();
      if (window.ouvrirSandboxSTI) window.ouvrirSandboxSTI();
    });
    pan.appendChild(btnSandboxPan);

    var btnBac = document.createElement("a");
    btnBac.id = "sti-btn-bac-pan";
    btnBac.href = cfg.RACINE + "bac-pratique.html";
    btnBac.textContent = "🧪 Atelier Bac Pratique (/20)";
    btnBac.hidden = !ok4SI;
    btnBac.style.cssText = "display:" + (ok4SI ? "block" : "none") + ";margin:6px 0 0 auto;border:1.5px solid #23201a;background:#f3ead9;color:#23201a;text-decoration:none;text-align:center;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;";
    pan.appendChild(btnBac);

    var btnProf = document.createElement("button");
    btnProf.type = "button";
    btnProf.textContent = "💬 Écrire au professeur";
    btnProf.style.cssText = "display:block;width:100%;margin:6px 0 0 auto;border:1.5px solid #23201a;background:#fff;color:#23201a;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;cursor:pointer;";
    btnProf.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      ouvrirBoiteQuestionProf(user.id, profil.classe || "");
    });
    pan.appendChild(btnProf);

    var btnOff = document.createElement("button");
    btnOff.id = "sti-btn-precache";
    btnOff.type = "button";
    var dejaCache = false;
    try { dejaCache = localStorage.getItem("sti-precache-100") === "1"; } catch (e) {}
    btnOff.textContent = dejaCache
      ? (navigator.onLine ? "✅ 100 % prêt hors-ligne" : "📴 Mode Hors-ligne actif")
      : "📲 Télécharger 100 % hors-ligne";
    btnOff.style.cssText = "display:block;width:100%;margin:6px 0 0 auto;border:1.5px solid #23201a;background:" +
      (dejaCache ? "#e3f6e8;color:#177245" : "#fff;color:#23201a") +
      ";border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;cursor:pointer;";
    btnOff.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        btnOff.textContent = "⏳ Téléchargement hors-ligne…";
        navigator.serviceWorker.controller.postMessage({ type: "PRECACHE_ALL" });
      } else {
        btnOff.textContent = "✅ Cache actif sur cet appareil";
      }
    });
    pan.appendChild(btnOff);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", function (evt) {
        if (!evt.data || evt.data.type !== "STI_OFFLINE_PROGRESS") return;
        var pct = evt.data.total ? Math.round((evt.data.done / evt.data.total) * 100) : 100;
        if (pct >= 100) {
          try { localStorage.setItem("sti-precache-100", "1"); } catch (e) {}
          btnOff.textContent = "✅ 100 % prêt hors-ligne";
          btnOff.style.background = "#e3f6e8";
          btnOff.style.color = "#177245";
        } else {
          btnOff.textContent = "⏳ Hors-ligne : " + pct + " %";
        }
      });
    }

    var btnImp = document.createElement("button");
    btnImp.id = "sti-btn-print-gold";
    btnImp.type = "button";
    btnImp.textContent = "🖨️ Imprimer";
    btnImp.style.cssText = "display:" + (isG ? "block" : "none") + ";width:100%;margin:6px 0 0 auto;border:2px solid #23201a;background:linear-gradient(120deg,#fff3b0,#ffd54f);color:#23201a;color-scheme:light;border-radius:9px;padding:6px 10px;font-weight:900;font-size:11.5px;cursor:pointer;box-shadow:2px 2px 0 #23201a;";
    btnImp.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      imprimerContenuGold();
    });
    pan.appendChild(btnImp);

    if (estClasseProfLabo(profil && profil.classe)) {
      var badgePerm = document.createElement("div");
      badgePerm.textContent = "🖥️ Poste Labo 3 · Session permanente";
      badgePerm.style.cssText = "display:block;width:100%;margin:6px 0 0 auto;border:1.5px solid #177245;background:#e3f6e8;color:#177245;text-align:center;border-radius:9px;padding:6px 10px;font-weight:900;font-size:11px;";
      pan.appendChild(badgePerm);
    }

    var out = document.createElement("button");
    out.id = "sti-out";
    out.type = "button";
    out.textContent = "🚪 Déconnexion";
    out.style.cssText = "display:block;width:100%;margin:6px 0 0 auto;border:2px solid #23201a;background:#fff;color:#c0392b;color-scheme:light;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;cursor:pointer;";
    out.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      sortirImmediatement("#deconnecte");
    });
    pan.appendChild(out);

    var porte = document.createElement("div");
    porte.className = "sti-wrap";
    porte.style.cssText = "position:relative;z-index:2;";
    var btn = document.createElement("button");
    btn.id = "sti-roue-btn";
    btn.type = "button";
    btn.className = "sti-roue";
    btn.textContent = "⚙️";
    btn.title = isG ? "Mon compte GOLD (capture & impression autorisées)" : "Mon compte";
    btn.style.cssText = "display:block;width:48px;height:48px;border-radius:50%;border:2px solid #23201a;background:" +
      (isG ? "radial-gradient(circle at 32% 30%,#fff6b3,#ffb300 68%)" : "radial-gradient(circle at 32% 30%,#ffb27a,#f4511e 68%)") +
      ";font-size:22px;line-height:1;cursor:pointer;box-shadow:3px 3px 0 #23201a,0 8px 20px -8px rgba(244,81,30,.7);";
    porte.appendChild(btn);

    var ouvert = false;
    function ouvrir() {
      ouvert = true;
      pan.classList.add("ouvert");
      porte.style.transform = "translateX(-" + (pan.offsetWidth + 14) + "px)";
      btn.style.transform = "rotate(720deg)";
    }
    function fermer() {
      ouvert = false;
      pan.classList.remove("ouvert");
      porte.style.transform = "translateX(0)";
      btn.style.transform = "rotate(0deg)";
    }
    btn.addEventListener("click", function () { ouvert ? fermer() : ouvrir(); });

    if (window === window.top && !sessionStorage.getItem("sti-demo")) {
      sessionStorage.setItem("sti-demo", "1");
      setTimeout(function () {
        ouvrir();
        setTimeout(fermer, 1700);
      }, 700);
    }

    wrap.appendChild(pan);
    wrap.appendChild(porte);
    (document.body || document.documentElement).appendChild(wrap);

    /* Calcul de la durée personnelle de la semaine en cours + récupération des scores serveur */
    rafraichirDureeEtScoresServeur(user.id);

    ecouterMessagesClasse(user.id, profil.classe || "");
  }

  /* ---------- Point 8 : Fenêtre « 💬 Messenger STI » Élève <-> Professeur (style Facebook Messenger) ---------- */
  function cleFilMessengerEleve(uid) {
    return "sti-msn-hist-" + (uid || "anon");
  }

  function lireFilMessengerEleve(uid) {
    try {
      var arr = JSON.parse(localStorage.getItem(cleFilMessengerEleve(uid)) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function fmtTailleFichierEleve(oct) {
    var n = Number(oct || 0);
    if (!n) return "";
    if (n < 1024) return n + " o";
    if (n < 1048576) return Math.max(1, Math.round(n / 1024)) + " Ko";
    return (n / 1048576).toFixed(1).replace(".", ",") + " Mo";
  }

  function telechargerFichierDataUrlEleve(nom, dataUrl) {
    if (!dataUrl) return;
    try {
      var parts = String(dataUrl).split(",");
      var meta = parts[0] || "";
      var b64 = parts[1] || "";
      var mimeMatch = meta.match(/data:([^;]+)/i);
      var mime = (mimeMatch && mimeMatch[1]) || "application/octet-stream";
      var bin = atob(b64);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var blob = new Blob([arr], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = nom || "fichier-sti";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2500);
    } catch (e) {
      window.open(dataUrl, "_blank", "noopener");
    }
  }

  function preparerFichierJointEleve(file, cb) {
    if (!file) return cb("Aucun fichier sélectionné.");
    var estImg = /^image\//i.test(file.type || "");
    var maxOctets = estImg ? 8 * 1048576 : 1572864; /* 8 Mo image (compressée auto) ou 1,5 Mo fichier */
    if (file.size > maxOctets) {
      return cb("Ce fichier est trop volumineux (max 1,5 Mo pour un document ou 8 Mo pour une image).");
    }
    var reader = new FileReader();
    reader.onerror = function () { cb("Impossible de lire ce fichier."); };
    reader.onload = function () {
      var res = String(reader.result || "");
      if (!estImg || file.size <= 95000 || /image\/(svg|gif)/i.test(file.type || "")) {
        return cb(null, {
          nom: file.name || "fichier",
          type: file.type || "application/octet-stream",
          taille: file.size || Math.round(res.length * 0.75),
          dataUrl: res
        });
      }
      var img = new Image();
      img.onerror = function () {
        cb(null, { nom: file.name || "image.jpg", type: file.type || "image/jpeg", taille: file.size, dataUrl: res });
      };
      img.onload = function () {
        try {
          var maxDim = 1100;
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            if (w >= h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
            else { w = Math.round(w * (maxDim / h)); h = maxDim; }
          }
          var cv = document.createElement("canvas");
          cv.width = w;
          cv.height = h;
          var ctx = cv.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          var outUrl = cv.toDataURL("image/jpeg", 0.82);
          var outBytes = Math.round((outUrl.length - 22) * 0.75);
          cb(null, {
            nom: (file.name || "image").replace(/\.[a-z0-9]+$/i, "") + ".jpg",
            type: "image/jpeg",
            taille: outBytes,
            dataUrl: outUrl
          });
        } catch (err) {
          cb(null, { nom: file.name || "image.jpg", type: file.type || "image/jpeg", taille: file.size, dataUrl: res });
        }
      };
      img.src = res;
    };
    reader.readAsDataURL(file);
  }

  function rendreBlocFichierJointEleve(f, surFondOrange) {
    if (!f || !f.nom) return "";
    var tStr = f.taille ? (" (" + fmtTailleFichierEleve(f.taille) + ")") : "";
    var bg = surFondOrange ? "rgba(0,0,0,.18)" : "#f3ead9";
    var col = surFondOrange ? "#fff" : "#23201a";
    var bdr = surFondOrange ? "rgba(255,255,255,.45)" : "#23201a";
    var estImg = f.dataUrl && /^data:image\//i.test(f.dataUrl);
    var htmlImg = estImg
      ? ("<img src='" + esc(f.dataUrl) + "' alt='" + esc(f.nom) + "' class='sti-msn-img-zoom' style='max-width:220px;max-height:160px;border-radius:10px;border:1.5px solid " + bdr + ";display:block;margin-bottom:5px;cursor:zoom-in;object-fit:cover' />")
      : "";
    var btnDl = f.dataUrl
      ? ("<button type='button' class='sti-msn-dl-btn' data-nom='" + esc(f.nom) + "' data-url='" + esc(f.dataUrl) + "' style='border:1.5px solid " + bdr + ";background:" + (surFondOrange ? "#fff" : "#f4511e") + ";color:" + (surFondOrange ? "#23201a" : "#fff") + ";border-radius:999px;padding:3px 9px;font:900 10.5px system-ui,sans-serif;cursor:pointer;flex-shrink:0'>⬇ Télécharger</button>")
      : "<span style='font-size:10px;opacity:.8'>⏳ Chargement…</span>";
    return (
      "<div style='margin-top:5px;margin-bottom:3px;padding:6px 9px;border-radius:10px;background:" + bg + ";border:1.5px solid " + bdr + ";color:" + col + "'>" +
        htmlImg +
        "<div style='display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'>" +
          "<span style='font-size:11.5px;font-weight:800;word-break:break-all'>📎 " + esc(f.nom) + esc(tStr) + "</span>" +
          btnDl +
        "</div>" +
      "</div>"
    );
  }

  function brancherActionsFichiersConteneur(conteneur) {
    if (!conteneur) return;
    Array.prototype.forEach.call(conteneur.querySelectorAll(".sti-msn-dl-btn"), function (b) {
      if (b._stiBound) return;
      b._stiBound = true;
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        telechargerFichierDataUrlEleve(b.getAttribute("data-nom") || "fichier", b.getAttribute("data-url") || "");
      });
    });
    Array.prototype.forEach.call(conteneur.querySelectorAll(".sti-msn-img-zoom"), function (im) {
      if (im._stiBound) return;
      im._stiBound = true;
      im.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var ov = document.createElement("div");
        ov.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;";
        ov.innerHTML =
          "<img src='" + esc(im.getAttribute("src") || "") + "' style='max-width:94vw;max-height:82vh;border-radius:12px;border:3px solid #fff;box-shadow:0 16px 50px rgba(0,0,0,.5)' />" +
          "<div style='margin-top:12px;display:flex;gap:10px'>" +
            "<button type='button' id='sti-zoom-dl' style='border:2px solid #23201a;background:#f4511e;color:#fff;border-radius:999px;padding:7px 16px;font:900 12.5px system-ui,sans-serif;cursor:pointer'>⬇ Télécharger l'image</button>" +
            "<button type='button' style='border:2px solid #fff;background:transparent;color:#fff;border-radius:999px;padding:7px 16px;font:900 12.5px system-ui,sans-serif;cursor:pointer'>✕ Fermer</button>" +
          "</div>";
        ov.querySelector("#sti-zoom-dl").addEventListener("click", function (e2) {
          e2.stopPropagation();
          telechargerFichierDataUrlEleve(im.getAttribute("alt") || "image.jpg", im.getAttribute("src") || "");
        });
        ov.addEventListener("click", function () { ov.remove(); });
        (document.body || document.documentElement).appendChild(ov);
      });
    });
  }

  function enregistrerMsgFilEleve(uid, item) {
    if (!item || (!item.texte && !item.fichier)) return;
    var fil = lireFilMessengerEleve(uid);
    var idxEx = -1;
    if (item.id) {
      for (var i = 0; i < fil.length; i++) {
        if (fil[i].id === item.id) { idxEx = i; break; }
      }
    }
    if (idxEx !== -1) {
      if (item.fichier && item.fichier.dataUrl && (!fil[idxEx].fichier || !fil[idxEx].fichier.dataUrl)) {
        fil[idxEx].fichier = item.fichier;
        try { localStorage.setItem(cleFilMessengerEleve(uid), JSON.stringify(fil)); } catch (e) {}
      }
      return;
    }
    fil.push({
      id: item.id || ("loc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6)),
      de: item.de || "eleve", /* "prof" | "eleve" */
      texte: item.texte || (item.fichier ? ("📎 Fichier : " + item.fichier.nom) : ""),
      enReponseA: item.enReponseA || "",
      fichier: item.fichier || null,
      perso: Boolean(item.perso),
      ts: item.ts || new Date().toISOString()
    });
    if (fil.length > 60) fil = fil.slice(fil.length - 60);
    try {
      localStorage.setItem(cleFilMessengerEleve(uid), JSON.stringify(fil));
    } catch (e) {
      /* Si quota localStorage atteint à cause d'anciens fichiers, garder les 15 derniers */
      try {
        fil = fil.slice(-15);
        localStorage.setItem(cleFilMessengerEleve(uid), JSON.stringify(fil));
      } catch (e2) {}
    }
  }

  function fmtHeureMsn(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function envoyerAccuseLectureProf(uid, a, texteRep, fichierJoint) {
    if (!a || !a.id) return;
    try { localStorage.setItem("sti-msg-lu-" + a.id, "1"); } catch (e) {}
    var tsNow = new Date().toISOString();
    var lieuVal = (texteRep || fichierJoint)
      ? JSON.stringify({ classe: a.classe || "*", reponse: texteRep || "", fichier: fichierJoint || undefined })
      : (a.classe || "*");
    var ligneLu = {
      user_id: uid || currentUid || "offline-user",
      page: "MSG_LU:" + a.id,
      lieu: lieuVal,
      fin: tsNow,
      duree_sec: 0
    };
    if (!navigator.onLine) {
      empilerHorsLigne(ligneLu);
      return;
    }
    sb.from("acces").insert(ligneLu).then(function (r) {
      if (r && r.error) empilerHorsLigne(ligneLu);
    }).catch(function () {
      empilerHorsLigne(ligneLu);
    });
    try {
      sb.channel("sti-diffusion").send({
        type: "broadcast",
        event: "lu",
        payload: { msgId: a.id, uid: uid, ts: tsNow, reponse: texteRep || "", fichier: fichierJoint || undefined }
      });
    } catch (e) {}
    var fNtfy = fichierJoint
      ? (JSON.stringify(fichierJoint).length < 2600 ? fichierJoint : { nom: fichierJoint.nom, type: fichierJoint.type, taille: fichierJoint.taille, depuisDb: true })
      : undefined;
    fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
      method: "POST",
      body: JSON.stringify({ type: "lu", msgId: a.id, uid: uid, ts: tsNow, reponse: texteRep || "", fichier: fNtfy })
    }).catch(function () {});
  }

  var fichierEnAttenteEleve = null;

  function ouvrirBoiteQuestionProf(uid, maClasse, dernierMsgProfId) {
    var exOld = document.getElementById("sti-modal-qprof");
    if (exOld) exOld.remove();
    var bulleMin = document.getElementById("sti-msn-bulle-eleve");
    if (bulleMin) bulleMin.remove();

    var win = document.getElementById("sti-messenger-eleve");
    if (!win) {
      win = document.createElement("div");
      win.id = "sti-messenger-eleve";
      win.className = "sti-no-print";
      win.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(380px,calc(100vw - 24px));height:min(500px,82vh);" +
        "background:#fffdf7;color:#23201a;color-scheme:light;border:2.5px solid #23201a;border-radius:20px;" +
        "box-shadow:6px 6px 0 #f4511e,0 20px 50px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden;" +
        "font:600 13px/1.42 system-ui,'Segoe UI',sans-serif;";

      win.innerHTML =
        "<div style='background:linear-gradient(120deg,#23201a,#3a3228);color:#fffdf7;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:2.5px solid #f4511e'>" +
          "<div style='display:flex;align-items:center;gap:9px;min-width:0'>" +
            "<div style='position:relative;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f4511e,#ff8a50);border:2px solid #fffdf7;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0'>👨‍🏫" +
              "<span style='position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#2ecc71;border:2px solid #23201a'></span>" +
            "</div>" +
            "<div style='min-width:0'>" +
              "<div style='font-weight:900;font-size:13.5px;color:#fffdf7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>M. Aymen Essouyah</div>" +
              "<div style='font-size:10.5px;color:#ffb27a;font-weight:700'>🟢 Messenger STI · Messages &amp; Fichiers</div>" +
            "</div>" +
          "</div>" +
          "<div style='display:flex;gap:5px;flex-shrink:0'>" +
            "<button type='button' id='sti-msn-el-min' title='Réduire en bulle' style='width:27px;height:27px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;font-weight:900;cursor:pointer'>—</button>" +
            "<button type='button' id='sti-msn-el-close' title='Fermer' style='width:27px;height:27px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;font-weight:900;cursor:pointer'>✕</button>" +
          "</div>" +
        "</div>" +
        "<div id='sti-msn-el-feed' style='flex:1;overflow-y:auto;padding:12px;background:#f9f1e3;display:flex;flex-direction:column;gap:9px'></div>" +
        "<div id='sti-msn-el-filebar' style='display:none;align-items:center;justify-content:space-between;gap:8px;padding:6px 12px;background:#fff3e0;border-top:1.5px solid #f4511e;font-size:11.5px;font-weight:800;color:#23201a'>" +
          "<span id='sti-msn-el-filename' style='overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>📎 fichier</span>" +
          "<button type='button' id='sti-msn-el-fileclear' style='border:1px solid #23201a;background:#fff;color:#c0392b;border-radius:999px;padding:1px 7px;font-size:10.5px;font-weight:900;cursor:pointer'>✕</button>" +
        "</div>" +
        "<form id='sti-msn-el-form' style='padding:9px 10px;background:#fffdf7;border-top:2px solid #23201a;display:flex;align-items:center;gap:6px;margin:0'>" +
          "<input type='file' id='sti-msn-el-file' style='display:none' accept='image/*,.pdf,.sql,.php,.html,.htm,.css,.js,.txt,.zip,.rar,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.json' />" +
          "<button type='button' id='sti-msn-el-attach' title='Joindre un fichier ou une image (capture, code, PDF…)' style='width:34px;height:34px;border-radius:50%;border:1.8px solid #23201a;background:#fff3e0;color:#23201a;font-size:15px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center'>📎</button>" +
          "<input type='text' id='sti-msn-el-inp' placeholder='Écrire un message ou joindre un fichier…' autocomplete='off' style='flex:1;min-width:0;border:2px solid #23201a;border-radius:999px;padding:8px 12px;font:600 12.5px system-ui,sans-serif;background:#fff;color:#23201a;outline:none' />" +
          "<button type='submit' title='Envoyer' style='width:36px;height:36px;border-radius:50%;border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;font-weight:900;font-size:14px;cursor:pointer;box-shadow:2px 2px 0 #23201a;flex-shrink:0'>➤</button>" +
        "</form>";

      (document.body || document.documentElement).appendChild(win);

      var fileInput = win.querySelector("#sti-msn-el-file");
      var fileBar = win.querySelector("#sti-msn-el-filebar");
      var fileNameEl = win.querySelector("#sti-msn-el-filename");
      var fileClearBtn = win.querySelector("#sti-msn-el-fileclear");
      var attachBtn = win.querySelector("#sti-msn-el-attach");
      var txtInp = win.querySelector("#sti-msn-el-inp");

      function majBarreFichierEleve() {
        if (!fileBar || !fileNameEl) return;
        if (fichierEnAttenteEleve) {
          fileBar.style.display = "flex";
          fileNameEl.textContent = "📎 " + fichierEnAttenteEleve.nom + " (" + fmtTailleFichierEleve(fichierEnAttenteEleve.taille) + ")";
        } else {
          fileBar.style.display = "none";
          fileNameEl.textContent = "";
          if (fileInput) fileInput.value = "";
        }
      }

      function selectionnerFichierEleve(f) {
        if (!f) return;
        preparerFichierJointEleve(f, function (err, obj) {
          if (err) {
            alert("⚠️ " + err);
            return;
          }
          fichierEnAttenteEleve = obj;
          majBarreFichierEleve();
          if (txtInp) txtInp.focus();
        });
      }

      attachBtn.addEventListener("click", function () {
        if (fileInput) fileInput.click();
      });
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files[0]) {
          selectionnerFichierEleve(fileInput.files[0]);
        }
      });
      fileClearBtn.addEventListener("click", function () {
        fichierEnAttenteEleve = null;
        majBarreFichierEleve();
      });
      /* Support du collage direct d'une capture d'écran (Ctrl+V) */
      txtInp.addEventListener("paste", function (ev) {
        var items = (ev.clipboardData && ev.clipboardData.items) || [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].kind === "file") {
            var f = items[i].getAsFile();
            if (f) {
              selectionnerFichierEleve(f);
              break;
            }
          }
        }
      });

      win.querySelector("#sti-msn-el-close").addEventListener("click", function () {
        win.remove();
      });
      win.querySelector("#sti-msn-el-min").addEventListener("click", function () {
        win.remove();
        afficherBulleMinimiseeEleve(uid, maClasse, 0);
      });
      win.querySelector("#sti-msn-el-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var inp = win.querySelector("#sti-msn-el-inp");
        var txt = inp ? inp.value.trim() : "";
        var fJoint = fichierEnAttenteEleve;
        if (!txt && !fJoint) return;
        if (inp) inp.value = "";
        fichierEnAttenteEleve = null;
        majBarreFichierEleve();

        var tsNow = new Date().toISOString();
        enregistrerMsgFilEleve(uid, { de: "eleve", texte: txt, fichier: fJoint, ts: tsNow });
        peindreFilMessengerEleve(uid);

        var cibleMsgId = win.getAttribute("data-reply-msgid") || "libre";
        win.removeAttribute("data-reply-msgid");
        var info = JSON.stringify({
          classe: maClasse || "*",
          reponse: txt || (fJoint ? ("📎 Fichier joint : " + fJoint.nom) : ""),
          fichier: fJoint || undefined,
          page: chemin
        });
        var ligneMsg = {
          user_id: uid,
          page: "MSG_LU:" + cibleMsgId,
          lieu: info,
          fin: tsNow,
          duree_sec: 0
        };
        if (!navigator.onLine) {
          empilerHorsLigne(ligneMsg);
          return;
        }
        sb.from("acces").insert(ligneMsg).then(function (r) {
          if (r && r.error) empilerHorsLigne(ligneMsg);
        }).catch(function () {
          empilerHorsLigne(ligneMsg);
        });
        var repTexte = txt || (fJoint ? ("📎 Fichier joint : " + fJoint.nom) : "");
        try {
          sb.channel("sti-diffusion").send({
            type: "broadcast",
            event: "lu",
            payload: { msgId: cibleMsgId, uid: uid, ts: tsNow, reponse: repTexte, fichier: fJoint || undefined }
          });
        } catch (err) {}
        var fNtfy = fJoint
          ? (JSON.stringify(fJoint).length < 2600 ? fJoint : { nom: fJoint.nom, type: fJoint.type, taille: fJoint.taille, depuisDb: true })
          : undefined;
        fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
          method: "POST",
          body: JSON.stringify({ type: "lu", msgId: cibleMsgId, uid: uid, ts: tsNow, reponse: repTexte, fichier: fNtfy })
        }).catch(function () {});
      });
    }

    if (dernierMsgProfId) {
      win.setAttribute("data-reply-msgid", dernierMsgProfId);
    }
    peindreFilMessengerEleve(uid);
    var inpFocus = win.querySelector("#sti-msn-el-inp");
    if (inpFocus) setTimeout(function () { inpFocus.focus(); }, 40);
  }

  function peindreFilMessengerEleve(uid) {
    var win = document.getElementById("sti-messenger-eleve");
    if (!win) return;
    var feed = win.querySelector("#sti-msn-el-feed");
    if (!feed) return;
    var fil = lireFilMessengerEleve(uid);
    if (!fil.length) {
      feed.innerHTML =
        "<div style='margin:auto;text-align:center;padding:20px;color:#7a6f5d;font-size:12px'>" +
          "<div style='font-size:30px;margin-bottom:6px'>💬</div>" +
          "<b>Discussion directe avec M. Essouyah</b><br>" +
          "Posez votre question, répondez aux messages ou joignez un fichier (<b>📎</b>) ici comme sur Messenger." +
        "</div>";
      return;
    }
    feed.innerHTML = fil.map(function (m) {
      var estProf = m.de === "prof";
      var cit = m.enReponseA
        ? ("<div style='font-size:11px;padding:4px 8px;margin-bottom:5px;border-radius:7px;background:rgba(0,0,0,.07);border-left:3px solid #f4511e;opacity:.9'>↩️ « " + esc(m.enReponseA) + " »</div>")
        : "";
      var tagType = estProf
        ? ("<div style='font-size:10px;font-weight:900;color:#d84315;margin-bottom:3px'>" + (m.perso ? "📩 M. Essouyah (Personnel)" : "📢 M. Essouyah (Classe)") + "</div>")
        : "";
      var blocFichier = rendreBlocFichierJointEleve(m.fichier, !estProf);
      var blocTexte = m.texte
        ? ("<div style='white-space:pre-wrap;font-weight:700;font-size:12.8px'>" + esc(m.texte) + "</div>")
        : "";
      if (estProf) {
        return (
          "<div style='display:flex;align-items:flex-end;gap:7px;max-width:88%;align-self:flex-start'>" +
            "<div style='width:26px;height:26px;border-radius:50%;background:#23201a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0'>👨‍🏫</div>" +
            "<div style='background:#ffffff;color:#23201a;border:2px solid #23201a;border-radius:16px 16px 16px 4px;padding:8px 12px;box-shadow:2px 2px 0 rgba(35,32,26,.18)'>" +
              tagType +
              cit +
              blocTexte +
              blocFichier +
              "<div style='font-size:10px;color:#7a6f5d;text-align:right;margin-top:3px'>" + esc(fmtHeureMsn(m.ts)) + "</div>" +
            "</div>" +
          "</div>"
        );
      }
      return (
        "<div style='display:flex;flex-direction:column;max-width:86%;align-self:flex-end'>" +
          "<div style='background:linear-gradient(135deg,#f4511e,#ff7043);color:#fff;border:2px solid #23201a;border-radius:16px 16px 4px 16px;padding:8px 12px;box-shadow:2px 2px 0 #23201a'>" +
            blocTexte +
            blocFichier +
            "<div style='font-size:10px;color:rgba(255,255,255,.88);text-align:right;margin-top:3px'>" + esc(fmtHeureMsn(m.ts)) + " · ✓✓</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
    brancherActionsFichiersConteneur(feed);
    feed.scrollTop = feed.scrollHeight;
  }

  function afficherBulleMinimiseeEleve(uid, maClasse, nbNonLus) {
    var ex = document.getElementById("sti-msn-bulle-eleve");
    if (ex) ex.remove();
    var b = document.createElement("button");
    b.type = "button";
    b.id = "sti-msn-bulle-eleve";
    b.className = "sti-no-print";
    b.title = "Ouvrir la discussion Messenger avec M. Essouyah";
    b.style.cssText =
      "position:fixed;right:16px;bottom:68px;z-index:2147483646;width:50px;height:50px;border-radius:50%;" +
      "border:2.5px solid #23201a;background:linear-gradient(135deg,#f4511e,#ff8a50);color:#fff;font-size:22px;" +
      "display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:4px 4px 0 #23201a,0 10px 24px rgba(0,0,0,.28);";
    b.innerHTML = "💬" + (nbNonLus > 0
      ? ("<span style='position:absolute;top:-5px;right:-5px;background:#c0392b;color:#fff;border:2px solid #fff;border-radius:999px;padding:1px 6px;font:900 10.5px system-ui,sans-serif'>" + nbNonLus + "</span>")
      : "");
    b.addEventListener("click", function () {
      b.remove();
      ouvrirBoiteQuestionProf(uid, maClasse);
    });
    (document.body || document.documentElement).appendChild(b);
  }

  /* ---------- Point 6 : Bandeau de Contrôle / Test chronométré lancé par l'Admin ---------- */
  var timerControle = null;
  function afficherControleChrono(ctrl) {
    if (!ctrl || !ctrl.id) return;
    if (ctrl.action === "stop") {
      var bEx = document.getElementById("sti-barre-controle");
      if (bEx) bEx.remove();
      clearInterval(timerControle);
      try { localStorage.removeItem("sti-ctrl-actif"); } catch (e) {}
      return;
    }
    if (ctrl.classe && ctrl.classe !== "*" && ctrl.classe !== currentClasse) return;
    var finMs = Number(ctrl.finMs || 0);
    if (!finMs || Date.now() >= finMs) return;
    try { localStorage.setItem("sti-ctrl-actif", JSON.stringify(ctrl)); } catch (e) {}

    var barre = document.getElementById("sti-barre-controle");
    if (!barre) {
      barre = document.createElement("div");
      barre.id = "sti-barre-controle";
      barre.className = "sti-no-print";
      barre.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:linear-gradient(120deg,#23201a,#3a3228);color:#fffdf7;border-bottom:3px solid #f4511e;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font:800 13px/1.3 system-ui,'Segoe UI',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);";
      (document.body || document.documentElement).appendChild(barre);
    }

    function majTimer() {
      var restSec = Math.max(0, Math.round((finMs - Date.now()) / 1000));
      var mm = ("0" + Math.floor(restSec / 60)).slice(-2);
      var ss = ("0" + (restSec % 60)).slice(-2);
      var btnLien = "";
      if (ctrl.url && location.pathname.indexOf(ctrl.url) === -1) {
        btnLien = "<a href='" + cfg.RACINE + ctrl.url + "' style='background:#f4511e;color:#fff;text-decoration:none;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:900;border:1.5px solid #fff'>📝 Ouvrir l'épreuve</a>";
      }
      barre.innerHTML =
        "<div>⏱️ <span style='color:#ffd54f'>CONTRÔLE EN COURS :</span> " + esc(ctrl.titre || "Évaluation STI") + "</div>" +
        "<div style='display:flex;align-items:center;gap:10px'>" +
        btnLien +
        "<span style='background:#c0392b;color:#fff;padding:4px 11px;border-radius:999px;font-family:monospace;font-size:14px;border:1.5px solid #fff'>⏳ " + mm + ":" + ss + "</span>" +
        "</div>";
      if (restSec <= 0) {
        clearInterval(timerControle);
        try { localStorage.removeItem("sti-ctrl-actif"); } catch (e) {}
        barre.innerHTML = "<div style='color:#ffd54f'>⏹️ Temps écoulé pour le contrôle « " + esc(ctrl.titre || "Évaluation STI") + " » ! Votre participation a été enregistrée.</div>";
        setTimeout(function () { if (barre.parentNode) barre.remove(); }, 6000);
      }
    }
    clearInterval(timerControle);
    majTimer();
    timerControle = setInterval(majTimer, 1000);
  }

  /* Restauration d'un contrôle en cours si l'élève change de page */
  try {
    var ctrlSauv = JSON.parse(localStorage.getItem("sti-ctrl-actif") || "null");
    if (ctrlSauv && ctrlSauv.finMs > Date.now()) {
      setTimeout(function () { afficherControleChrono(ctrlSauv); }, 400);
    }
  } catch (e) {}

  /* ---------- réception des messages groupés + réponses élèves + signaux d'expulsion/Gold/Contrôle ---------- */
  function ecouterMessagesClasse(uid, maClasse) {
    var demarreA = Date.now();

    function traiterSignalStatut(ev) {
      if (!ev || ev.type !== "statut" || ev.uid !== uid) return;
      if (ev.ts && ev.ts < demarreA - 15000) return;
      if (ev.statut === "exclu") sortirImmediatement("#exclu");
      else if (ev.statut === "en_attente") sortirImmediatement("#attente");
      else if (ev.statut === "supprime" || ev.statut !== "actif") sortirImmediatement("#refuse");
      else if (typeof ev.gold === "boolean") appliquerModeGold(ev.gold);
    }

    function estAnnoncePourMoi(a) {
      if (!a || !a.id || (!a.texte && !a.fichier) || a.type) return false;
      var cl = String(a.classe || "");
      if (a.uid) return a.uid === uid;
      if (cl.indexOf("UID:") === 0) return cl.slice(4) === uid;
      return cl === "*" || cl === maClasse;
    }

    function afficherAnnonce(a) {
      if (!estAnnoncePourMoi(a)) return;
      var estPerso = Boolean(a.uid) || String(a.classe || "").indexOf("UID:") === 0;
      enregistrerMsgFilEleve(uid, {
        id: a.id,
        de: "prof",
        texte: a.texte || "",
        enReponseA: a.enReponseA || "",
        fichier: a.fichier || null,
        perso: estPerso,
        ts: a.ts
      });

      /* Si le fichier joint a été allégé pour ntfy.sh (depuisDb), charger le contenu complet depuis Supabase */
      if (a.fichier && a.fichier.depuisDb && !a.fichier.dataUrl && navigator.onLine) {
        sb.from("acces").select("lieu").eq("page", "MSG_ENVOI:" + a.id).limit(1).then(function (r) {
          if (r && r.data && r.data[0] && r.data[0].lieu) {
            try {
              var full = JSON.parse(r.data[0].lieu);
              if (full && full.fichier && full.fichier.dataUrl) {
                a.fichier = full.fichier;
                enregistrerMsgFilEleve(uid, {
                  id: a.id,
                  de: "prof",
                  texte: a.texte || "",
                  enReponseA: a.enReponseA || "",
                  fichier: full.fichier,
                  perso: estPerso,
                  ts: a.ts
                });
                peindreFilMessengerEleve(uid);
              }
            } catch (e) {}
          }
        });
      }

      /* Si la fenêtre Messenger est déjà ouverte, ou si c'est un message personnel / une réponse directe :
         on l'affiche directement dans la fenêtre Messenger ! */
      var winMsn = document.getElementById("sti-messenger-eleve");
      if (winMsn) {
        peindreFilMessengerEleve(uid);
        winMsn.setAttribute("data-reply-msgid", a.id);
        envoyerAccuseLectureProf(uid, a, "");
        return;
      }

      try { if (localStorage.getItem("sti-msg-lu-" + a.id) === "1") return; } catch (e) {}

      if (estPerso) {
        ouvrirBoiteQuestionProf(uid, maClasse, a.id);
        envoyerAccuseLectureProf(uid, a, "");
        return;
      }

      if (document.getElementById("sti-annonce-" + a.id)) return;

      var boite = document.createElement("div");
      boite.id = "sti-annonce-" + a.id;
      boite.style.cssText = "position:fixed;left:50%;top:22px;transform:translateX(-50%);z-index:2147483647;max-width:450px;width:calc(100vw - 28px);background:#fffdf7;color:#23201a;color-scheme:light;border:2.5px solid #23201a;border-radius:18px;padding:18px 20px;box-shadow:6px 6px 0 #f4511e,0 16px 36px rgba(0,0,0,.22);font:600 13.5px/1.5 system-ui,'Segoe UI',sans-serif;";
      var enteteTxt = "📢 Message de M. Essouyah · " + (a.classe === "*" ? "Toutes les classes" : a.classe);
      var blocFichierAnnonce = rendreBlocFichierJointEleve(a.fichier, false);
      boite.innerHTML =
        "<div style='font-weight:900;font-size:15px;color:#f4511e;margin-bottom:6px'>" + esc(enteteTxt) + "</div>" +
        (a.texte ? ("<div style='white-space:pre-wrap;color:#23201a;margin-bottom:8px;font-weight:700'>" + esc(a.texte) + "</div>") : "") +
        (blocFichierAnnonce ? ("<div style='margin-bottom:10px'>" + blocFichierAnnonce + "</div>") : "") +
        "<input type='text' id='sti-rep-" + a.id + "' placeholder='💬 Votre réponse au professeur (facultatif)…' style='width:100%;border:1.5px solid #23201a;border-radius:9px;padding:7px 10px;font-size:12.5px;margin-bottom:10px;background:#fff;color:#23201a' />" +
        "<div style='display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap'>" +
          "<button type='button' id='sti-open-msn-" + a.id + "' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:6px 13px;font-weight:800;font-size:12px;cursor:pointer'>💬 Ouvrir Messenger / 📎</button>" +
          "<button type='button' id='sti-ok-msn-" + a.id + "' style='border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border-radius:999px;padding:7px 18px;font-weight:900;font-size:12.5px;cursor:pointer;box-shadow:2px 2px 0 #23201a'>✅ J'ai lu / Répondre</button>" +
        "</div>";
      brancherActionsFichiersConteneur(boite);
      boite.querySelector("#sti-open-msn-" + a.id).addEventListener("click", function () {
        boite.remove();
        envoyerAccuseLectureProf(uid, a, "");
        ouvrirBoiteQuestionProf(uid, maClasse, a.id);
      });
      boite.querySelector("#sti-ok-msn-" + a.id).addEventListener("click", function () {
        var inpRep = document.getElementById("sti-rep-" + a.id);
        var texteRep = inpRep ? inpRep.value.trim() : "";
        if (texteRep) {
          enregistrerMsgFilEleve(uid, { de: "eleve", texte: texteRep, ts: new Date().toISOString() });
        }
        boite.remove();
        envoyerAccuseLectureProf(uid, a, texteRep);
      });
      (document.body || document.documentElement).appendChild(boite);
    }

    function verifierDiffusion() {
      if (enSortie || !navigator.onLine) return;
      fetch("https://ntfy.sh/" + CANAL_DIFFUSION + "/json?poll=1&since=all")
        .then(function (r) { return r.text(); })
        .then(function (txt) {
          var lignes = (txt || "").trim().split("\n");
          var derniereAnnonce = null;
          var dernierCtrl = null;
          for (var i = 0; i < lignes.length; i++) {
            if (!lignes[i]) continue;
            try {
              var evt = JSON.parse(lignes[i]);
              if (evt && evt.message) {
                var a = JSON.parse(evt.message);
                if (a && a.type === "statut" && a.uid === uid) {
                  traiterSignalStatut(a);
                } else if (a && a.type === "controle") {
                  dernierCtrl = a;
                } else if (estAnnoncePourMoi(a)) {
                  derniereAnnonce = a;
                }
              }
            } catch (e) {}
          }
          if (derniereAnnonce) afficherAnnonce(derniereAnnonce);
          if (dernierCtrl) afficherControleChrono(dernierCtrl);
        })
        .catch(function () {});
    }

    verifierDiffusion();
    setInterval(verifierDiffusion, 12000);
    window.addEventListener("online", verifierDiffusion);
    try {
      sb.channel("sti-diffusion")
        .on("broadcast", { event: "annonce" }, function (p) {
          if (p && p.payload) afficherAnnonce(p.payload);
        })
        .on("broadcast", { event: "statut" }, function (p) {
          if (p && p.payload) traiterSignalStatut(p.payload);
        })
        .on("broadcast", { event: "controle" }, function (p) {
          if (p && p.payload) afficherControleChrono(p.payload);
        })
        .subscribe();
    } catch (e) {}
  }

  /* ---------- badge ADMIN visible sur tout le site (droite, au-dessus de ⚙️) + bouton Imprimer Gold + compteur de demandes ---------- */
  function badgeAdmin() {
    var exAdm = document.getElementById("sti-badge-admin-flottant");
    if (exAdm) exAdm.remove();
    var cont = document.createElement("div");
    cont.id = "sti-badge-admin-flottant";
    cont.className = "sti-no-print";
    cont.style.cssText = "position:fixed;right:10px;top:calc(50% - 78px);transform:translateY(-50%);z-index:2147483645;display:flex;flex-direction:column;align-items:flex-end;gap:8px;";

    var b = document.createElement("a");
    b.href = PORTAIL.replace("portail.html", "admin.html");
    b.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M7.5 16.5v-4.5M12 16.5V8M16.5 16.5V5.5" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg><span id="sti-adm-nb" style="display:none;margin-left:5px;background:#fff;color:#c0392b;border-radius:999px;padding:2px 6px;font-size:11px;font-weight:900;">0</span>';
    b.title = "Tableau de bord administrateur (Mode 👑 GOLD actif par défaut)";
    b.style.cssText = "background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border:2px solid #23201a;border-radius:999px;padding:9px 11px;font:900 11.5px/1 system-ui,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;letter-spacing:1px;text-decoration:none;box-shadow:3px 3px 0 #23201a;";

    var btnP = document.createElement("button");
    btnP.type = "button";
    btnP.textContent = "🖨️";
    btnP.title = "👑 Admin Gold — Imprimer la page ou la boîte ouverte (Ctrl+P et copie autorisés)";
    btnP.style.cssText = "background:linear-gradient(120deg,#fff3b0,#ffd54f);color:#23201a;border:2px solid #23201a;border-radius:999px;padding:8px 11px;font:900 15px/1 system-ui,'Segoe UI',sans-serif;cursor:pointer;box-shadow:3px 3px 0 #23201a;";
    btnP.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      imprimerContenuGold();
    });

    cont.appendChild(b);
    cont.appendChild(btnP);
    (document.body || document.documentElement).appendChild(cont);

    function verifAttente() {
      sb.from("profiles").select("id,email,phone,nom,prenom,statut").eq("statut", "en_attente").then(function (r) {
        if (r.error || !r.data) return;
        var liste = r.data.filter(function (p) {
          return (p.email || "").toLowerCase() !== (cfg.ADMIN || "").toLowerCase();
        });
        var pastille = document.getElementById("sti-adm-nb");
        if (pastille) {
          pastille.style.display = liste.length ? "inline-block" : "none";
          pastille.textContent = "🔔 " + liste.length;
        }
        var vus = {};
        try { vus = JSON.parse(localStorage.getItem("sti-admin-vus") || "{}"); } catch (e) {}
        liste.forEach(function (p) {
          if (!vus[p.id]) {
            vus[p.id] = 1;
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification("🆕 Nouvelle demande STI V2.0", {
                  body: (p.prenom || p.nom ? (p.prenom + " " + p.nom).trim() : (p.email || p.phone || "Nouvel abonné")) + " attend votre validation."
                });
              } catch (e) {}
            }
          }
        });
        try { localStorage.setItem("sti-admin-vus", JSON.stringify(vus)); } catch (e) {}
      });
    }
    verifAttente();
    setInterval(verifAttente, 20000);
  }

  /* ---------- verrou biométrique ---------- */
  function verrouBio(user, suite) {
    if (window !== window.top || user.email === cfg.ADMIN || !localStorage.getItem("sti-bio")) { suite(); return; }
    if (!navigator.credentials || !window.PublicKeyCredential) { suite(); return; }
    var ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(249,241,227,.97);display:flex;align-items:center;justify-content:center;font-family:system-ui,'Segoe UI',sans-serif;";
    ov.innerHTML = '<div style="text-align:center;color:#23201a"><div style="font-size:56px">🖐</div>' +
      '<p style="font-weight:900;font-size:17px;margin:12px 0 18px">Vérification biométrique</p>' +
      '<button id="bio-go" style="border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border-radius:999px;padding:13px 28px;font-weight:900;font-size:15px;cursor:pointer;box-shadow:4px 4px 0 #23201a">Toucher le capteur</button>' +
      '<p style="color:#7a6f5d;font-size:12px;margin-top:14px">ou <a href="' + PORTAIL + '#connexion" style="color:#f4511e;font-weight:700">utilisez votre mot de passe</a></p>' +
      '<p id="bio-err" style="color:#c0392b;font-size:12px;margin-top:10px;min-height:16px;font-weight:700"></p></div>';
    document.documentElement.appendChild(ov);
    ov.querySelector("#bio-go").addEventListener("click", function () {
      var ch = crypto.getRandomValues(new Uint8Array(32));
      navigator.credentials.get({ publicKey: { challenge: ch, userVerification: "required", timeout: 30000 } })
        .then(function () { ov.remove(); suite(); })
        .catch(function () {
          ov.querySelector("#bio-err").textContent = "Échec biométrique — utilisez le mot de passe.";
        });
    });
  }

  /* ---------- journal : lieu + durée + présence temps réel (toutes les 30 s) + mode hors-ligne ---------- */
  function journal(uid) {
    if (window !== window.top) return;
    var lieu = "inconnu";
    function envoyerPresence() {
      if (!navigator.onLine) return;
      try {
        sb.channel("sti-diffusion").send({
          type: "broadcast",
          event: "presence",
          payload: { uid: uid, page: chemin, ts: Date.now() }
        });
      } catch (e) {}
    }
    function suiviHorsLigne() {
      var debutOff = Date.now();
      var cleSession = "off-" + debutOff;
      function majFileOff() {
        var duree = Math.max(1, Math.round((Date.now() - debutOff) / 1000));
        try {
          var q = JSON.parse(localStorage.getItem(CLE_FILE_OFFLINE) || "[]");
          var trouve = false;
          for (var i = 0; i < q.length; i++) {
            if (q[i] && q[i]._sid === cleSession) {
              q[i].fin = new Date().toISOString();
              q[i].duree_sec = duree;
              trouve = true;
              break;
            }
          }
          if (!trouve) {
            q.push({
              _sid: cleSession,
              user_id: uid,
              lieu: "Hors-ligne",
              page: chemin,
              fin: new Date().toISOString(),
              duree_sec: duree
            });
          }
          localStorage.setItem(CLE_FILE_OFFLINE, JSON.stringify(q));
        } catch (e) {}
      }
      majFileOff();
      setInterval(majFileOff, 30000);
      window.addEventListener("beforeunload", majFileOff);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") majFileOff();
      });
    }
    function insere() {
      if (!navigator.onLine) {
        suiviHorsLigne();
        return;
      }
      var tsInit = new Date().toISOString();
      sb.from("acces").insert({ user_id: uid, lieu: lieu, page: chemin, fin: tsInit, duree_sec: 1 }).select("id").single().then(function (r) {
        if (r.error || !r.data) {
          suiviHorsLigne();
          return;
        }
        var id = r.data.id, debut = Date.now();
        function ferme() {
          if (!navigator.onLine) return;
          sb.from("acces").update({
            fin: new Date().toISOString(),
            duree_sec: Math.round((Date.now() - debut) / 1000)
          }).eq("id", id).then(function () {});
          envoyerPresence();
        }
        envoyerPresence();
        setInterval(ferme, 30000); /* mise à jour présence + durée toutes les 30 s */
        window.addEventListener("beforeunload", ferme);
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "hidden") ferme();
        });
      }).catch(function () {
        suiviHorsLigne();
      });
    }
    if (!navigator.onLine) {
      suiviHorsLigne();
      return;
    }
    fetch("https://ipapi.co/json/").then(function (r) { return r.json(); }).then(function (j) {
      lieu = (j.city || "") + (j.country_name ? ", " + j.country_name : "") || "inconnu";
      insere();
    }).catch(function () { insere(); });
  }

  /* =====================================================================
     CONFORT D'UTILISATION ÉLÈVE (v68) :
     1) Index de recherche profonde (chapitres, balises, fonctions, clauses SQL, annexes)
     2) Palette de recherche globale rapide (Ctrl+K sur toutes les pages)
     3) Reprise automatique de lecture (Marque-page intelligent par cours)
     4) Carnet de notes personnel hors-ligne par cours (Alt+N ou menu élève)
     ===================================================================== */
  var STI_SEARCH_ITEMS = [
    /* --- HTML5 --- */
    { tech: "htmlcss", badge: "🌐 HTML5", title: "En-tête & Structure d'une page HTML5", sub: "<!DOCTYPE html>, <head>, <meta charset>, <title>, <link>", url: "cours/html5.html#entete", kw: "doctype html head meta title link utf8 structure" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Balises sémantiques de structuration", sub: "<header>, <nav>, <main>, <section>, <article>, <aside>, <footer>", url: "cours/html5.html#structuration", kw: "header nav main section article aside footer semantique mise en page" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Conteneurs & blocs génériques", sub: "<div>, <span>, <details>, <summary>, <dialog>", url: "cours/html5.html#conteneurs", kw: "div span details summary dialog conteneur bloc inline" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Listes ordonnées, à puces et de définitions", sub: "<ul>, <ol>, <li>, <dl>, <dt>, <dd>, attribut type / start", url: "cours/html5.html#listes", kw: "ul ol li dl dt dd liste puces numerotee" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Tableaux HTML5 & fusion de cellules", sub: "<table>, <caption>, <thead>, <tbody>, <tfoot>, <tr>, <th>, <td>, rowspan, colspan", url: "cours/html5.html#tableaux", kw: "table tr td th thead tbody tfoot caption rowspan colspan tableau fusion" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Texte, liens, images, audio et vidéo", sub: "<a>, <img>, <figure>, <figcaption>, <audio>, <video>, <source>, controls, autoplay", url: "cours/html5.html#texte-media", kw: "a href img src alt figure figcaption audio video source media lien hypertexte" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Attributs globaux & événements HTML", sub: "id, class, name, onclick, onchange, onblur, oninput, onsubmit, onload", url: "cours/html5.html#attributs-evenements", kw: "onclick onchange onblur oninput onsubmit onkeydown onkeyup evenement attribut" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Attribut target & cadres intégrés (<iframe>)", sub: "_blank, _self, _parent, _top, <iframe name=...>, srcdoc", url: "cours/html5.html#iframe", kw: "iframe target blank self parent top cadre srcdoc" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Formulaires HTML5 & contrôles de saisie", sub: "<form>, <input>, <select>, <option>, <textarea>, <fieldset>, <legend>, <label>, <output>, required, pattern", url: "cours/html5.html#formulaires", kw: "form input text password number range date email tel radio checkbox select option textarea fieldset legend label output required pattern placeholder min max step" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Focus interactif sur la balise <datalist>", sub: "Suggestions d'auto-complétion reliées à <input list='...'>", url: "cours/datalist.html", kw: "datalist list option autocompletion suggestion input" },
    { tech: "htmlcss", badge: "🌐 HTML5", title: "Fiche de révision HTML5 & Exemple « Le Fleuriste »", sub: "Synthèse des balises du Bac + formulaire complet commenté", url: "cours/fiche-revision-html5.html", kw: "fiche revision html5 fleuriste annexe resume" },

    /* --- CSS3 --- */
    { tech: "htmlcss", badge: "🎨 CSS3", title: "1. Sélecteurs CSS3 & Pseudo-classes", sub: "Balise, .classe, #id, universel *, :hover, :focus, :active, :nth-child()", url: "cours/css3.html#point-1", kw: "selecteur class id hover focus active visited nth-child pseudo classe css" },
    { tech: "htmlcss", badge: "🎨 CSS3", title: "2. Polices, Typographie & Effets de texte", sub: "@font-face, font-family, font-size, font-weight, text-align, text-decoration, text-shadow, text-transform", url: "cours/css3.html#point-2", kw: "font-face font-family font-size font-weight font-style text-align text-decoration text-shadow text-transform line-height color" },
    { tech: "htmlcss", badge: "🎨 CSS3", title: "3. Arrière-plan & Dégradés CSS3", sub: "background-color, background-image, background-size, linear-gradient, radial-gradient", url: "cours/css3.html#point-3", kw: "background color image repeat position size cover linear-gradient radial-gradient degrade" },
    { tech: "htmlcss", badge: "🎨 CSS3", title: "4. Modèle de boîte & Propriété display", sub: "display: block, inline, inline-block, none, width, height, margin, padding", url: "cours/css3.html#point-4", kw: "display block inline inline-block none visibility margin padding width height box-sizing" },
    { tech: "htmlcss", badge: "🎨 CSS3", title: "5. Float, Positionnement & Flexbox", sub: "position (relative, absolute, fixed, sticky), display: flex, justify-content, align-items, flex-wrap", url: "cours/css3.html#point-5", kw: "float clear position static relative absolute fixed sticky flex flexbox justify-content align-items flex-direction gap z-index" },
    { tech: "htmlcss", badge: "🎨 CSS3", title: "6. Bordures, Coins arrondis & Ombres", sub: "border, border-radius, box-shadow, outline", url: "cours/css3.html#point-6", kw: "border solid dashed radius arrondi box-shadow ombre" },
    { tech: "htmlcss", badge: "🎨 CSS3", title: "7. Listes & Tableaux stylisés en CSS", sub: "list-style-type, border-collapse, border-spacing, caption-side", url: "cours/css3.html#point-7", kw: "list-style-type list-style-image border-collapse border-spacing empty-cells" },
    { tech: "htmlcss", badge: "🎨 CSS3", title: "8. Transformations 2D, Transitions & Animations (@keyframes)", sub: "transform (rotate, scale, translate, skew), transition, @keyframes, animation, filter", url: "cours/css3.html#point-8", kw: "transform rotate scale translate skew transition keyframes animation duration infinite filter blur opacity" },
    { tech: "htmlcss", badge: "🎨 Animation", title: "Leçon animée : CSS pas à pas", sub: "Visualiser en direct la construction d'une page HTML5/CSS3", url: "cssanimee/index.html", kw: "css pas a pas animation interactive lecon" },
    { tech: "htmlcss", badge: "🎨 Animation", title: "Simulateur de Positionnement & Flexbox animé", sub: "Manipuler static, relative, absolute, fixed et Flexbox", url: "Positionnement-animee/index.html", kw: "positionnement anime flexbox simulateur" },

    /* --- JavaScript --- */
    { tech: "js", badge: "📜 JavaScript", title: "Introduction & Intégration du code JS", sub: "Balise <script>, fichier externe .js, attributs defer / async", url: "cours/javascript.html#sec2", kw: "script src defer async placer javascript externe" },
    { tech: "js", badge: "📜 JavaScript", title: "Variables, Types & Opérateurs", sub: "var, let, const, portée locale/globale, typeof, +, -, *, /, %", url: "cours/javascript.html#sec3", kw: "var let const variable portee globale locale typeof operateur modulo" },
    { tech: "js", badge: "📜 JavaScript", title: "Entrées / Sorties & Boîtes de dialogue", sub: "alert(), prompt(), confirm(), document.write(), console.log(), innerHTML", url: "cours/javascript.html#sec5", kw: "alert prompt confirm console log document write innerhtml entree sortie" },
    { tech: "js", badge: "📜 JavaScript", title: "Fonctions globales de conversion & test", sub: "parseInt(), parseFloat(), Number(), String(), isNaN(), eval()", url: "cours/javascript.html#sec7", kw: "parseint parsefloat number string isnan conversion numerique" },
    { tech: "js", badge: "📜 JavaScript", title: "Objet Math (calculs et hasard)", sub: "Math.abs(), Math.sqrt(), Math.round(), Math.trunc(), Math.floor(), Math.random(), Math.pow()", url: "cours/javascript.html#sec8", kw: "math abs sqrt round trunc floor ceil random pow min max pi aleatoire" },
    { tech: "js", badge: "📜 JavaScript", title: "Chaînes de caractères (Objet String)", sub: "ch.length, indexOf, lastIndexOf, substring, substr, charAt, charCodeAt, String.fromCharCode, toUpperCase, toLowerCase, trim, replace", url: "cours/javascript.html#sec9", kw: "string chaine length indexof lastindexof substring substr slice charat charcodeat fromcharcode touppercase tolowercase trim replace split" },
    { tech: "js", badge: "📜 JavaScript", title: "Tableaux JavaScript (Objet Array)", sub: "new Array(), [], length, push(), pop(), join(), sort(), reverse()", url: "cours/javascript.html#sec10", kw: "array tableau length push pop shift unshift join sort reverse indice" },
    { tech: "js", badge: "📜 JavaScript", title: "Objet Date (gestion des dates et heures)", sub: "new Date(), getFullYear(), getMonth(), getDate(), getDay(), getHours(), getMinutes()", url: "cours/javascript.html#sec11", kw: "date getfullyear getmonth getdate getday gethours getminutes gettime annee mois jour" },
    { tech: "js", badge: "📜 JavaScript", title: "Structures conditionnelles & Boucles", sub: "if / else, switch / case, opérateur ternaire, for, while, do...while", url: "cours/javascript.html#sec12", kw: "if else switch case break default for while do boucle condition" },
    { tech: "js", badge: "📜 JavaScript", title: "Fonctions en JavaScript", sub: "function nom(param), return, passage de paramètres, appel sur événement", url: "cours/javascript.html#sec14", kw: "function fonction return parametre argument" },
    { tech: "js", badge: "📜 JavaScript", title: "Manipulation du DOM & Formulaires en JS", sub: "document.getElementById(), getElementsByName(), querySelector(), .value, .checked, .selectedIndex, .style", url: "cours/javascript.html#sec15", kw: "dom document getelementbyid getelementsbyname queryselector queryselectorall value checked selectedindex options focus style classlist" },
    { tech: "js", badge: "📜 Fonctions Bac", title: "Fonctions standards JS (verifnom, alpha, numérique, email)", sub: "Algorithmes classiques de contrôle de saisie en JavaScript", url: "exercices/resume-fonctions-standards.html#js", kw: "verifnom verifmail alpha alphanumerique controle saisie bac formulaire" },

    /* --- SQL --- */
    { tech: "sql", badge: "🗄️ SQL", title: "1. Introduction : BD, SGBD & Sous-langages (LDD, LMD, LCD)", sub: "Concepts de base de données relationnelle, tables, colonnes (attributs) et lignes (tuples)", url: "cours/sql.html#intro", kw: "bd sgbd base de donnees ldd lmd lcd table tuple attribut relation" },
    { tech: "sql", badge: "🗄️ SQL", title: "Clé primaire (PRIMARY KEY) & Clé étrangère (FOREIGN KEY)", sub: "Identification unique, intégrité référentielle et relations 1:N / N:M entre tables", url: "cours/sql.html#intro-cles", kw: "primary key foreign key references cle primaire cle etrangere relation parent enfant" },
    { tech: "sql", badge: "🗄️ SQL · LDD", title: "CREATE TABLE & Types de données SQL", sub: "INT, DECIMAL(p,d), CHAR(n) vs VARCHAR(n), DATE, DATETIME, TEXT, AUTO_INCREMENT", url: "cours/sql.html#ldd-create", kw: "create table int integer decimal float char varchar text date time datetime timestamp auto_increment" },
    { tech: "sql", badge: "🗄️ SQL · LDD", title: "Contraintes SQL, REFERENCES & ON DELETE / ON UPDATE CASCADE", sub: "PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, DEFAULT, CHECK, ON DELETE CASCADE", url: "cours/sql.html#ldd-constraints", kw: "constraint check not null unique default references on delete cascade on update cascade restrict integrite" },
    { tech: "sql", badge: "🎬 Simulateur SQL", title: "Animation interactive : Voir l'effet des contraintes SQL", sub: "Simuler en direct CHAR vs VARCHAR, CHECK, ON UPDATE CASCADE et ON DELETE CASCADE / RESTRICT", url: "cours/sql-contraintes.html", kw: "simulateur animation contraintes char varchar check on update cascade on delete cascade restrict erreur 1451 3819 1406" },
    { tech: "sql", badge: "🗄️ SQL · LDD", title: "ALTER TABLE & DROP TABLE (Modifier ou supprimer une structure)", sub: "ADD COLUMN, MODIFY, CHANGE, DROP COLUMN, ADD CONSTRAINT, DROP TABLE, DROP DATABASE", url: "cours/sql.html#ldd-alter", kw: "alter table add modify change drop column constraint rename drop database" },
    { tech: "sql", badge: "🗄️ SQL · LMD", title: "INSERT INTO, UPDATE & DELETE (Mise à jour des données)", sub: "Insérer des lignes, modifier avec UPDATE ... SET ... WHERE, supprimer avec DELETE FROM", url: "cours/sql.html#lmd", kw: "insert into values update set where delete from lmd manipulation" },
    { tech: "sql", badge: "🗄️ SQL · LMD", title: "SELECT, WHERE, ORDER BY, Jointures & Opérateurs SQL", sub: "Projection, restriction, DISTINCT, BETWEEN, IN, LIKE (% _), IS NULL, jointures entre tables", url: "cours/sql.html#lmd-aggr", kw: "select from where and or not distinct order by asc desc between in like null limit jointure inner join" },
    { tech: "sql", badge: "🗄️ SQL · LMD", title: "Fonctions d'agrégation, GROUP BY & HAVING", sub: "COUNT(), SUM(), AVG(), MIN(), MAX(), regroupement GROUP BY et filtre HAVING", url: "cours/sql.html#lmd-aggr", kw: "count sum avg min max group by having agregation statistique" },
    { tech: "sql", badge: "🗄️ SQL · Fonctions", title: "Fonctions SQL sur les chaînes et les dates", sub: "CONCAT, LENGTH, UPPER, LOWER, SUBSTR, NOW(), CURDATE(), YEAR(), MONTH(), DAY(), DATEDIFF()", url: "cours/sql.html#lmd-strings", kw: "concat length char_length upper lower substr substring trim now curdate year month day datediff date_add" },
    { tech: "sql", badge: "🗄️ SQL · Fiche", title: "Fiche synthèse SQL : LDD, LMD, LCD commentés", sub: "Récapitulatif rapide de toutes les commandes SQL avec exemples", url: "cours/sql-bases-ldd-lmd-lcd.html", kw: "fiche recap sql ldd lmd lcd resume commandes" },

    /* --- PHP & MySQLi (réservé 4SI / elevelabo3 / Prof) --- */
    { tech: "php", only4si: true, badge: "🐘 PHP", title: "Principe Client / Serveur & Syntaxe générale PHP", sub: "Balises <?php ... ?>, echo, print, commentaires, exécution côté serveur", url: "cours/php.html#s1b", kw: "php client serveur apache echo print syntaxe script" },
    { tech: "php", only4si: true, badge: "🐘 PHP", title: "Variables, Types, Opérateurs & Fonctions de test", sub: "$variable, constantes define, isset(), empty(), unset(), is_numeric(), settype()", url: "cours/php.html#s2", kw: "variable dollar define constante isset empty unset is_numeric gettype settype" },
    { tech: "php", only4si: true, badge: "🐘 PHP", title: "Chaînes de caractères & Tableaux en PHP", sub: "strlen, strpos, substr, strtoupper, strtolower, trim, explode, array(), foreach, count()", url: "cours/php.html#s4", kw: "strlen strpos substr str_replace strtoupper strtolower trim explode implode array tableau associatif foreach count" },
    { tech: "php", only4si: true, badge: "🐘 PHP", title: "Fonctions de Date & Heure en PHP", sub: "date('Y-m-d'), time(), checkdate(), getdate(), mktime(), strtotime()", url: "cours/php.html#s6", kw: "date time checkdate getdate mktime strtotime timestamp heure" },
    { tech: "php", only4si: true, badge: "🐘 PHP", title: "Formulaires & Variables Superglobales ($_POST, $_GET)", sub: "Récupération des champs HTML avec $_POST['...'], $_GET['...'], $_SERVER, require / include", url: "cours/php.html#s7", kw: "post get request server superglobale formulaire action method include require header" },
    { tech: "php", only4si: true, badge: "🐘 MySQLi", title: "Dialogue PHP ↔ MySQL : Fonctions MySQLi essentielles", sub: "mysqli_connect, mysqli_select_db, mysqli_query, mysqli_fetch_array, mysqli_fetch_row, mysqli_num_rows, mysqli_affected_rows, mysqli_close", url: "cours/php.html#s8-2", kw: "mysqli connect query fetch_array fetch_row fetch_assoc num_rows affected_rows error close base de donnees" },
    { tech: "php", only4si: true, badge: "🎬 Animation PHP", title: "Animation interactive : Le Guichet PHP ↔ MySQL", sub: "Suivre étape par étape le trajet d'une requête entre le navigateur, PHP et MySQL", url: "cours/php-mysqli.html", kw: "animation guichet php mysql mysqli etapes" },
    { tech: "php", only4si: true, badge: "🪄 PHP-recap", title: "Fiche magique PHP-recap (Synthèse complète Bac)", sub: "Toutes les fonctions PHP, MySQLi et patrons d'insertion / sélection en un coup d'œil", url: "cours/PHP-recap.html", kw: "php recap fiche revision synthese" },
    { tech: "php", only4si: true, badge: "🧪 Bac Pratique", title: "Atelier Bac Pratique & Projet STI 0", sub: "Énoncés types Bac Pratique notés sur 20 + Projet complet STI 0 avec corrigé", url: "bac-pratique.html", kw: "bac pratique examen sujet corrige projet sti0" },

    /* --- Séries d'exercices & Annexes --- */
    { tech: "all", badge: "✏️ Exercices", title: "Séries d'exercices corrigés (CSS3, JS, BD/SQL, PHP)", sub: "Exercices progressifs et problèmes types Bac", url: "exercices/series-exercices.html", kw: "exercices series td corrige revision entrainement" },
    { tech: "all", badge: "📄 Annexe", title: "Annexe officielle HTML5 / CSS3 / JavaScript", sub: "Aide-mémoire officiel des balises, propriétés et méthodes", url: "documents/annexes/annexe-html-css-js.pdf.html", kw: "annexe pdf html css javascript aide memoire" },
    { tech: "sql", badge: "📄 Annexe", title: "Annexe officielle SQL", sub: "Aide-mémoire officiel des commandes LDD et LMD", url: "documents/annexes/annexe-sql.pdf.html", kw: "annexe pdf sql aide memoire" }
  ];

  function normaliserTexteSTI(t) {
    return (t || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function est4SIAutoriseActuel() {
    return document.documentElement.classList.contains("sti-4si-autorise") ||
      estAutorise4SI(currentClasse, Boolean(localStorage.getItem("sti-admin-gold") === "1"));
  }

  window.STI_SEARCH_INDEX = STI_SEARCH_ITEMS;

  window.rechercherChapitresSTI = function (requete, filtreTech) {
    var q = normaliserTexteSTI(requete);
    var ok4 = est4SIAutoriseActuel();
    var mots = q ? q.split(" ").filter(Boolean) : [];
    var resultats = [];

    for (var i = 0; i < STI_SEARCH_ITEMS.length; i++) {
      var it = STI_SEARCH_ITEMS[i];
      if (it.only4si && !ok4) continue;
      if (filtreTech && filtreTech !== "all" && it.tech !== "all" && it.tech !== filtreTech) continue;

      if (!mots.length) {
        resultats.push({ item: it, score: 1 });
        continue;
      }

      var haystackTitle = normaliserTexteSTI(it.title);
      var haystackSub = normaliserTexteSTI(it.sub);
      var haystackKw = normaliserTexteSTI(it.kw + " " + it.badge);
      var haystackAll = haystackTitle + " " + haystackSub + " " + haystackKw;

      var tousPresents = true;
      var score = 0;
      for (var m = 0; m < mots.length; m++) {
        var mot = mots[m];
        if (haystackAll.indexOf(mot) === -1) {
          tousPresents = false;
          break;
        }
        if (haystackTitle.indexOf(mot) !== -1) score += 5;
        if (haystackKw.indexOf(mot) !== -1) score += 3;
        if (haystackSub.indexOf(mot) !== -1) score += 2;
      }
      if (tousPresents) {
        resultats.push({ item: it, score: score });
      }
    }

    resultats.sort(function (a, b) { return b.score - a.score; });
    return resultats.map(function (r) { return r.item; });
  };

  /* ---------- Palette de Recherche Globale (Ctrl+K sur toutes les pages) ---------- */
  window.ouvrirRechercheGlobaleSTI = function (qInit) {
    var exist = document.getElementById("sti-global-search-modal");
    if (exist) exist.remove();

    var racine = cfg.RACINE || "./";
    var fond = document.createElement("div");
    fond.id = "sti-global-search-modal";
    fond.className = "sti-no-print";
    fond.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(13,18,30,.72);backdrop-filter:blur(5px);display:flex;align-items:flex-start;justify-content:center;padding:min(8vh,56px) 14px 18px;font:600 13.5px/1.45 system-ui,'Segoe UI',sans-serif;";

    var boite = document.createElement("div");
    boite.style.cssText = "background:#fffdf7;color:#23201a;border:2.5px solid #23201a;border-radius:20px;max-width:650px;width:100%;max-height:82vh;display:flex;flex-direction:column;box-shadow:7px 7px 0 #f4511e,0 24px 60px rgba(0,0,0,.45);overflow:hidden;color-scheme:light;";

    boite.innerHTML =
      "<div style='display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:2px solid #23201a;background:#f9f1e3'>" +
      "<span style='font-size:18px'>🔍</span>" +
      "<input type='search' id='sti-gs-input' placeholder='Rechercher un chapitre, une balise, une fonction ou une clause SQL (ex : CASCADE, CHECK, datalist, flexbox, substring)…' style='flex:1;border:2px solid #23201a;border-radius:11px;padding:9px 12px;font:700 13.5px/1.3 system-ui,sans-serif;background:#fff;color:#23201a;outline:none' />" +
      "<button type='button' id='sti-gs-close' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:10px;padding:6px 11px;font-weight:900;font-size:12px;cursor:pointer'>Échap ✕</button>" +
      "</div>" +
      "<div id='sti-gs-chips' style='display:flex;gap:6px;flex-wrap:wrap;padding:8px 16px;background:#fffdf7;border-bottom:1px dashed #e2d5be;font-size:11.5px'>" +
      "<span style='color:#7a6f5d;font-weight:800;margin-right:2px'>Suggestions :</span>" +
      "<button type='button' data-q='cascade' style='border:1.5px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:2px 9px;font-weight:800;font-size:11px;cursor:pointer'>ON DELETE CASCADE</button>" +
      "<button type='button' data-q='char varchar' style='border:1.5px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:2px 9px;font-weight:800;font-size:11px;cursor:pointer'>CHAR vs VARCHAR</button>" +
      "<button type='button' data-q='datalist' style='border:1.5px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:2px 9px;font-weight:800;font-size:11px;cursor:pointer'>&lt;datalist&gt;</button>" +
      "<button type='button' data-q='flexbox' style='border:1.5px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:2px 9px;font-weight:800;font-size:11px;cursor:pointer'>Flexbox</button>" +
      "<button type='button' data-q='substring' style='border:1.5px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:2px 9px;font-weight:800;font-size:11px;cursor:pointer'>Chaînes JS</button>" +
      "<button type='button' data-q='group by' style='border:1.5px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:2px 9px;font-weight:800;font-size:11px;cursor:pointer'>GROUP BY / HAVING</button>" +
      "</div>" +
      "<div id='sti-gs-list' style='padding:10px 14px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:7px'></div>" +
      "<div style='padding:8px 16px;border-top:1.5px solid #e2d5be;background:#f9f1e3;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#7a6f5d;font-weight:700'>" +
      "<span>💡 Astuce : appuyez sur <b>Ctrl + K</b> sur n'importe quelle page pour ouvrir cette recherche</span>" +
      "<span>↑↓ Naviguer · Entrée Ouvrir</span>" +
      "</div>";

    fond.appendChild(boite);
    (document.body || document.documentElement).appendChild(fond);

    var inp = boite.querySelector("#sti-gs-input");
    var listEl = boite.querySelector("#sti-gs-list");
    var selIdx = 0;
    var currentLinks = [];

    function renderList() {
      var items = window.rechercherChapitresSTI(inp.value, "all").slice(0, 18);
      selIdx = 0;
      if (!items.length) {
        listEl.innerHTML = "<div style='padding:22px;text-align:center;color:#7a6f5d;font-weight:700'>Aucun chapitre trouvé pour « " + esc(inp.value) + " ». Essayez un mot plus court (ex : <b>table</b>, <b>date</b>, <b>check</b>, <b>dom</b>).</div>";
        currentLinks = [];
        return;
      }
      listEl.innerHTML = items.map(function (it, idx) {
        var href = racine + it.url;
        return "<a href='" + esc(href) + "' class='sti-gs-item' data-idx='" + idx + "' style='display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:12px;border:1.8px solid " + (idx === 0 ? "#f4511e" : "#e2d5be") + ";background:" + (idx === 0 ? "#fff5ee" : "#ffffff") + ";color:#23201a;text-decoration:none;transition:transform .12s,border-color .12s'>" +
          "<div style='min-width:0'>" +
          "<div style='display:flex;align-items:center;gap:7px;flex-wrap:wrap'>" +
          "<span style='display:inline-block;padding:1px 8px;border-radius:999px;border:1.5px solid #23201a;background:#f3ead9;font-size:10.5px;font-weight:900'>" + esc(it.badge) + "</span>" +
          "<strong style='font-size:13px;color:#23201a'>" + esc(it.title) + "</strong>" +
          "</div>" +
          "<div style='font-size:11.5px;color:#5a5244;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + esc(it.sub) + "</div>" +
          "</div>" +
          "<span style='font-weight:900;color:#f4511e;font-size:14px;flex-shrink:0'>➔</span>" +
          "</a>";
      }).join("");
      currentLinks = Array.prototype.slice.call(listEl.querySelectorAll(".sti-gs-item"));
      currentLinks.forEach(function (a) {
        a.addEventListener("click", function () {
          fond.remove();
        });
      });
    }

    function majSelection(nvIdx) {
      if (!currentLinks.length) return;
      selIdx = (nvIdx + currentLinks.length) % currentLinks.length;
      currentLinks.forEach(function (a, i) {
        var actif = i === selIdx;
        a.style.borderColor = actif ? "#f4511e" : "#e2d5be";
        a.style.background = actif ? "#fff5ee" : "#ffffff";
        if (actif && a.scrollIntoView) a.scrollIntoView({ block: "nearest" });
      });
    }

    boite.querySelector("#sti-gs-close").addEventListener("click", function () { fond.remove(); });
    fond.addEventListener("click", function (e) { if (e.target === fond) fond.remove(); });
    boite.querySelectorAll("#sti-gs-chips button[data-q]").forEach(function (b) {
      b.addEventListener("click", function () {
        inp.value = b.getAttribute("data-q") || "";
        renderList();
        inp.focus();
      });
    });

    inp.value = qInit || "";
    inp.addEventListener("input", renderList);
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); majSelection(selIdx + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); majSelection(selIdx - 1); }
      else if (e.key === "Enter" && currentLinks[selIdx]) {
        e.preventDefault();
        var href = currentLinks[selIdx].getAttribute("href");
        fond.remove();
        if (href) location.href = href;
      } else if (e.key === "Escape") {
        e.preventDefault();
        fond.remove();
      }
    });

    renderList();
    setTimeout(function () { inp.focus(); inp.select(); }, 20);
  };

  /* Raccourci clavier global Ctrl+K (et Alt+N pour les notes) sur toutes les pages */
  if (window === window.top) {
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key || "").toLowerCase() === "k") {
        var modSearch = document.getElementById("moduleSearch");
        /* Sur index.html, si #moduleSearch est visible et pas déjà focus, on focus #moduleSearch ;
           si on refait Ctrl+K ou sur toute autre page, on ouvre la palette globale */
        if (modSearch && document.activeElement !== modSearch && !document.getElementById("sti-global-search-modal")) {
          e.preventDefault();
          modSearch.focus();
          modSearch.select();
          return;
        }
        e.preventDefault();
        window.ouvrirRechercheGlobaleSTI(modSearch ? modSearch.value : "");
      } else if (e.altKey && (e.key || "").toLowerCase() === "n") {
        e.preventDefault();
        if (window.ouvrirCarnetNotesSTI) window.ouvrirCarnetNotesSTI();
      }
    });
  }

  /* ---------- Carnet de notes personnel hors-ligne par cours (Alt+N) ---------- */
  window.ouvrirCarnetNotesSTI = function () {
    var exist = document.getElementById("sti-notes-modal");
    if (exist) exist.remove();

    var CLE_NOTES = "sti-notes-eleve";
    var notesObj = {};
    try { notesObj = JSON.parse(localStorage.getItem(CLE_NOTES) || "{}") || {}; } catch (e) {}

    var clePage = (chemin || "accueil").replace(/^\/+|\/+$/g, "") || "accueil";
    var titrePage = (document.title || clePage).replace(/\s*[—–|-]\s*STI.*$/i, "").trim();
    var ongletActif = clePage;

    var fond = document.createElement("div");
    fond.id = "sti-notes-modal";
    fond.className = "sti-no-print";
    fond.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(13,18,30,.68);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font:600 13.5px/1.45 system-ui,'Segoe UI',sans-serif;";

    var boite = document.createElement("div");
    boite.style.cssText = "background:#fffdf7;color:#23201a;border:2.5px solid #23201a;border-radius:20px;padding:18px 20px;max-width:520px;width:100%;box-shadow:6px 6px 0 #f4511e;color-scheme:light;";
    boite.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px'>" +
      "<h3 style='margin:0;font-size:16px;font-weight:900;color:#f4511e'>📝 Mes notes de révision personnelles</h3>" +
      "<button type='button' id='sti-notes-close' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:4px 10px;font-weight:900;font-size:12px;cursor:pointer'>✕</button>" +
      "</div>" +
      "<div style='display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap'>" +
      "<button type='button' id='sti-tab-page' style='border:2px solid #23201a;background:#f4511e;color:#fff;border-radius:999px;padding:5px 12px;font-weight:800;font-size:11.5px;cursor:pointer'>📄 Sur cette page (" + esc(titrePage.slice(0, 26)) + ")</button>" +
      "<button type='button' id='sti-tab-global' style='border:2px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:5px 12px;font-weight:800;font-size:11.5px;cursor:pointer'>📌 Mémo général Bac STI</button>" +
      "</div>" +
      "<textarea id='sti-notes-area' style='width:100%;min-height:170px;border:2px solid #23201a;border-radius:12px;padding:11px;font:600 13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;background:#fff;color:#23201a;resize:vertical' placeholder='Écrivez vos remarques, formules SQL, astuces JS/HTML/CSS… (sauvegardé automatiquement hors-ligne sur votre appareil)'></textarea>" +
      "<div style='display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px'>" +
      "<span id='sti-notes-stat' style='font-size:11.5px;color:#177245;font-weight:800'>✓ Sauvegarde automatique hors-ligne</span>" +
      "<div style='display:flex;gap:7px'>" +
      "<button type='button' id='sti-notes-copy' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:6px 12px;font-weight:800;font-size:11.5px;cursor:pointer'>📋 Copier</button>" +
      "<button type='button' id='sti-notes-dl' style='border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border-radius:999px;padding:6px 13px;font-weight:900;font-size:11.5px;cursor:pointer;box-shadow:2px 2px 0 #23201a'>⬇️ .txt</button>" +
      "</div></div>";

    fond.appendChild(boite);
    (document.body || document.documentElement).appendChild(fond);

    var area = boite.querySelector("#sti-notes-area");
    var stat = boite.querySelector("#sti-notes-stat");
    var tabPage = boite.querySelector("#sti-tab-page");
    var tabGlobal = boite.querySelector("#sti-tab-global");

    function chargerOnglet(cle) {
      ongletActif = cle;
      area.value = notesObj[cle] || "";
      var estPage = cle === clePage;
      tabPage.style.background = estPage ? "#f4511e" : "#f3ead9";
      tabPage.style.color = estPage ? "#fff" : "#23201a";
      tabGlobal.style.background = !estPage ? "#f4511e" : "#f3ead9";
      tabGlobal.style.color = !estPage ? "#fff" : "#23201a";
      area.focus();
    }

    area.addEventListener("input", function () {
      notesObj[ongletActif] = area.value;
      try { localStorage.setItem(CLE_NOTES, JSON.stringify(notesObj)); } catch (e) {}
      stat.textContent = "✓ Enregistré (" + area.value.length + " car.)";
    });

    tabPage.addEventListener("click", function () { chargerOnglet(clePage); });
    tabGlobal.addEventListener("click", function () { chargerOnglet("__global__"); });
    boite.querySelector("#sti-notes-close").addEventListener("click", function () { fond.remove(); });
    fond.addEventListener("click", function (e) { if (e.target === fond) fond.remove(); });

    boite.querySelector("#sti-notes-copy").addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(area.value || "").then(function () {
          stat.textContent = "✅ Copié dans le presse-papiers !";
        });
      }
    });

    boite.querySelector("#sti-notes-dl").addEventListener("click", function () {
      var contenu = "=== MES NOTES DE RÉVISION STI ===\n\n" +
        "[Page : " + titrePage + "]\n" + (notesObj[clePage] || "(Aucune note)") + "\n\n" +
        "[Mémo général Bac STI]\n" + (notesObj["__global__"] || "(Aucune note)") + "\n";
      var blob = new Blob([contenu], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "mes-notes-sti.txt";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    });

    chargerOnglet(clePage);
  };

  /* ---------- Reprise automatique de lecture (Marque-page intelligent par cours) ---------- */
  (function installerRepriseLectureAuto() {
    if (window !== window.top) return;
    var p = (location.pathname || "").toLowerCase();
    var CLE_BM = "sti-reading-bookmarks";
    var CLE_LAST = "sti-last-reading";

    var mapCours = [
      { match: "cours/html5.html", id: "html5", name: "Cours HTML5", icon: "🌐", relUrl: "cours/html5.html", only4si: false },
      { match: "cours/courshtml5.html", id: "html5", name: "Cours HTML5", icon: "🌐", relUrl: "cours/html5.html", only4si: false },
      { match: "cours/css3.html", id: "css3", name: "Cours CSS3", icon: "🎨", relUrl: "cours/css3.html", only4si: false },
      { match: "cours/courscss3.html", id: "css3", name: "Cours CSS3", icon: "🎨", relUrl: "cours/css3.html", only4si: false },
      { match: "cours/javascript.html", id: "js", name: "Cours JavaScript", icon: "📜", relUrl: "cours/javascript.html", only4si: false },
      { match: "cours/sql.html", id: "sql", name: "Cours SQL", icon: "🗄️", relUrl: "cours/sql.html", only4si: false },
      { match: "cours/php.html", id: "php", name: "Cours PHP & MySQL", icon: "🐘", relUrl: "cours/php.html", only4si: true },
      { match: "cours/coursphp.html", id: "php", name: "Cours PHP & MySQL", icon: "🐘", relUrl: "cours/php.html", only4si: true },
      { match: "exercices/resume-fonctions-standards.html", id: "fn_std", name: "Fonctions Standards", icon: "🧩", relUrl: "exercices/resume-fonctions-standards.html", only4si: false },
      { match: "exercices/series-exercices.html", id: "series", name: "Séries d'exercices", icon: "✏️", relUrl: "exercices/series-exercices.html", only4si: false }
    ];

    var infoCours = null;
    for (var i = 0; i < mapCours.length; i++) {
      if (p.indexOf(mapCours[i].match) !== -1) {
        infoCours = mapCours[i];
        break;
      }
    }
    if (!infoCours) return;

    function lireBookmarks() {
      try { return JSON.parse(localStorage.getItem(CLE_BM) || "{}") || {}; } catch (e) { return {}; }
    }

    function extraireTitreSection(el) {
      if (!el) return "";
      var h = el.matches("h1,h2,h3,h4") ? el : el.querySelector("h1,h2,h3,h4");
      var raw = (h ? h.textContent : el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      return raw.slice(0, 68);
    }

    function collecterSections() {
      var candidats = Array.prototype.slice.call(
        document.querySelectorAll("section[id], article[id], div.card[id], div.sub-card[id], h2[id], h3[id]")
      );
      var ignores = { top: 1, "main-content": 1, "nav-links": 1, now: 1, scrim: 1, levelBar: 1, "win-body": 1, pdfModal: 1 };
      return candidats.filter(function (el) {
        var id = el.id || "";
        if (!id || ignores[id] || /^(modal|tpl-|dl-|anim|recap|sqlContraintes|to-top|m-|s-)/.test(id)) return false;
        return Boolean(extraireTitreSection(el));
      });
    }

    /* Si un marque-page existe déjà pour ce cours et que l'élève arrive sans #hash précis, proposer de reprendre */
    function proposerRepriseInitiale() {
      if (location.hash && location.hash.length > 1) return;
      var bms = lireBookmarks();
      var saved = bms[infoCours.id];
      if (!saved || !saved.pct || saved.pct < 6 || saved.pct > 97) return;

      var toast = document.createElement("div");
      toast.id = "sti-resume-toast";
      toast.className = "sti-no-print";
      toast.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:2147483644;background:#fffdf7;color:#23201a;border:2.5px solid #23201a;border-radius:16px;padding:10px 13px;box-shadow:5px 5px 0 #f4511e,0 12px 28px rgba(0,0,0,.3);display:flex;align-items:center;gap:10px;max-width:min(430px,calc(100vw - 90px));font:700 12.5px/1.35 system-ui,'Segoe UI',sans-serif;color-scheme:light;";
      var labelChap = saved.sectionTitle ? saved.sectionTitle : ("Progression " + saved.pct + " %");
      toast.innerHTML =
        "<span style='font-size:18px;flex-shrink:0'>📍</span>" +
        "<div style='min-width:0;flex:1'>" +
        "<div style='font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#7a6f5d;font-weight:900'>Reprendre votre lecture (" + saved.pct + " %)</div>" +
        "<div style='font-weight:800;color:#23201a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + esc(labelChap) + "</div>" +
        "</div>" +
        "<button type='button' id='sti-resume-go' style='border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border-radius:999px;padding:6px 12px;font-weight:900;font-size:11.5px;cursor:pointer;flex-shrink:0;box-shadow:2px 2px 0 #23201a'>Reprendre ➔</button>" +
        "<button type='button' id='sti-resume-close' title='Fermer' style='border:1.5px solid #23201a;background:#fff;color:#23201a;border-radius:999px;width:24px;height:24px;font-weight:900;font-size:11px;cursor:pointer;flex-shrink:0'>✕</button>";

      (document.body || document.documentElement).appendChild(toast);

      toast.querySelector("#sti-resume-go").addEventListener("click", function () {
        var cible = saved.sectionId ? document.getElementById(saved.sectionId) : null;
        if (cible && cible.scrollIntoView) {
          cible.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          var maxH = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: Math.round((saved.pct / 100) * Math.max(0, maxH)), behavior: "smooth" });
        }
        toast.remove();
      });
      toast.querySelector("#sti-resume-close").addEventListener("click", function () {
        toast.remove();
      });
      setTimeout(function () {
        if (toast && toast.parentNode) toast.remove();
      }, 14000);
    }

    var timerSave = null;
    function sauvegarderPositionCourante() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      if (max <= 200) return;
      var y = window.scrollY || h.scrollTop || 0;
      var pct = Math.max(0, Math.min(100, Math.round((y / max) * 100)));
      if (pct < 4) return;

      var sections = collecterSections();
      var secCourante = null;
      for (var i = 0; i < sections.length; i++) {
        var rect = sections[i].getBoundingClientRect();
        if (rect.top <= 200) secCourante = sections[i];
      }
      if (!secCourante && sections.length) secCourante = sections[0];

      var secId = secCourante ? secCourante.id : "";
      var secTitle = secCourante ? extraireTitreSection(secCourante) : infoCours.name;

      var entree = {
        courseId: infoCours.id,
        courseName: infoCours.name,
        icon: infoCours.icon,
        relUrl: infoCours.relUrl,
        only4si: Boolean(infoCours.only4si),
        sectionId: secId,
        sectionTitle: secTitle,
        pct: pct,
        ts: Date.now()
      };

      try {
        var bms = lireBookmarks();
        bms[infoCours.id] = entree;
        localStorage.setItem(CLE_BM, JSON.stringify(bms));
        localStorage.setItem(CLE_LAST, JSON.stringify(entree));
      } catch (e) {}
    }

    window.addEventListener("scroll", function () {
      if (timerSave) clearTimeout(timerSave);
      timerSave = setTimeout(sauvegarderPositionCourante, 350);
    }, { passive: true });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", proposerRepriseInitiale);
    } else {
      setTimeout(proposerRepriseInitiale, 250);
    }
  })();

  /* =====================================================================
     MODE « FLASHCARDS » BAC STI (Recto / Verso) & BAC À SABLE DE CODE (v80)
     ===================================================================== */
  var STI_FLASHCARDS = window.STI_FLASHCARDS = [
    /* --- HTML5 --- */
    { id: "h1", tech: "html5", badge: "🌐 HTML5", q: "Comment relier un champ <input> à une liste de suggestions <datalist> ?", a: "On place l'attribut list=\"id_liste\" sur la balise <input> et l'attribut id=\"id_liste\" (identique) sur la balise <datalist>.", code: "<input type=\"text\" list=\"villes\">\n<datalist id=\"villes\">\n  <option value=\"Tunis\">\n  <option value=\"Sousse\">\n</datalist>" },
    { id: "h2", tech: "html5", badge: "🌐 HTML5", q: "Quelle est la différence entre <select> et <datalist> ?", a: "<select> impose un choix fermé parmi les <option> proposées, tandis que <datalist> suggère une liste tout en autorisant l'utilisateur à saisir une autre valeur libre.", code: "<!-- Choix obligatoire : <select> | Suggestion libre : <datalist> -->" },
    { id: "h3", tech: "html5", badge: "🌐 HTML5", q: "Quels attributs HTML5 permettent de contrôler une note numérique entre 0 et 20 par pas de 0.25 ?", a: "On utilise type=\"number\" avec min=\"0\", max=\"20\", step=\"0.25\" et required.", code: "<input type=\"number\" name=\"note\" min=\"0\" max=\"20\" step=\"0.25\" required>" },
    { id: "h4", tech: "html5", badge: "🌐 HTML5", q: "Comment encadrer un groupe de champs de formulaire avec un titre sur la bordure ?", a: "On entoure les champs avec <fieldset> et on place le titre dans <legend> juste après l'ouverture de <fieldset>.", code: "<fieldset>\n  <legend>Informations personnelles</legend>\n  ...\n</fieldset>" },
    { id: "h5", tech: "html5", badge: "🌐 HTML5", q: "Comment rendre mutuellement exclusifs plusieurs boutons <input type=\"radio\"> ?", a: "Tous les boutons radio d'un même groupe doivent partager exactement la même valeur d'attribut name=\"...\".", code: "<input type=\"radio\" name=\"genre\" value=\"M\" checked> M\n<input type=\"radio\" name=\"genre\" value=\"F\"> F" },
    { id: "h6", tech: "html5", badge: "🌐 HTML5", q: "Quelle est la différence entre rowspan=\"2\" et colspan=\"3\" dans un tableau HTML ?", a: "rowspan=\"2\" fusionne verticalement 2 cellules (sur 2 lignes) ; colspan=\"3\" fusionne horizontalement 3 cellules (sur 3 colonnes).", code: "<td rowspan=\"2\">2 lignes</td>\n<td colspan=\"3\">3 colonnes</td>" },
    { id: "h7", tech: "html5", badge: "🌐 HTML5", q: "Comment appeler une fonction JS verif() qui bloque l'envoi du formulaire si elle renvoie false ?", a: "On place onsubmit=\"return verif()\" dans la balise <form> (ne jamais oublier le mot-clé return).", code: "<form action=\"ajout.php\" method=\"post\" onsubmit=\"return verif()\">" },
    { id: "h8", tech: "html5", badge: "🌐 HTML5", q: "Comment afficher la page cible d'un lien <a> à l'intérieur d'une <iframe> de la page ?", a: "On donne un attribut name=\"mon_cadre\" à l'<iframe> et on met target=\"mon_cadre\" sur le lien <a>.", code: "<a href=\"cours.html\" target=\"mon_cadre\">Ouvrir</a>\n<iframe name=\"mon_cadre\" src=\"accueil.html\"></iframe>" },

    /* --- CSS3 --- */
    { id: "c1", tech: "css3", badge: "🎨 CSS3", q: "Quelle est la différence entre les sélecteurs CSS .box, #box et nav a:hover ?", a: ".box cible class=\"box\" ; #box cible id=\"box\" ; nav a:hover cible les liens <a> situés dans <nav> au survol de la souris.", code: ".box { ... }\n#box { ... }\nnav a:hover { color: orange; }" },
    { id: "c2", tech: "css3", badge: "🎨 CSS3", q: "Comment aligner des éléments côte à côte, espacés et centrés verticalement avec Flexbox ?", a: "Sur le conteneur parent : display: flex; justify-content: space-between; align-items: center;", code: ".parent {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}" },
    { id: "c3", tech: "css3", badge: "🎨 CSS3", q: "Quelle est la différence entre display: none et visibility: hidden ?", a: "display: none supprime totalement l'élément de l'affichage (0 place occupée) ; visibility: hidden rend l'élément invisible mais conserve son espace vide.", code: ".cache-total { display: none; }\n.invisible-garde-place { visibility: hidden; }" },
    { id: "c4", tech: "css3", badge: "🎨 CSS3", q: "Comment déclarer et appliquer une animation CSS3 continue ?", a: "On définit les étapes avec @keyframes nom { ... } puis on l'appelle avec animation: nom durée infinite;", code: "@keyframes tourner {\n  from { transform: rotate(0deg); }\n  to   { transform: rotate(360deg); }\n}\n.icone { animation: tourner 2s linear infinite; }" },
    { id: "c5", tech: "css3", badge: "🎨 CSS3", q: "Que signifient les 4 valeurs de box-shadow: 4px 6px 12px rgba(0,0,0,0.3) ?", a: "1) Décalage horizontal X (4px), 2) Décalage vertical Y (6px), 3) Rayon de flou (12px), 4) Couleur de l'ombre.", code: "box-shadow: 4px 6px 12px rgba(0, 0, 0, 0.3);" },
    { id: "c6", tech: "css3", badge: "🎨 CSS3", q: "Comment fusionner les bordures doubles d'un tableau <table> en CSS ?", a: "On applique border-collapse: collapse; sur le sélecteur table.", code: "table {\n  border-collapse: collapse;\n  width: 100%;\n}" },

    /* --- JavaScript --- */
    { id: "j1", tech: "js", badge: "📜 JavaScript", q: "Que renvoie ch.indexOf(\"@\") si le caractère \"@\" ne figure pas dans la chaîne ch ?", a: "Il renvoie -1. (S'il est présent, il renvoie sa première position à partir de l'indice 0).", code: "if (email.indexOf(\"@\") === -1) {\n  alert(\"Email invalide !\");\n  return false;\n}" },
    { id: "j2", tech: "js", badge: "📜 JavaScript", q: "Quelle est la différence entre ch.substring(d, f) et ch.substr(d, n) ?", a: "substring(d, f) extrait de l'indice d jusqu'à l'indice f exclu ; substr(d, n) extrait n caractères à partir de l'indice d.", code: "\"Tunisie\".substring(0, 5); // \"Tunis\"\n\"Tunisie\".substr(2, 3);    // \"nis\"" },
    { id: "j3", tech: "js", badge: "📜 JavaScript", q: "Comment vérifier en JS qu'une valeur ch est composée uniquement de chiffres (ou est numérique) ?", a: "On vérifie que ch n'est pas vide et que !isNaN(ch) est vrai (isNaN renvoie true si ce n'est PAS un nombre).", code: "if (ch === \"\" || isNaN(ch)) {\n  alert(\"Veuillez saisir un nombre !\");\n  return false;\n}" },
    { id: "j4", tech: "js", badge: "📜 JavaScript", q: "Comment écrire une fonction alpha(ch) qui vérifie qu'une chaîne ne contient que des lettres A-Z ?", a: "On met en majuscules avec toUpperCase() et on vérifie que chaque caractère est compris entre 'A' et 'Z'.", code: "function alpha(ch) {\n  ch = ch.toUpperCase();\n  if (ch.length === 0) return false;\n  for (var i = 0; i < ch.length; i++) {\n    if (ch.charAt(i) < 'A' || ch.charAt(i) > 'Z') return false;\n  }\n  return true;\n}" },
    { id: "j5", tech: "js", badge: "📜 JavaScript", q: "Comment vérifier en JS qu'une liste déroulante <select id=\"ville\"> a bien été choisie (pas la 1re option) ?", a: "On teste si selectedIndex === 0 (ou si value === \"\").", code: "if (document.getElementById(\"ville\").selectedIndex === 0) {\n  alert(\"Choisissez une ville !\");\n  return false;\n}" },
    { id: "j6", tech: "js", badge: "📜 JavaScript", q: "Comment tester si aucun des deux boutons radio id=\"r1\" et id=\"r2\" n'est coché ?", a: "On utilise la propriété booléenne .checked sur chaque bouton radio.", code: "var r1 = document.getElementById(\"r1\").checked;\nvar r2 = document.getElementById(\"r2\").checked;\nif (!r1 && !r2) {\n  alert(\"Faites un choix !\");\n  return false;\n}" },
    { id: "j7", tech: "js", badge: "📜 JavaScript", q: "Comment récupérer l'année sur 4 chiffres et le mois (1 à 12) de la date système en JS ?", a: "Avec new Date() : getFullYear() donne l'année, et getMonth() + 1 donne le mois (car getMonth() va de 0 à 11).", code: "var d = new Date();\nvar annee = d.getFullYear();\nvar mois  = d.getMonth() + 1;\nvar jour  = d.getDate();" },

    /* --- SQL --- */
    { id: "s1", tech: "sql", badge: "🗄️ SQL", q: "Quelle est la différence entre CHAR(10) et VARCHAR(10) lorsqu'on stocke 'Ali' ?", a: "CHAR(10) est de longueur fixe (occupe toujours 10 octets, complétés par des espaces) ; VARCHAR(10) est de longueur variable (occupe 3 + 1 = 4 octets).", code: "cin   CHAR(8) PRIMARY KEY,     -- Toujours 8 caractères\nnom   VARCHAR(30) NOT NULL     -- Longueur variable jusqu'à 30" },
    { id: "s2", tech: "sql", badge: "🗄️ SQL", q: "Comment déclarer une clé étrangère id_cl avec suppression en cascade dans CREATE TABLE ?", a: "On utilise FOREIGN KEY (id_cl) REFERENCES classe(id_cl) ON DELETE CASCADE.", code: "FOREIGN KEY (id_cl) REFERENCES classe(id_cl)\n  ON DELETE CASCADE\n  ON UPDATE CASCADE" },
    { id: "s3", tech: "sql", badge: "🗄️ SQL", q: "Que se passe-t-il lors d'un DELETE sur la table parente sans ON DELETE CASCADE si des lignes enfants existent ?", a: "Le SGBD bloque la suppression (erreur 1451 — comportement RESTRICT par défaut) pour protéger l'intégrité référentielle.", code: "-- Sans ON DELETE CASCADE : suppression refusée si la clé est référencée" },
    { id: "s4", tech: "sql", badge: "🗄️ SQL", q: "Quelle est la différence entre WHERE et HAVING dans une requête SELECT ?", a: "WHERE filtre les lignes individuelles AVANT GROUP BY (sans fonction d'agrégation) ; HAVING filtre les groupes APRÈS GROUP BY (avec COUNT, SUM, AVG…).", code: "SELECT id_cl, COUNT(*) AS effectif\nFROM eleve\nWHERE age >= 17\nGROUP BY id_cl\nHAVING COUNT(*) >= 20;" },
    { id: "s5", tech: "sql", badge: "🗄️ SQL", q: "Comment ajouter une contrainte CHECK imposant que la note soit entre 0 et 20 avec ALTER TABLE ?", a: "ALTER TABLE eleve ADD CONSTRAINT chk_note CHECK (note BETWEEN 0 AND 20);", code: "ALTER TABLE eleve\nADD CONSTRAINT chk_note CHECK (note BETWEEN 0 AND 20);" },
    { id: "s6", tech: "sql", badge: "🗄️ SQL", q: "Quelle est la différence entre DELETE FROM table et DROP TABLE table ?", a: "DELETE FROM (LMD) supprime les enregistrements mais conserve la table ; DROP TABLE (LDD) détruit complètement la table et sa structure.", code: "DELETE FROM client WHERE ville = 'Sfax'; -- LMD\nDROP TABLE client;                       -- LDD" },
    { id: "s7", tech: "sql", badge: "🗄️ SQL", q: "Comment écrire une jointure entre Client(cin, nom) et Location(id, cin, date_loc) ?", a: "Avec INNER JOIN ... ON ou dans le WHERE en égalisant la clé primaire et la clé étrangère.", code: "SELECT C.nom, L.date_loc\nFROM Client C\nINNER JOIN Location L ON C.cin = L.cin;" },

    /* --- PHP & MySQLi (réservé 4SI / elevelabo3 / Admin) --- */
    { id: "p1", tech: "php", only4si: true, badge: "🐘 PHP", q: "Comment récupérer proprement un champ 'cin' envoyé en POST par un formulaire HTML ?", a: "On utilise le tableau superglobal $_POST['cin'] après avoir vérifié son existence avec isset().", code: "<?php\n$cin = $_POST['cin'];\n?>" },
    { id: "p2", tech: "php", only4si: true, badge: "🐘 MySQLi", q: "Quelles sont les 3 étapes pour se connecter à MySQL, exécuter une requête et fermer la connexion en PHP ?", a: "1) mysqli_connect('localhost','root','','bd')  2) mysqli_query($con, $req)  3) mysqli_close($con).", code: "$con = mysqli_connect(\"localhost\", \"root\", \"\", \"bd_bac\");\n$res = mysqli_query($con, $req);\nmysqli_close($con);" },
    { id: "p3", tech: "php", only4si: true, badge: "🐘 MySQLi", q: "Quelle est la différence entre mysqli_num_rows($res) et mysqli_affected_rows($con) ?", a: "mysqli_num_rows($res) compte les lignes retournées par un SELECT ; mysqli_affected_rows($con) compte les lignes modifiées par INSERT, UPDATE ou DELETE.", code: "// Après SELECT :\nif (mysqli_num_rows($res) == 0) echo \"Aucun résultat\";\n// Après INSERT / UPDATE / DELETE :\nif (mysqli_affected_rows($con) > 0) echo \"Succès\";" },
    { id: "p4", tech: "php", only4si: true, badge: "🐘 MySQLi", q: "Comment parcourir toutes les lignes d'un résultat SELECT avec mysqli_fetch_array() ?", a: "Avec une boucle while ($ligne = mysqli_fetch_array($res)) qui lit chaque enregistrement sous forme de tableau.", code: "while ($t = mysqli_fetch_array($res)) {\n  echo \"<tr><td>\" . $t['nom'] . \"</td></tr>\";\n}" }
  ];

  window.ouvrirFlashcardsSTI = function (filtreInit) {
    var exist = document.getElementById("sti-flashcards-modal");
    if (exist) exist.remove();

    var CLE_FC = "sti-flashcards-mastered";
    var mastered = {};
    try { mastered = JSON.parse(localStorage.getItem(CLE_FC) || "{}") || {}; } catch (e) {}

    var ok4 = est4SIAutoriseActuel();
    var filtreTech = filtreInit || "all";
    var seulementARevoir = false;
    var indexCourant = 0;
    var retourne = false;
    var cartesActives = [];

    function filtrerCartes() {
      cartesActives = STI_FLASHCARDS.filter(function (c) {
        if (c.only4si && !ok4) return false;
        if (filtreTech !== "all" && c.tech !== filtreTech) return false;
        if (seulementARevoir && mastered[c.id]) return false;
        return true;
      });
      if (indexCourant >= cartesActives.length) indexCourant = 0;
      retourne = false;
    }

    var fond = document.createElement("div");
    fond.id = "sti-flashcards-modal";
    fond.className = "sti-no-print";
    fond.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(13,18,30,.76);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:14px;font:600 13.5px/1.45 system-ui,'Segoe UI',sans-serif;";

    var boite = document.createElement("div");
    boite.style.cssText = "background:#fffdf7;color:#23201a;border:3px solid #23201a;border-radius:22px;padding:18px 20px;max-width:640px;width:100%;box-shadow:7px 7px 0 #f4511e,0 20px 55px rgba(0,0,0,.45);color-scheme:light;";

    boite.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px'>" +
        "<div>" +
          "<h3 style='margin:0;font-size:17px;font-weight:900;color:#23201a'>🃏 Flashcards Bac STI <span style='font-size:12px;color:#f4511e'>(Recto / Verso 3D)</span></h3>" +
          "<div id='sti-fc-stat' style='font-size:11.5px;color:#177245;font-weight:800;margin-top:2px'>Progression : 0 maîtrisée(s)</div>" +
        "</div>" +
        "<button type='button' id='sti-fc-close' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:5px 11px;font-weight:900;font-size:12px;cursor:pointer'>✕ Fermer</button>" +
      "</div>" +
      "<div id='sti-fc-filters' style='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px'>" +
        "<button type='button' data-t='all' style='border:2px solid #23201a;background:#f4511e;color:#fff;border-radius:999px;padding:4px 11px;font-weight:800;font-size:11.5px;cursor:pointer'>Tout</button>" +
        "<button type='button' data-t='html5' style='border:2px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:4px 11px;font-weight:800;font-size:11.5px;cursor:pointer'>🌐 HTML5</button>" +
        "<button type='button' data-t='css3' style='border:2px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:4px 11px;font-weight:800;font-size:11.5px;cursor:pointer'>🎨 CSS3</button>" +
        "<button type='button' data-t='js' style='border:2px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:4px 11px;font-weight:800;font-size:11.5px;cursor:pointer'>📜 JS</button>" +
        "<button type='button' data-t='sql' style='border:2px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:4px 11px;font-weight:800;font-size:11.5px;cursor:pointer'>🗄️ SQL</button>" +
        (ok4 ? "<button type='button' data-t='php' style='border:2px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:4px 11px;font-weight:800;font-size:11.5px;cursor:pointer'>🐘 PHP</button>" : "") +
        "<button type='button' id='sti-fc-todo-only' style='margin-left:auto;border:1.8px dashed #23201a;background:#fff;color:#23201a;border-radius:999px;padding:4px 10px;font-weight:800;font-size:11px;cursor:pointer'>🔁 À revoir uniquement</button>" +
      "</div>" +
      "<div id='sti-fc-scene' style='position:relative;perspective:750px;-webkit-perspective:750px;min-height:245px;margin:8px 0 12px;user-select:none'>" +
        "<div id='sti-fc-shadow' style='position:absolute;left:18px;right:18px;bottom:-10px;height:20px;border-radius:50%;background:rgba(26,26,46,.28);filter:blur(9px);transition:transform .28s ease,opacity .28s ease;pointer-events:none;z-index:0'></div>" +
        "<div id='sti-fc-card' tabindex='0' style='position:relative;z-index:1;min-height:245px;border:3px solid #23201a;border-radius:18px;padding:18px;background:linear-gradient(145deg,#ffffff 0%,#fffdf7 100%);box-shadow:5px 6px 0 #23201a,0 10px 24px rgba(0,0,0,.14);cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;transform:perspective(620px) translateY(0px) rotateX(0deg) rotateY(0deg) scale(1);transform-origin:center center;will-change:transform,box-shadow;overflow:hidden;box-sizing:border-box'></div>" +
      "</div>" +
      "<div style='display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:15px'>" +
        "<div style='display:flex;gap:6px'>" +
          "<button type='button' id='sti-fc-prev' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:7px 13px;font-weight:900;font-size:12px;cursor:pointer'>◀ Préc.</button>" +
          "<button type='button' id='sti-fc-flip' style='border:2px solid #23201a;background:#ffd54f;color:#23201a;border-radius:999px;padding:7px 14px;font-weight:900;font-size:12px;cursor:pointer;box-shadow:2px 2px 0 #23201a'>🔄 Retourner la carte</button>" +
          "<button type='button' id='sti-fc-next' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:7px 13px;font-weight:900;font-size:12px;cursor:pointer'>Suiv. ▶</button>" +
          "<button type='button' id='sti-fc-shuf' title='Mélanger les cartes' style='border:2px solid #23201a;background:#f3ead9;color:#23201a;border-radius:999px;padding:7px 11px;font-weight:900;font-size:12px;cursor:pointer'>🔀</button>" +
        "</div>" +
        "<button type='button' id='sti-fc-master' style='border:2px solid #23201a;background:#e3f6e8;color:#177245;border-radius:999px;padding:7px 14px;font-weight:900;font-size:12px;cursor:pointer;box-shadow:2px 2px 0 #23201a'>✅ Je maîtrise</button>" +
      "</div>";

    fond.appendChild(boite);
    (document.body || document.documentElement).appendChild(fond);

    var cardEl = boite.querySelector("#sti-fc-card");
    var shadowEl = boite.querySelector("#sti-fc-shadow");
    var statEl = boite.querySelector("#sti-fc-stat");
    var btnMaster = boite.querySelector("#sti-fc-master");
    var btnTodoOnly = boite.querySelector("#sti-fc-todo-only");
    var enRotation = false;

    function majCompteurGlobal() {
      var totDispo = STI_FLASHCARDS.filter(function (c) { return !c.only4si || ok4; });
      var nbOk = totDispo.filter(function (c) { return Boolean(mastered[c.id]); }).length;
      statEl.textContent = "✅ " + nbOk + " / " + totDispo.length + " cartes maîtrisées (sauvegardé hors-ligne)";
      if (typeof window.__stiMajBadgeFlashcards === "function") {
        window.__stiMajBadgeFlashcards();
      }
    }

    function peindreContenuCarte() {
      majCompteurGlobal();
      if (!cartesActives.length) {
        cardEl.style.background = "#f9f1e3";
        cardEl.innerHTML = "<div style='margin:auto;text-align:center;padding:24px'><div style='font-size:28px;margin-bottom:6px'>🎉</div><b>Toutes les cartes de ce filtre sont maîtrisées !</b><br><span style='font-size:12px;color:#5a5244'>Désactivez le filtre « À revoir uniquement » ou changez de module.</span></div>";
        btnMaster.style.display = "none";
        return;
      }
      btnMaster.style.display = "inline-block";
      var c = cartesActives[indexCourant];
      var estOk = Boolean(mastered[c.id]);
      btnMaster.textContent = estOk ? "✓ Maîtrisée (cliquer pour revoir)" : "✅ Je maîtrise cette carte";
      btnMaster.style.background = estOk ? "#f3ead9" : "#e3f6e8";
      btnMaster.style.color = estOk ? "#5a5244" : "#177245";

      var glareHtml = "<div class='sti-fc-glare' style='position:absolute;inset:-45%;background:linear-gradient(115deg,transparent 36%,rgba(255,255,255,.78) 50%,transparent 64%);transform:translateX(-120%) rotate(15deg);opacity:0;pointer-events:none;z-index:2'></div>";

      if (!retourne) {
        cardEl.style.background = "linear-gradient(145deg,#ffffff 0%,#fffdf7 100%)";
        cardEl.style.borderColor = "#23201a";
        cardEl.innerHTML =
          glareHtml +
          "<div style='display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1'>" +
            "<span style='display:inline-block;padding:2px 10px;border-radius:999px;border:1.8px solid #23201a;background:#f3ead9;font-size:11px;font-weight:900'>" + esc(c.badge) + " · RECTO (Question)</span>" +
            "<span style='font-size:11.5px;font-weight:900;color:#7a6f5d'>Carte " + (indexCourant + 1) + " / " + cartesActives.length + (estOk ? " · ✅" : "") + "</span>" +
          "</div>" +
          "<div style='font-size:16.5px;font-weight:900;color:#23201a;margin:18px 0;line-height:1.45;position:relative;z-index:1'>" + esc(c.q) + "</div>" +
          "<div style='font-size:11.5px;color:#f4511e;font-weight:800;text-align:center;position:relative;z-index:1'>👆 Cliquez sur la carte (ou Espace) pour la retourner en 3D</div>";
      } else {
        cardEl.style.background = "linear-gradient(145deg,#fff8ec 0%,#ffefcc 100%)";
        cardEl.style.borderColor = "#177245";
        cardEl.innerHTML =
          glareHtml +
          "<div style='display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1'>" +
            "<span style='display:inline-block;padding:2px 10px;border-radius:999px;border:1.8px solid #177245;background:#e3f6e8;color:#177245;font-size:11px;font-weight:900'>💡 VERSO (Réponse &amp; Syntaxe Bac)</span>" +
            "<span style='font-size:11.5px;font-weight:900;color:#7a6f5d'>Carte " + (indexCourant + 1) + " / " + cartesActives.length + "</span>" +
          "</div>" +
          "<div style='font-size:13.8px;font-weight:800;color:#23201a;margin:10px 0 8px;line-height:1.42;position:relative;z-index:1'>" + esc(c.a) + "</div>" +
          (c.code ? "<pre style='margin:0;padding:9px 11px;border-radius:11px;background:#17172e;color:#f5f3ff;font:700 11.8px/1.4 ui-monospace,Consolas,monospace;overflow-x:auto;border:2px solid #23201a;position:relative;z-index:1'>" + esc(c.code) + "</pre>" : "") +
          "<div style='font-size:11px;color:#7a6f5d;font-weight:800;text-align:right;margin-top:6px;position:relative;z-index:1'>👆 Cliquez pour retourner côté question</div>";
      }
    }

    function retournerCarte3D() {
      if (!cartesActives.length || enRotation) return;
      enRotation = true;
      var sens = retourne ? -1 : 1;
      var duree = 560;
      var debut = (window.performance && performance.now) ? performance.now() : Date.now();
      var faceBasculee = false;

      function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      }

      function step(now) {
        var t = Math.min(1, Math.max(0, (now - debut) / duree));
        var p = easeInOutCubic(t);
        var arc = Math.sin(p * Math.PI); /* 0 -> 1 (milieu à 90°) -> 0 */

        if (p >= 0.5 && !faceBasculee) {
          faceBasculee = true;
          retourne = !retourne;
          peindreContenuCarte();
        }

        /* Angle Y : de 0° à +90° (phase 1), puis de -90° à 0° (phase 2, même sens de rotation) */
        var degY = (p < 0.5)
          ? (sens * (p * 2) * 89.2)
          : (-sens * ((1 - p) * 2) * 89.2);

        var liftY = -28 * arc;
        var sc = 1 + 0.085 * arc;
        var degX = 12 * arc;
        var degZ = -sens * 3.5 * arc;

        cardEl.style.transition = "none";
        cardEl.style.transform =
          "perspective(520px) translateY(" + liftY.toFixed(1) + "px) " +
          "rotateX(" + degX.toFixed(2) + "deg) " +
          "rotateY(" + degY.toFixed(2) + "deg) " +
          "rotateZ(" + degZ.toFixed(2) + "deg) " +
          "scale(" + sc.toFixed(3) + ")";

        /* Tranche 3D épaisse de la carte bristol + ombre portée au sol */
        var dirTranche = (p < 0.5) ? -sens : sens;
        var ep = Math.max(1, Math.round(arc * 9));
        var ombSolY = Math.round(6 + arc * 28);
        var ombSolBlur = Math.round(18 + arc * 26);
        cardEl.style.boxShadow =
          (dirTranche * Math.round(ep * 0.5)) + "px 2px 0 #d8cbb8, " +
          (dirTranche * ep) + "px " + Math.round(4 + arc * 6) + "px 0 #23201a, " +
          "0 " + ombSolY + "px " + ombSolBlur + "px rgba(0,0,0," + (0.14 + 0.22 * arc).toFixed(2) + ")";

        if (shadowEl) {
          shadowEl.style.transition = "none";
          shadowEl.style.transform = "translateY(" + Math.round(arc * 18) + "px) scale(" + (1 - 0.22 * arc).toFixed(2) + ")";
          shadowEl.style.opacity = (0.95 - 0.55 * arc).toFixed(2);
        }

        var g = cardEl.querySelector(".sti-fc-glare");
        if (g) {
          g.style.transition = "none";
          g.style.opacity = (arc * 0.92).toFixed(2);
          g.style.transform = "translateX(" + Math.round((p - 0.5) * 180) + "%) rotate(15deg)";
        }

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          cardEl.style.transform = "perspective(520px) translateY(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)";
          cardEl.style.boxShadow = "5px 6px 0 #23201a, 0 10px 24px rgba(0,0,0,0.14)";
          if (shadowEl) {
            shadowEl.style.transform = "translateY(0px) scale(1)";
            shadowEl.style.opacity = "0.95";
          }
          if (g) g.style.opacity = "0";
          enRotation = false;
        }
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(step);
      });
    }

    function afficherCarte(animDir) {
      peindreContenuCarte();
      if (animDir === "next" || animDir === "prev") {
        var signe = animDir === "next" ? 1 : -1;
        var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
        var dur = 300;
        function stepDeal(now) {
          var t = Math.min(1, Math.max(0, (now - t0) / dur));
          var k = 1 - Math.pow(1 - t, 3);
          var rest = 1 - k;
          cardEl.style.transition = "none";
          cardEl.style.opacity = (0.35 + 0.65 * k).toFixed(2);
          cardEl.style.transform =
            "perspective(520px) translateX(" + (signe * 52 * rest).toFixed(1) + "px) " +
            "translateY(" + (-12 * rest).toFixed(1) + "px) " +
            "rotateY(" + (-signe * 28 * rest).toFixed(1) + "deg) " +
            "rotateZ(" + (signe * 4 * rest).toFixed(1) + "deg) " +
            "scale(" + (0.94 + 0.06 * k).toFixed(3) + ")";
          if (t < 1) {
            requestAnimationFrame(stepDeal);
          } else {
            cardEl.style.opacity = "1";
            cardEl.style.transform = "perspective(520px) translateY(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)";
          }
        }
        requestAnimationFrame(stepDeal);
      }
    }

    cardEl.addEventListener("click", retournerCarte3D);
    boite.querySelector("#sti-fc-flip").addEventListener("click", retournerCarte3D);
    boite.querySelector("#sti-fc-prev").addEventListener("click", function () {
      if (!cartesActives.length || enRotation) return;
      indexCourant = (indexCourant - 1 + cartesActives.length) % cartesActives.length;
      retourne = false;
      afficherCarte("prev");
    });
    boite.querySelector("#sti-fc-next").addEventListener("click", function () {
      if (!cartesActives.length || enRotation) return;
      indexCourant = (indexCourant + 1) % cartesActives.length;
      retourne = false;
      afficherCarte("next");
    });
    boite.querySelector("#sti-fc-shuf").addEventListener("click", function () {
      if (enRotation) return;
      for (var i = cartesActives.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = cartesActives[i];
        cartesActives[i] = cartesActives[j];
        cartesActives[j] = tmp;
      }
      indexCourant = 0;
      retourne = false;
      afficherCarte("next");
    });
    cardEl.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        retournerCarte3D();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        boite.querySelector("#sti-fc-next").click();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        boite.querySelector("#sti-fc-prev").click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        fond.remove();
      }
    });
    btnMaster.addEventListener("click", function () {
      if (!cartesActives.length) return;
      var c = cartesActives[indexCourant];
      mastered[c.id] = !mastered[c.id];
      try { localStorage.setItem(CLE_FC, JSON.stringify(mastered)); } catch (e) {}
      if (seulementARevoir && mastered[c.id]) {
        filtrerCartes();
      }
      afficherCarte();
    });
    btnTodoOnly.addEventListener("click", function () {
      seulementARevoir = !seulementARevoir;
      btnTodoOnly.style.background = seulementARevoir ? "#ffd54f" : "#fff";
      filtrerCartes();
      afficherCarte();
    });

    boite.querySelectorAll("#sti-fc-filters button[data-t]").forEach(function (b) {
      b.addEventListener("click", function () {
        filtreTech = b.getAttribute("data-t") || "all";
        boite.querySelectorAll("#sti-fc-filters button[data-t]").forEach(function (x) {
          var on = x === b;
          x.style.background = on ? "#f4511e" : "#f3ead9";
          x.style.color = on ? "#fff" : "#23201a";
        });
        filtrerCartes();
        afficherCarte();
      });
    });

    boite.querySelector("#sti-fc-close").addEventListener("click", function () { fond.remove(); });
    fond.addEventListener("click", function (e) { if (e.target === fond) fond.remove(); });

    filtrerCartes();
    afficherCarte();
    cardEl.focus();
  };

  /* ---------- 3. Mini « Bac à sable » de code en direct (HTML / CSS / JS — 100 % hors-ligne) ---------- */
  var STI_SANDBOX_TEMPLATES = {
    form_bac: {
      label: "📋 Formulaire HTML5 + Contrôle JS verif() (Type Bac)",
      html: "<fieldset>\n  <legend>Inscription Club Robotique STI</legend>\n  <form onsubmit=\"return verif()\">\n    <label>Nom (lettres uniquement) :</label>\n    <input type=\"text\" id=\"nom\" value=\"Ali\">\n\n    <label>Âge (entre 14 et 22) :</label>\n    <input type=\"number\" id=\"age\" value=\"18\">\n\n    <label>Ville (<datalist>) :</label>\n    <input type=\"text\" id=\"ville\" list=\"lst_villes\" placeholder=\"Choisir ou saisir…\">\n    <datalist id=\"lst_villes\">\n      <option value=\"Sousse\">\n      <option value=\"Tunis\">\n      <option value=\"Sfax\">\n    </datalist>\n\n    <button type=\"submit\">✅ Valider l'inscription</button>\n  </form>\n  <p id=\"msg\"></p>\n</fieldset>",
      css: "body { font-family: system-ui, sans-serif; background: #fffdf7; padding: 14px; color: #1a1a2e; }\nfieldset { border: 2.5px solid #1a1a2e; border-radius: 14px; padding: 14px 18px; background: #fff; box-shadow: 4px 4px 0 #1a1a2e; max-width: 380px; }\nlegend { font-weight: 900; background: #ffd23f; border: 2px solid #1a1a2e; padding: 3px 10px; border-radius: 999px; }\nlabel { display: block; margin-top: 9px; font-weight: 700; font-size: 13px; }\ninput { width: 100%; padding: 7px 10px; margin-top: 3px; border: 2px solid #1a1a2e; border-radius: 8px; box-sizing: border-box; }\nbutton { margin-top: 12px; width: 100%; padding: 9px; border: 2px solid #1a1a2e; border-radius: 10px; background: #2ecc9e; font-weight: 900; cursor: pointer; box-shadow: 3px 3px 0 #1a1a2e; }\n#msg { font-weight: 800; margin-top: 10px; }",
      js: "function alpha(ch) {\n  ch = ch.toUpperCase();\n  if (ch.length === 0) return false;\n  for (var i = 0; i < ch.length; i++) {\n    if (ch.charAt(i) < 'A' || ch.charAt(i) > 'Z') return false;\n  }\n  return true;\n}\n\nfunction verif() {\n  var nom = document.getElementById('nom').value.trim();\n  var age = document.getElementById('age').value;\n  var msg = document.getElementById('msg');\n\n  if (!alpha(nom)) {\n    msg.style.color = '#c0392b';\n    msg.textContent = '❌ Le nom doit contenir uniquement des lettres !';\n    console.log('Erreur : nom invalide (' + nom + ')');\n    return false;\n  }\n  if (age === '' || isNaN(age) || Number(age) < 14 || Number(age) > 22) {\n    msg.style.color = '#c0392b';\n    msg.textContent = '❌ Âge invalide (doit être entre 14 et 22) !';\n    return false;\n  }\n  msg.style.color = '#177245';\n  msg.textContent = '🎉 Bravo ' + nom + ' (' + age + ' ans), formulaire valide !';\n  console.log('Formulaire validé pour :', nom, age);\n  return false; // empêche le rechargement dans l'aperçu\n}"
    },
    css_flex: {
      label: "🎨 Flexbox & Animation CSS3 (@keyframes)",
      html: "<div class=\"galerie\">\n  <div class=\"carte\">🌐 HTML5</div>\n  <div class=\"carte\">🎨 CSS3</div>\n  <div class=\"carte\">📜 JS</div>\n</div>",
      css: ".galerie {\n  display: flex;\n  justify-content: space-around;\n  align-items: center;\n  gap: 12px;\n  padding: 24px;\n}\n.carte {\n  padding: 18px 22px;\n  border: 3px solid #1a1a2e;\n  border-radius: 16px;\n  background: #ffd23f;\n  font: 900 16px system-ui, sans-serif;\n  box-shadow: 4px 4px 0 #1a1a2e;\n  transition: transform 0.25s;\n  animation: flotter 2.2s ease-in-out infinite;\n}\n.carte:hover {\n  transform: scale(1.12) rotate(-3deg);\n  background: #4cc9f0;\n}\n@keyframes flotter {\n  0%, 100% { transform: translateY(0); }\n  50%      { transform: translateY(-8px); }\n}",
      js: "console.log('Survolez les cartes Flexbox pour tester :hover !');"
    },
    js_chaines: {
      label: "📜 Chaînes & Fonctions JavaScript (indexOf, substring, Date)",
      html: "<div style=\"font-family:system-ui;padding:12px\">\n  <h3>🔬 Testeur de chaînes JavaScript</h3>\n  <input id=\"ch\" value=\"Baccalaureat_STI_2026\" style=\"padding:7px;width:240px;border:2px solid #23201a;border-radius:8px\">\n  <button onclick=\"analyser()\" style=\"padding:7px 14px;border:2px solid #23201a;border-radius:8px;background:#ffd23f;font-weight:800;cursor:pointer\">Analyser</button>\n  <pre id=\"out\" style=\"background:#17172e;color:#8aff80;padding:12px;border-radius:10px;margin-top:10px\"></pre>\n</div>",
      css: "",
      js: "function analyser() {\n  var s = document.getElementById('ch').value;\n  var d = new Date();\n  var res = [\n    'Chaîne        : ' + s,\n    'Longueur      : ' + s.length,\n    'Majuscules    : ' + s.toUpperCase(),\n    'substring(0,3): ' + s.substring(0, 3),\n    'indexOf(\"STI\"): ' + s.indexOf('STI'),\n    'Année système : ' + d.getFullYear()\n  ].join('\\n');\n  document.getElementById('out').textContent = res;\n  console.log('Analyse effectuée pour :', s);\n}\nanalyser();"
    },
    vierge: {
      label: "📄 Page vierge (HTML + CSS + JS)",
      html: "<h2>Bonjour STI !</h2>\n<p id=\"demo\">Modifiez le code à gauche pour tester.</p>",
      css: "body {\n  font-family: system-ui, sans-serif;\n  padding: 16px;\n}\nh2 { color: #f4511e; }",
      js: "console.log('Bac à sable prêt !');"
    }
  };

  window.ouvrirSandboxSTI = function () {
    var exist = document.getElementById("sti-sandbox-modal");
    if (exist) exist.remove();

    var CLE_SB = "sti-sandbox-code-v1";
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(CLE_SB) || "null"); } catch (e) {}
    var initTpl = STI_SANDBOX_TEMPLATES.form_bac;
    var codeState = saved && typeof saved.html === "string" ? saved : {
      tpl: "form_bac",
      html: initTpl.html,
      css: initTpl.css,
      js: initTpl.js
    };

    var fond = document.createElement("div");
    fond.id = "sti-sandbox-modal";
    fond.className = "sti-no-print";
    fond.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(13,18,30,.78);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:12px;font:600 13px/1.4 system-ui,'Segoe UI',sans-serif;";

    var boite = document.createElement("div");
    boite.style.cssText = "background:#fffdf7;color:#23201a;border:3px solid #23201a;border-radius:20px;width:min(1040px,97vw);height:min(88vh,740px);display:flex;flex-direction:column;box-shadow:7px 7px 0 #f4511e,0 24px 60px rgba(0,0,0,.5);overflow:hidden;color-scheme:light;";

    boite.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;background:#f9f1e3;border-bottom:2px solid #23201a'>" +
        "<div style='display:flex;align-items:center;gap:8px;flex-wrap:wrap'>" +
          "<strong style='font-size:15px;font-weight:900;color:#23201a'>💻 Bac à sable HTML / CSS / JS</strong>" +
          "<select id='sti-sb-tpl' style='border:2px solid #23201a;border-radius:999px;padding:4px 10px;background:#fff;color:#23201a;font-weight:800;font-size:11.5px'>" +
            "<option value='form_bac'>📋 Modèle : Formulaire HTML5 + verif() JS</option>" +
            "<option value='css_flex'>🎨 Modèle : Flexbox &amp; Animation CSS3</option>" +
            "<option value='js_chaines'>📜 Modèle : Chaînes &amp; Date JavaScript</option>" +
            "<option value='vierge'>📄 Modèle : Page vierge</option>" +
          "</select>" +
        "</div>" +
        "<div style='display:flex;align-items:center;gap:6px;flex-wrap:wrap'>" +
          "<button type='button' id='sti-sb-run' style='border:2px solid #23201a;background:#2ecc9e;color:#1a1a2e;border-radius:999px;padding:5px 13px;font-weight:900;font-size:12px;cursor:pointer;box-shadow:2px 2px 0 #23201a'>▶ Exécuter</button>" +
          "<button type='button' id='sti-sb-reset' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:5px 10px;font-weight:800;font-size:11.5px;cursor:pointer'>↺ Modèle</button>" +
          "<button type='button' id='sti-sb-full' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:5px 10px;font-weight:800;font-size:11.5px;cursor:pointer'>⛶ Plein écran</button>" +
          "<button type='button' id='sti-sb-close' style='border:2px solid #23201a;background:#ff5d8f;color:#fff;border-radius:999px;padding:5px 11px;font-weight:900;font-size:12px;cursor:pointer'>✕ Fermer</button>" +
        "</div>" +
      "</div>" +
      "<div style='flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));min-height:0;overflow:hidden'>" +
        "<div style='display:flex;flex-direction:column;border-right:2px solid #23201a;min-height:0;background:#17172e;color:#f5f3ff'>" +
          "<div id='sti-sb-tabs' style='display:flex;gap:4px;padding:7px 10px;background:#0f0f23;border-bottom:1px solid rgba(255,255,255,.15)'>" +
            "<button type='button' data-lang='html' style='border:2px solid #ffd23f;background:#ffd23f;color:#1a1a2e;border-radius:8px;padding:4px 12px;font-weight:900;font-size:11.5px;cursor:pointer'>🌐 HTML</button>" +
            "<button type='button' data-lang='css' style='border:2px solid rgba(255,255,255,.25);background:transparent;color:#fff;border-radius:8px;padding:4px 12px;font-weight:800;font-size:11.5px;cursor:pointer'>🎨 CSS</button>" +
            "<button type='button' data-lang='js' style='border:2px solid rgba(255,255,255,.25);background:transparent;color:#fff;border-radius:8px;padding:4px 12px;font-weight:800;font-size:11.5px;cursor:pointer'>📜 JavaScript</button>" +
          "</div>" +
          "<textarea id='sti-sb-editor' spellcheck='false' style='flex:1;width:100%;border:0;padding:12px;background:#17172e;color:#f5f3ff;font:600 12.5px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;resize:none;outline:none'></textarea>" +
        "</div>" +
        "<div style='display:flex;flex-direction:column;min-height:0;background:#ffffff'>" +
          "<div style='padding:6px 12px;background:#f3ead9;border-bottom:1.5px solid #23201a;font-size:11.5px;font-weight:900;color:#23201a;display:flex;justify-content:space-between'>" +
            "<span>👁️ Rendu en direct</span>" +
            "<span style='color:#177245'>100 % Hors-ligne</span>" +
          "</div>" +
          "<iframe id='sti-sb-frame' sandbox='allow-scripts allow-modals' style='flex:1;width:100%;border:0;background:#fff'></iframe>" +
          "<div style='height:105px;border-top:2px solid #23201a;background:#0f0f23;color:#e8e8f5;display:flex;flex-direction:column'>" +
            "<div style='padding:4px 10px;background:#17172e;border-bottom:1px solid rgba(255,255,255,.12);font-size:10.5px;font-weight:800;color:#ffd23f;display:flex;justify-content:space-between'>" +
              "<span>🖥️ Console JavaScript (console.log / alert / erreurs)</span>" +
              "<button type='button' id='sti-sb-clear-log' style='border:0;background:transparent;color:#a9a9c7;font-size:10.5px;font-weight:800;cursor:pointer'>Effacer</button>" +
            "</div>" +
            "<div id='sti-sb-console' style='flex:1;padding:6px 10px;overflow-y:auto;font:600 11.5px/1.45 ui-monospace,Consolas,monospace'></div>" +
          "</div>" +
        "</div>" +
      "</div>";

    fond.appendChild(boite);
    (document.body || document.documentElement).appendChild(fond);

    var langActif = "html";
    var editor = boite.querySelector("#sti-sb-editor");
    var frame = boite.querySelector("#sti-sb-frame");
    var consEl = boite.querySelector("#sti-sb-console");
    var selTpl = boite.querySelector("#sti-sb-tpl");
    if (codeState.tpl && STI_SANDBOX_TEMPLATES[codeState.tpl]) {
      selTpl.value = codeState.tpl;
    }

    function sauverEtat() {
      codeState[langActif] = editor.value;
      try { localStorage.setItem(CLE_SB, JSON.stringify(codeState)); } catch (e) {}
    }

    function ajouterLog(type, txt) {
      var div = document.createElement("div");
      div.style.cssText = "padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.08);color:" +
        (type === "err" ? "#ff5d8f" : (type === "alert" ? "#ffd23f" : "#8aff80"));
      div.textContent = (type === "err" ? "❌ " : (type === "alert" ? "🔔 [alert] " : "› ")) + txt;
      consEl.appendChild(div);
      consEl.scrollTop = consEl.scrollHeight;
    }

    function onMsgSandbox(e) {
      if (!e.data || e.data.source !== "sti-sandbox") return;
      ajouterLog(e.data.kind || "log", e.data.msg || "");
    }
    window.addEventListener("message", onMsgSandbox);

    function executerCode() {
      sauverEtat();
      consEl.innerHTML = "";
      var pontConsole =
        "<script>" +
        "(function(){" +
          "function send(k,a){try{parent.postMessage({source:'sti-sandbox',kind:k,msg:[].slice.call(a).map(function(x){return typeof x==='object'?JSON.stringify(x):String(x)}).join(' ')},'*')}catch(e){}}" +
          "var oLog=console.log;console.log=function(){send('log',arguments);if(oLog)oLog.apply(console,arguments)};" +
          "var oErr=console.error;console.error=function(){send('err',arguments);if(oErr)oErr.apply(console,arguments)};" +
          "window.alert=function(m){send('alert',[m]);};" +
          "window.onerror=function(msg,u,line){send('err',[msg+' (ligne '+line+')']);};" +
        "})();" +
        "<\/script>";
      var doc = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>" +
        (codeState.css || "") +
        "</style>" + pontConsole + "</head><body>" +
        (codeState.html || "") +
        "<script>\ntry {\n" + (codeState.js || "") + "\n} catch(err) { console.error(err.message); }\n<\/script></body></html>";
      frame.srcdoc = doc;
    }

    function basculerLang(nvLang) {
      codeState[langActif] = editor.value;
      langActif = nvLang;
      editor.value = codeState[langActif] || "";
      boite.querySelectorAll("#sti-sb-tabs button[data-lang]").forEach(function (b) {
        var on = b.getAttribute("data-lang") === nvLang;
        b.style.background = on ? "#ffd23f" : "transparent";
        b.style.color = on ? "#1a1a2e" : "#fff";
        b.style.borderColor = on ? "#ffd23f" : "rgba(255,255,255,.25)";
      });
      editor.focus();
    }

    boite.querySelectorAll("#sti-sb-tabs button[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { basculerLang(b.getAttribute("data-lang")); });
    });

    var timerRun = null;
    editor.addEventListener("input", function () {
      sauverEtat();
      if (timerRun) clearTimeout(timerRun);
      timerRun = setTimeout(executerCode, 450);
    });

    selTpl.addEventListener("change", function () {
      var t = STI_SANDBOX_TEMPLATES[selTpl.value];
      if (!t) return;
      codeState.tpl = selTpl.value;
      codeState.html = t.html;
      codeState.css = t.css;
      codeState.js = t.js;
      editor.value = codeState[langActif] || "";
      executerCode();
    });

    boite.querySelector("#sti-sb-run").addEventListener("click", executerCode);
    boite.querySelector("#sti-sb-reset").addEventListener("click", function () {
      var t = STI_SANDBOX_TEMPLATES[selTpl.value] || STI_SANDBOX_TEMPLATES.form_bac;
      codeState.html = t.html;
      codeState.css = t.css;
      codeState.js = t.js;
      editor.value = codeState[langActif] || "";
      executerCode();
    });
    boite.querySelector("#sti-sb-clear-log").addEventListener("click", function () { consEl.innerHTML = ""; });

    var estFull = false;
    boite.querySelector("#sti-sb-full").addEventListener("click", function () {
      estFull = !estFull;
      if (estFull) {
        fond.style.padding = "0";
        boite.style.width = "100vw";
        boite.style.height = "100vh";
        boite.style.borderRadius = "0";
      } else {
        fond.style.padding = "12px";
        boite.style.width = "min(1040px,97vw)";
        boite.style.height = "min(88vh,740px)";
        boite.style.borderRadius = "20px";
      }
    });

    function fermerSb() {
      window.removeEventListener("message", onMsgSandbox);
      fond.remove();
    }
    boite.querySelector("#sti-sb-close").addEventListener("click", fermerSb);
    fond.addEventListener("click", function (e) { if (e.target === fond) fermerSb(); });

    editor.value = codeState[langActif] || "";
    executerCode();
  };

  /* ---------- 4. Bouton universel « ⬆ Haut » sur toutes les pages qui n'en ont pas déjà un ---------- */
  (function installerBoutonHautUniversel() {
    function initBtnHaut() {
      if (document.getElementById("sti-auto-to-top")) return;
      if (document.querySelector("#backToTopBtn, #backToTop, #to-top, .to-top, #btn-admin-to-top, .back-to-top-btn")) return;
      if (!document.body) return;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "sti-auto-to-top";
      btn.className = "sti-no-print";
      btn.setAttribute("aria-label", "Remonter en haut de la page");
      btn.title = "Remonter en haut";
      btn.textContent = "⬆ Haut";
      btn.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:2147483640;display:inline-flex;align-items:center;gap:6px;" +
        "padding:8px 14px;border-radius:999px;border:2.5px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);" +
        "color:#fff;font:900 12px/1 system-ui,'Segoe UI',sans-serif;cursor:pointer;box-shadow:3px 3px 0 #23201a,0 8px 18px rgba(0,0,0,.22);" +
        "opacity:0;visibility:hidden;transform:translateY(12px) scale(.92);pointer-events:none;transition:opacity .2s ease,transform .2s ease,visibility .2s ease;";

      btn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      document.body.appendChild(btn);

      function majVisibilite() {
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        var vis = y > 220;
        btn.style.opacity = vis ? "1" : "0";
        btn.style.visibility = vis ? "visible" : "hidden";
        btn.style.transform = vis ? "translateY(0) scale(1)" : "translateY(12px) scale(.92)";
        btn.style.pointerEvents = vis ? "auto" : "none";
      }

      window.addEventListener("scroll", majVisibilite, { passive: true });
      majVisibilite();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initBtnHaut);
    } else {
      setTimeout(initBtnHaut, 120);
    }
  })();
})();

