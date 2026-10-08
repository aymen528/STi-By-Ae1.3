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

  function estGoldProfil(p) {
    return Boolean(p && (p.gold === true || /\|\s*GOLD$/i.test(p.lycee || "")));
  }
  function lyceePropre(p) {
    return ((p && p.lycee) || "—").replace(/\s*\|\s*GOLD$/i, "") || "—";
  }
  function esc(t) { var d = document.createElement("i"); d.textContent = t || ""; return d.innerHTML; }

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
      btnRoue.textContent = ok ? "👑" : "⚙️";
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

  sb.auth.getSession().then(function (r) {
    var session = r && r.data ? r.data.session : null;
    if (!session) {
      /* Mode hors-ligne ou jeton expiré : restauration immédiate de la session locale + reconnexion silencieuse dès qu'Internet est là */
      var cache = null;
      try { cache = JSON.parse(localStorage.getItem("sti-session-cache") || "null"); } catch (e) {}
      var tOff = parseInt(localStorage.getItem("sti-offline") || "0", 10);
      var tsValide = (cache && cache.ts) || tOff;
      if (tsValide && Date.now() - tsValide < 30 * 86400000) {
        if (cache && cache.isAdmin) {
          currentUid = cache.id || "admin";
          appliquerModeGold(true);
          if (window === window.top) badgeAdmin();
          if (navigator.onLine) synchroniserFileHorsLigne(false);
          return;
        }
        var fakeUser = {
          id: (cache && cache.id) || "offline-user",
          email: (cache && cache.email) || "Abonné hors-ligne",
          user_metadata: (cache && cache.user_metadata) || {}
        };
        currentUid = fakeUser.id;
        currentClasse = (cache && cache.classe) || "";
        appliquerModeGold(Boolean(cache && cache.gold), cache || {});
        panneauCompte(fakeUser, cache || {});
        installerSuiviQuizAuto();
        journal(fakeUser.id);
        if (navigator.onLine) synchroniserFileHorsLigne(true);
        return;
      }
      localStorage.removeItem("sti-offline");
      localStorage.removeItem("sti-session-cache");
      localStorage.removeItem("sti-gold");
      localStorage.removeItem("sti-admin-gold");
      redirigerTop(PORTAIL + "#connexion");
      return;
    }
    var user = session.user;
    currentUid = user.id;
    synchroniserFileHorsLigne();
    if ((user.email || "").toLowerCase() === (cfg.ADMIN || "").toLowerCase()) {
      try {
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
      if (window === window.top) badgeAdmin();
      journal(user.id);
      return;
    }

    function appliquerStatut(rp) {
      if (rp.error) return true;
      if (!rp.data) {
        sortirImmediatement("#refuse");
        return false;
      }
      var st = rp.data.statut;
      if (st === "actif") {
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
        return true;
      }
      if (st === "en_attente") { sortirImmediatement("#attente"); return false; }
      if (st === "exclu") { sortirImmediatement("#exclu"); return false; }
      sortirImmediatement("#refuse");
      return false;
    }

    function entrer(profil) {
      currentClasse = (profil && profil.classe) || "";
      appliquerModeGold(estGoldProfil(profil), profil);
      verrouBio(user, function () {
        panneauCompte(user, profil || {});
        surveillerSessionTempsReel(user.id, appliquerStatut);
        installerSuiviQuizAuto();
        journal(user.id);
      });
    }

    sb.from("profiles").select("statut,lycee,classe").eq("id", user.id).maybeSingle().then(function (rp) {
      if (rp.error) { entrer({}); return; }
      if (!appliquerStatut(rp)) return;
      entrer(rp.data || {});
    });
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
    var mods = ["HTML5", "CSS3", "JS", "PHP", "SQL"];
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

    var btnBac = document.createElement("a");
    btnBac.href = cfg.RACINE + "bac-pratique.html";
    btnBac.textContent = "🧪 Atelier Bac Pratique (/20)";
    btnBac.style.cssText = "display:block;margin:8px 0 0 auto;border:1.5px solid #23201a;background:#f3ead9;color:#23201a;text-decoration:none;text-align:center;border-radius:9px;padding:6px 10px;font-weight:800;font-size:11.5px;";
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

    var out = document.createElement("button");
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
    btn.textContent = isG ? "👑" : "⚙️";
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

  /* ---------- Point 8 : Boîte permettant à l'élève d'écrire une question au professeur ---------- */
  function ouvrirBoiteQuestionProf(uid, maClasse) {
    var ex = document.getElementById("sti-modal-qprof");
    if (ex) ex.remove();
    var fond = document.createElement("div");
    fond.id = "sti-modal-qprof";
    fond.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(35,32,26,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:600 13.5px/1.45 system-ui,'Segoe UI',sans-serif;";
    fond.innerHTML =
      "<div style='background:#fffdf7;color:#23201a;border:2.5px solid #23201a;border-radius:18px;padding:20px;max-width:410px;width:100%;box-shadow:6px 6px 0 #f4511e'>" +
      "<h3 style='font-size:16px;font-weight:900;color:#f4511e;margin-bottom:6px'>💬 Envoyer un message à M. Essouyah</h3>" +
      "<p style='font-size:12.5px;color:#5a5244;margin-bottom:10px'>Posez votre question sur le cours ou un exercice :</p>" +
      "<textarea id='sti-txt-qprof' style='width:100%;min-height:85px;border:2px solid #23201a;border-radius:10px;padding:9px;font:inherit;background:#fff;color:#23201a;margin-bottom:12px' placeholder='Bonjour Monsieur, j&#39;ai une question sur…'></textarea>" +
      "<div style='display:flex;justify-content:flex-end;gap:8px'>" +
      "<button type='button' id='sti-qprof-ann' style='border:2px solid #23201a;background:#fff;color:#23201a;border-radius:999px;padding:7px 14px;font-weight:800;cursor:pointer'>Annuler</button>" +
      "<button type='button' id='sti-qprof-env' style='border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border-radius:999px;padding:7px 16px;font-weight:900;cursor:pointer;box-shadow:2px 2px 0 #23201a'>📨 Envoyer</button>" +
      "</div></div>";
    document.body.appendChild(fond);
    fond.querySelector("#sti-qprof-ann").addEventListener("click", function () { fond.remove(); });
    fond.querySelector("#sti-qprof-env").addEventListener("click", function () {
      var txt = fond.querySelector("#sti-txt-qprof").value.trim();
      if (!txt) return;
      var tsNow = new Date().toISOString();
      var info = JSON.stringify({ classe: maClasse || "*", reponse: txt, page: chemin });
      var ligneMsg = {
        user_id: uid,
        page: "MSG_LU:libre",
        lieu: info,
        fin: tsNow,
        duree_sec: 0
      };
      if (!navigator.onLine) {
        empilerHorsLigne(ligneMsg);
        fond.remove();
        return;
      }
      sb.from("acces").insert(ligneMsg).then(function (r) {
        if (r && r.error) empilerHorsLigne(ligneMsg);
      }).catch(function () {
        empilerHorsLigne(ligneMsg);
      });
      try {
        sb.channel("sti-diffusion").send({
          type: "broadcast",
          event: "lu",
          payload: { msgId: "libre", uid: uid, ts: tsNow, reponse: txt }
        });
      } catch (e) {}
      fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
        method: "POST",
        body: JSON.stringify({ type: "lu", msgId: "libre", uid: uid, ts: tsNow, reponse: txt })
      }).catch(function () {});
      fond.remove();
    });
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

    function afficherAnnonce(a) {
      if (!a || !a.id || !a.texte) return;
      if (a.classe !== "*" && a.classe !== maClasse) return;
      try { if (localStorage.getItem("sti-msg-lu-" + a.id) === "1") return; } catch (e) {}
      if (document.getElementById("sti-annonce-" + a.id)) return;

      var boite = document.createElement("div");
      boite.id = "sti-annonce-" + a.id;
      boite.style.cssText = "position:fixed;left:50%;top:22px;transform:translateX(-50%);z-index:2147483647;max-width:440px;width:calc(100vw - 28px);background:#fffdf7;color:#23201a;color-scheme:light;border:2.5px solid #23201a;border-radius:18px;padding:18px 20px;box-shadow:6px 6px 0 #f4511e,0 16px 36px rgba(0,0,0,.22);font:600 13.5px/1.5 system-ui,'Segoe UI',sans-serif;";
      var libCl = a.classe === "*" ? "Toutes les classes" : a.classe;
      boite.innerHTML =
        "<div style='font-weight:900;font-size:15px;color:#f4511e;margin-bottom:6px'>📢 Message de M. Essouyah · " + esc(libCl) + "</div>" +
        "<div style='white-space:pre-wrap;color:#23201a;margin-bottom:10px'>" + esc(a.texte) + "</div>" +
        "<input type='text' id='sti-rep-" + a.id + "' placeholder='💬 Votre réponse au professeur (facultatif)…' style='width:100%;border:1.5px solid #23201a;border-radius:9px;padding:7px 10px;font-size:12.5px;margin-bottom:10px;background:#fff;color:#23201a' />" +
        "<div style='text-align:right'><button type='button' style='border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border-radius:999px;padding:7px 18px;font-weight:900;font-size:12.5px;cursor:pointer;box-shadow:2px 2px 0 #23201a'>✅ J'ai lu / Répondre</button></div>";
      boite.querySelector("button").addEventListener("click", function () {
        var inpRep = document.getElementById("sti-rep-" + a.id);
        var texteRep = inpRep ? inpRep.value.trim() : "";
        try { localStorage.setItem("sti-msg-lu-" + a.id, "1"); } catch (e) {}
        boite.remove();
        var tsNow = new Date().toISOString();
        var lieuVal = texteRep ? JSON.stringify({ classe: a.classe || "*", reponse: texteRep }) : (a.classe || "*");
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
          sb.channel("sti-diffusion").send({ type: "broadcast", event: "lu", payload: { msgId: a.id, uid: uid, ts: tsNow, reponse: texteRep } });
        } catch (e) {}
        fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
          method: "POST",
          body: JSON.stringify({ type: "lu", msgId: a.id, uid: uid, ts: tsNow, reponse: texteRep })
        }).catch(function () {});
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
                } else if (a && a.id && a.texte && !a.type && (a.classe === "*" || a.classe === maClasse)) {
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

  /* ---------- badge ADMIN visible sur tout le site (droite, milieu) + bouton Imprimer Gold + compteur de demandes ---------- */
  function badgeAdmin() {
    var cont = document.createElement("div");
    cont.className = "sti-no-print";
    cont.style.cssText = "position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:2147483646;display:flex;flex-direction:column;align-items:flex-end;gap:8px;";

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
})();
