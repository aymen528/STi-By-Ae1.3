/* STI v2 — tableau de bord admin complet :
   - Indicateur 🟢 En ligne maintenant + compteur
   - Recherche instantanée + filtre par classe / état + validation groupée + export Excel (CSV)
   - Comptes 👑 Gold (capture & impression)
   - Durée d'accès par semaine et cumul
   - Résultats des Quiz & Atelier Bac Pratique (/20)
   - Contrôle / Test chronométré en direct
   - Diffusion messages par classe + dictée vocale + suivi Lu / Non lu + réponses des élèves */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
  var elMsg = document.getElementById("msg");
  function msg(t, c) { elMsg.textContent = t; elMsg.className = "msg" + (c ? " " + c : ""); }

  /* Affichage dynamique du numéro de version du tableau de bord & du cache PWA */
  (function afficherVersionAdmin() {
    var versionDefaut = "v43";
    try {
      var scripts = document.querySelectorAll('script[src*="admin.js"]');
      if (scripts.length) {
        var m = scripts[0].src.match(/[?&]v=(\d+)/);
        if (m && m[1]) versionDefaut = "v" + m[1];
      }
    } catch (e) {}
    var elBadgeVer = document.getElementById("badge-version-admin");
    var elSousVer = document.getElementById("sous-version-admin");
    var elPiedVer = document.getElementById("pied-version-admin");
    function majTexteVersion(v) {
      if (elBadgeVer) elBadgeVer.textContent = "🏷️ Version V2.0 · " + v;
      if (elSousVer) elSousVer.textContent = "Version V2.0 (" + v + ")";
      if (elPiedVer) elPiedVer.textContent = "🏷️ Version active : STI V2.0 (" + v + ")";
    }
    majTexteVersion(versionDefaut);
    if (window.caches && caches.keys) {
      caches.keys().then(function (cles) {
        var nums = [];
        (cles || []).forEach(function (k) {
          var m = String(k).match(/sti-atelier-v(\d+)/i);
          if (m && m[1]) nums.push(parseInt(m[1], 10));
        });
        if (nums.length) {
          nums.sort(function (a, b) { return b - a; });
          majTexteVersion("v" + nums[0]);
        }
      }).catch(function () {});
    }
    if (elBadgeVer) {
      elBadgeVer.addEventListener("click", function () {
        msg("🔄 Vérification de la dernière version (" + elBadgeVer.textContent + ")…", "ok");
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (r) { r.update(); });
          });
        }
        charge(false);
      });
    }
  })();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.update(); });
    });
  }

  var LIB = { actif: "Actif", en_attente: "En attente", suspendu: "Suspendu", exclu: "Exclu" };
  function estAdminEmail(em) {
    return (em || "").trim().toLowerCase() === (cfg.ADMIN || "").trim().toLowerCase();
  }
  function estGold(p) {
    return Boolean(p && (p.gold === true || /\|\s*GOLD$/i.test(p.lycee || "")));
  }
  function lyceePropre(p) {
    return ((p && p.lycee) || "—").replace(/\s*\|\s*GOLD$/i, "") || "—";
  }
  function telDeProfil(p) {
    if (p.phone) return p.phone;
    if (p.email && /@tel\.sti\.tn$/i.test(p.email)) {
      return "+" + p.email.replace(/@tel\.sti\.tn$/i, "");
    }
    return null;
  }
  function codeWa(tel) {
    var ch = String(tel || "").replace(/\D/g, "");
    var h = 216613;
    for (var i = 0; i < ch.length; i++) {
      h = ((h * 31) + ch.charCodeAt(i) * (i + 7)) % 900000;
    }
    return String(100000 + (h % 900000));
  }
  function nomPrenomTexte(p) {
    if (!p) return "";
    var n = (p.nom || "").trim();
    var pr = (p.prenom || "").trim();
    if (n && pr) return n.toUpperCase() + " " + pr;
    return n || pr || "";
  }
  function contact(p) {
    var tel = telDeProfil(p);
    var base = tel ? "📱 " + tel : (p.email || "—");
    var np = nomPrenomTexte(p);
    return np ? "👤 " + np + " (" + base + ")" : base;
  }

  var triParAcces = false;
  var profils = [], acces = [], counts = {};
  var dureesSemaine = {}, dureesTotales = {}, semainesDispo = [];
  var messagesDiffuses = [], lecturesParMsg = {}, reponsesParMsg = {}, questionsLibres = [];
  var scoresParUser = {}, listeResultatsQuiz = [];
  var enLigneMap = {}; /* uid -> { ts: ms, page: str } */
  var adminUid = null;
  var cibleSuppr = null, cibleMdp = null, cibleAff = null;

  /* ---------- Configuration dynamique des Lycées et des Classes ---------- */
  var cfgEcoles = {
    lycees: ["Lycée Rafèha"],
    classes: ["3eme SI1", "3eme SI2", "4eme SI1", "4eme SI2"],
    supprLycees: [],
    supprClasses: [],
    ts: 0
  };
  try {
    var cfgLocal = JSON.parse(localStorage.getItem("sti-cfg-ecoles") || "null");
    if (cfgLocal && Array.isArray(cfgLocal.lycees) && Array.isArray(cfgLocal.classes)) {
      cfgEcoles = Object.assign(cfgEcoles, cfgLocal);
    }
  } catch (e) {}

  function obtenirLyceesActifs() {
    var suppr = cfgEcoles.supprLycees || [];
    var liste = (cfgEcoles.lycees || []).filter(function (l) { return l && suppr.indexOf(l) === -1; });
    if (!liste.length && suppr.indexOf("Lycée Rafèha") === -1) liste.push("Lycée Rafèha");
    profils.forEach(function (p) {
      var l = lyceePropre(p);
      if (l && l !== "—" && liste.indexOf(l) === -1 && suppr.indexOf(l) === -1) {
        liste.push(l);
      }
    });
    return liste;
  }

  function obtenirClassesActives() {
    var suppr = cfgEcoles.supprClasses || [];
    var liste = (cfgEcoles.classes || []).filter(function (c) { return c && suppr.indexOf(c) === -1; });
    if (!liste.length) {
      ["3eme SI1", "3eme SI2", "4eme SI1", "4eme SI2"].forEach(function (c) {
        if (suppr.indexOf(c) === -1) liste.push(c);
      });
    }
    profils.forEach(function (p) {
      var c = p.classe || "";
      if (c && c !== "—" && liste.indexOf(c) === -1 && suppr.indexOf(c) === -1) {
        liste.push(c);
      }
    });
    return liste;
  }

  function sauvegarderCfgEcoles() {
    cfgEcoles.ts = Date.now();
    try { localStorage.setItem("sti-cfg-ecoles", JSON.stringify(cfgEcoles)); } catch (e) {}
    var payload = {
      type: "cfg_ecoles",
      lycees: cfgEcoles.lycees,
      classes: cfgEcoles.classes,
      supprLycees: cfgEcoles.supprLycees || [],
      supprClasses: cfgEcoles.supprClasses || [],
      ts: cfgEcoles.ts
    };
    if (!navigator.onLine) {
      empilerActionAdmin({ type: "cfg_ecoles", payload: payload });
      majFiltreClasses();
      return;
    }
    try {
      sb.channel("sti-diffusion").send({ type: "broadcast", event: "cfg_ecoles", payload: payload });
    } catch (e) {}
    fetch("https://ntfy.sh/sti_v2_diffusion_9482", {
      method: "POST",
      body: JSON.stringify(payload)
    }).catch(function () {});
    if (adminUid && adminUid !== "admin") {
      sb.from("acces").insert({
        user_id: adminUid,
        page: "CFG_ECOLES",
        lieu: JSON.stringify(payload),
        duree_sec: 0
      }).then(function () {});
    }
    majFiltreClasses();
  }

  function estEnLigne(uid) {
    var info = enLigneMap[uid];
    return Boolean(info && (Date.now() - info.ts < 95000));
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDuree(sec) {
    if (sec == null) return "en cours…";
    if (sec < 60) return sec + " s";
    if (sec < 3600) return Math.round(sec / 60) + " min";
    return Math.floor(sec / 3600) + " h " + Math.round((sec % 3600) / 60) + " min";
  }
  function fmtDureeCumul(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    if (sec === 0) return "0 min";
    if (sec < 60) return sec + " s";
    var h = Math.floor(sec / 3600);
    var m = Math.round((sec % 3600) / 60);
    if (h === 0) return m + " min";
    return h + " h " + (m < 10 ? "0" + m : m) + " min";
  }
  function dureeLigne(a) {
    if (a.duree_sec != null && a.duree_sec > 0) return Number(a.duree_sec);
    if (a.debut && a.fin) {
      var diff = Math.round((new Date(a.fin) - new Date(a.debut)) / 1000);
      return diff > 0 ? diff : 0;
    }
    return 0;
  }
  function cleSemaine(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var jour = d.getDay();
    var decal = jour === 0 ? -6 : 1 - jour;
    var lun = new Date(d.getFullYear(), d.getMonth(), d.getDate() + decal);
    var y = lun.getFullYear();
    var m = ("0" + (lun.getMonth() + 1)).slice(-2);
    var j = ("0" + lun.getDate()).slice(-2);
    return y + "-" + m + "-" + j;
  }
  function libelleSemaine(cle) {
    var p = String(cle || "").split("-");
    if (p.length !== 3) return cle;
    var lun = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    var dim = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6);
    var fmt = function (dt) {
      return ("0" + dt.getDate()).slice(-2) + "/" + ("0" + (dt.getMonth() + 1)).slice(-2);
    };
    var act = cle === cleSemaine(new Date().toISOString()) ? " (cette semaine)" : "";
    return "Sem. du " + fmt(lun) + " au " + fmt(dim) + act;
  }

  sb.auth.getSession().then(function (r) {
    var s = r && r.data ? r.data.session : null;
    if (!s || !estAdminEmail(s.user.email)) {
      var cacheSess = null;
      try { cacheSess = JSON.parse(localStorage.getItem("sti-session-cache") || "null"); } catch (e) {}
      var estAdminOff = !navigator.onLine && cacheSess && cacheSess.isAdmin && estAdminEmail(cacheSess.email);
      if (!estAdminOff) {
        try {
          localStorage.removeItem("sti-admin-gold");
          localStorage.removeItem("sti-session-cache");
        } catch (e) {}
        location.replace(cfg.RACINE + "portail.html#admin");
        return;
      }
      adminUid = (cacheSess && cacheSess.id) || "admin";
    } else {
      adminUid = s.user.id;
      try {
        localStorage.setItem("sti-offline", String(Date.now()));
        localStorage.setItem("sti-session-cache", JSON.stringify({
          id: s.user.id,
          email: s.user.email,
          statut: "actif",
          gold: true,
          isAdmin: true,
          ts: Date.now()
        }));
      } catch (e) {}
    }
    /* Session administrateur authentifiée : déverrouiller l'affichage du tableau de bord */
    document.documentElement.classList.remove("admin-verrouille");
    try {
      localStorage.setItem("sti-gold", "1");
      localStorage.setItem("sti-admin-gold", "1");
    } catch (e) {}
    window.__STI_GOLD = true;
    charge(false);
    setInterval(function () { if (navigator.onLine) charge(true); }, 15000);
    window.addEventListener("online", function () { charge(false); });
    try {
      sb.channel("admin-demandes")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, function () { charge(true); })
        .on("postgres_changes", { event: "*", schema: "public", table: "acces" }, function () { charge(true); })
        .subscribe();
      sb.channel("sti-diffusion")
        .on("broadcast", { event: "lu" }, function (p) {
          if (p && p.payload && p.payload.msgId && p.payload.uid) {
            var mid = p.payload.msgId;
            if (mid === "libre") {
              questionsLibres.unshift({ uid: p.payload.uid, ts: p.payload.ts || new Date().toISOString(), reponse: p.payload.reponse || "" });
            } else {
              if (!lecturesParMsg[mid]) lecturesParMsg[mid] = {};
              lecturesParMsg[mid][p.payload.uid] = p.payload.ts || new Date().toISOString();
              if (p.payload.reponse) {
                if (!reponsesParMsg[mid]) reponsesParMsg[mid] = {};
                reponsesParMsg[mid][p.payload.uid] = p.payload.reponse;
              }
            }
            afficherTableauSuivi();
          }
        })
        .on("broadcast", { event: "presence" }, function (p) {
          if (p && p.payload && p.payload.uid) {
            enLigneMap[p.payload.uid] = { ts: Date.now(), page: p.payload.page || "site" };
            majCompteurEnLigne();
            rendAbonnes();
          }
        })
        .on("broadcast", { event: "quiz" }, function () {
          charge(true);
        })
        .subscribe();
    } catch (e) {}
    majBoutonNotif();
  });

  function bipNotif() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [587.33, 880].forEach(function (freq, idx) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.16);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + idx * 0.16);
        o.stop(ctx.currentTime + idx * 0.16 + 0.26);
      });
    } catch (e) {}
  }

  function afficherNotifSysteme(titre, corps) {
    bipNotif();
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg && reg.showNotification) {
            reg.showNotification(titre, { body: corps, icon: "assets/icons/sti-icon-192.png" });
          } else {
            new Notification(titre, { body: corps, icon: "assets/icons/sti-icon-192.png" });
          }
        }).catch(function () {
          new Notification(titre, { body: corps });
        });
      } else {
        new Notification(titre, { body: corps });
      }
    } catch (e) {}
  }

  function majBoutonNotif() {
    var b = document.getElementById("btn-notif");
    if (!b) return;
    var ok = ("Notification" in window) && Notification.permission === "granted";
    b.innerHTML = ok
      ? '🔔 <span class="lbl-pc">Notifications (actives)</span><span class="lbl-mob">Alertes ✔</span>'
      : '🔔 <span class="lbl-pc">Notifications</span><span class="lbl-mob">Alertes</span>';
    b.classList.toggle("on", ok);
  }

  var modalNotif = document.getElementById("modal-notif");
  document.getElementById("btn-notif").addEventListener("click", function () {
    modalNotif.classList.add("visible");
  });
  document.getElementById("btn-fermer-notif").addEventListener("click", function () {
    modalNotif.classList.remove("visible");
  });
  document.getElementById("btn-tester-notif").addEventListener("click", function () {
    function lancerTest() {
      majBoutonNotif();
      afficherNotifSysteme(
        "🔔 Notifications STI V2.0 activées",
        "Vous recevrez une alerte sonore et visuelle à chaque nouvelle demande d'inscription."
      );
      msg("🔔 Notifications activées et test envoyé !", "ok");
      modalNotif.classList.remove("visible");
    }
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(function () { lancerTest(); });
    } else {
      lancerTest();
    }
  });

  function verifierNouvellesDemandes() {
    var enAtt = profils.filter(function (p) { return p.statut === "en_attente"; });
    var bAl = document.getElementById("alerte-attente");
    var tAl = document.getElementById("alerte-attente-txt");
    if (bAl && tAl) {
      if (enAtt.length > 0) {
        bAl.classList.add("visible");
        tAl.textContent = "🔔 " + enAtt.length + " demande(s) d'inscription en attente de validation : " +
          enAtt.map(function (p) { return contact(p); }).join(" · ");
        document.title = "(" + enAtt.length + ") Tableau de bord — STI V2.0";
      } else {
        bAl.classList.remove("visible");
        document.title = "Tableau de bord — STI V2.0";
      }
    }
    var vus = {};
    try { vus = JSON.parse(localStorage.getItem("sti-admin-vus") || "{}"); } catch (e) {}
    var nouveaux = [];
    enAtt.forEach(function (p) {
      if (!vus[p.id]) {
        vus[p.id] = 1;
        nouveaux.push(p);
      }
    });
    try { localStorage.setItem("sti-admin-vus", JSON.stringify(vus)); } catch (e) {}
    nouveaux.forEach(function (p) {
      var tel = telDeProfil(p);
      var detail = contact(p) + " — " + lyceePropre(p) + " · " + (p.classe || "—");
      if (tel) detail += "\nCode WhatsApp : " + codeWa(tel);
      afficherNotifSysteme("🆕 Nouvelle demande d'inscription STI V2.0", detail);
    });
  }

  document.getElementById("btn-logout").addEventListener("click", function () {
    try {
      localStorage.removeItem("sti-gold");
      localStorage.removeItem("sti-admin-gold");
      localStorage.removeItem("sti-offline");
      localStorage.removeItem("sti-session-cache");
      localStorage.removeItem("sti-cred");
    } catch (e) {}
    sb.auth.signOut().catch(function () {}).then(function () { location.replace(cfg.RACINE + "portail.html#deconnecte"); });
  });
  document.getElementById("btn-refresh").addEventListener("click", function () { charge(false); });
  document.getElementById("btn-stats").addEventListener("click", function () {
    triParAcces = !triParAcces;
    this.classList.toggle("on", triParAcces);
    document.getElementById("note-tri").textContent = triParAcces ? "(triés par durée / accès ↓)" : "";
    rendAbonnes();
  });
  document.getElementById("btn-fermer-detail").addEventListener("click", function () {
    document.getElementById("zone-detail").classList.remove("visible");
  });

  function majCompteurEnLigne() {
    var nb = profils.filter(function (p) { return estEnLigne(p.id); }).length;
    var el = document.getElementById("s-enligne");
    if (el) el.textContent = nb;
  }

  function chargerDepuisCacheAdmin(garderMsg, raison) {
    try {
      var c = JSON.parse(localStorage.getItem("sti-admin-cache") || "null");
      if (c && Array.isArray(c.tous)) {
        appliquerDonneesAdmin(c.tous, c.tousAcces || [], c.txtNtfy || "", true, c.ts);
        return true;
      }
    } catch (e) {}
    if (!garderMsg) msg("❌ " + (raison || "Impossible de joindre le serveur hors-ligne."), "err");
    return false;
  }

  function appliquerDonneesAdmin(tous, tousAcces, txtNtfy, estHorsLigne, tsCache) {
    var adminIds = {};
    tous.forEach(function (p) { if (estAdminEmail(p.email)) adminIds[p.id] = true; });
    profils = tous.filter(function (p) { return !estAdminEmail(p.email); });

    var mapMsg = {};
    lecturesParMsg = {};
    reponsesParMsg = {};
    questionsLibres = [];
    scoresParUser = {};
    listeResultatsQuiz = [];

    tousAcces.forEach(function (a) {
        var pg = a.page || "";
        if (pg.indexOf("MSG_ENVOI:") === 0) {
          try {
            var m = JSON.parse(a.lieu || "{}");
            if (m && m.id) mapMsg[m.id] = m;
          } catch (e) {}
        } else if (pg.indexOf("MSG_LU:") === 0) {
          var mid = pg.slice(7);
          var repTxt = "";
          try {
            var objL = JSON.parse(a.lieu || "{}");
            if (objL && objL.reponse) repTxt = objL.reponse;
          } catch (e) {}
          if (mid === "libre") {
            if (repTxt) questionsLibres.push({ uid: a.user_id, ts: a.debut, reponse: repTxt });
          } else {
            if (!lecturesParMsg[mid]) lecturesParMsg[mid] = {};
            if (!lecturesParMsg[mid][a.user_id]) lecturesParMsg[mid][a.user_id] = a.debut;
            if (repTxt) {
              if (!reponsesParMsg[mid]) reponsesParMsg[mid] = {};
              if (!reponsesParMsg[mid][a.user_id]) reponsesParMsg[mid][a.user_id] = repTxt;
            }
          }
        } else if (pg === "CFG_ECOLES") {
          try {
            var ce = JSON.parse(a.lieu || "{}");
            if (ce && Array.isArray(ce.lycees) && Array.isArray(ce.classes) && Number(ce.ts || 0) > Number(cfgEcoles.ts || 0)) {
              cfgEcoles = Object.assign(cfgEcoles, ce);
              localStorage.setItem("sti-cfg-ecoles", JSON.stringify(cfgEcoles));
            }
          } catch (e) {}
        } else if (pg.indexOf("QUIZ:") === 0) {
          var nomQ = pg.slice(5);
          var infoQ = { quiz: nomQ, note: (a.duree_sec || 0) + "/20", ts: a.debut };
          try {
            var parsedQ = JSON.parse(a.lieu || "{}");
            if (parsedQ && parsedQ.note) infoQ = parsedQ;
          } catch (e) {}
          if (!scoresParUser[a.user_id]) scoresParUser[a.user_id] = {};
          if (!scoresParUser[a.user_id][nomQ]) scoresParUser[a.user_id][nomQ] = infoQ.note;
          listeResultatsQuiz.push({
            uid: a.user_id,
            quiz: infoQ.quiz || nomQ,
            note: infoQ.note || "—",
            ts: infoQ.ts || a.debut
          });
        }
      });

      if (txtNtfy) {
        txtNtfy.trim().split("\n").forEach(function (ln) {
          if (!ln) return;
          try {
            var ev = JSON.parse(ln);
            if (!ev || !ev.message) return;
            var obj = JSON.parse(ev.message);
            if (obj && obj.type === "cfg_ecoles" && Array.isArray(obj.lycees) && Array.isArray(obj.classes)) {
              if (Number(obj.ts || 0) > Number(cfgEcoles.ts || 0)) {
                cfgEcoles = Object.assign(cfgEcoles, obj);
                localStorage.setItem("sti-cfg-ecoles", JSON.stringify(cfgEcoles));
              }
            } else if (obj && obj.id && obj.texte && !obj.type) {
              if (!mapMsg[obj.id]) mapMsg[obj.id] = obj;
            } else if (obj && obj.type === "lu" && obj.msgId && obj.uid) {
              if (obj.msgId === "libre") {
                if (obj.reponse && !questionsLibres.some(function (q) { return q.uid === obj.uid && q.reponse === obj.reponse; })) {
                  questionsLibres.push({ uid: obj.uid, ts: obj.ts || new Date(ev.time * 1000).toISOString(), reponse: obj.reponse });
                }
              } else {
                if (!lecturesParMsg[obj.msgId]) lecturesParMsg[obj.msgId] = {};
                if (!lecturesParMsg[obj.msgId][obj.uid]) {
                  lecturesParMsg[obj.msgId][obj.uid] = obj.ts || new Date(ev.time * 1000).toISOString();
                }
                if (obj.reponse) {
                  if (!reponsesParMsg[obj.msgId]) reponsesParMsg[obj.msgId] = {};
                  reponsesParMsg[obj.msgId][obj.uid] = obj.reponse;
                }
              }
            }
          } catch (e) {}
        });
      }

      messagesDiffuses = Object.keys(mapMsg).map(function (k) { return mapMsg[k]; }).sort(function (a, b) {
        return String(b.ts || "").localeCompare(String(a.ts || ""));
      });

      acces = tousAcces.filter(function (a) {
        var pg = a.page || "";
        return !adminIds[a.user_id] &&
          pg !== "CFG_ECOLES" &&
          pg.indexOf("MSG_ENVOI:") !== 0 &&
          pg.indexOf("MSG_LU:") !== 0 &&
          pg.indexOf("QUIZ:") !== 0 &&
          pg.indexOf("CTRL_") !== 0;
      });
      counts = {};
      dureesSemaine = {};
      dureesTotales = {};
      var mapSem = {};
      var semCourante = cleSemaine(new Date().toISOString());
      mapSem[semCourante] = true;

      acces.forEach(function (a) {
        counts[a.user_id] = (counts[a.user_id] || 0) + 1;
        var sec = dureeLigne(a);
        dureesTotales[a.user_id] = (dureesTotales[a.user_id] || 0) + sec;
        var sk = cleSemaine(a.debut);
        mapSem[sk] = true;
        if (!dureesSemaine[sk]) dureesSemaine[sk] = {};
        dureesSemaine[sk][a.user_id] = (dureesSemaine[sk][a.user_id] || 0) + sec;

        /* Détection présence en ligne via dernière activité (< 95 s) */
        var tAct = new Date(a.fin || a.debut).getTime();
        if (!isNaN(tAct) && (!enLigneMap[a.user_id] || tAct > enLigneMap[a.user_id].ts)) {
          enLigneMap[a.user_id] = { ts: tAct, page: a.page || "index.html" };
        }
      });

      semainesDispo = Object.keys(mapSem).sort().reverse();
      majSelectSemaine();
      majFiltreClasses();
      majCompteurEnLigne();

      document.getElementById("s-total").textContent = profils.length;
      document.getElementById("s-actifs").textContent = profils.filter(function (p) { return p.statut === "actif"; }).length;
      document.getElementById("s-attente").textContent = profils.filter(function (p) { return p.statut === "en_attente"; }).length;
      document.getElementById("s-connex").textContent = acces.length;
      rendAbonnes();
      rendQuiz();
      rendSuiviMessages();
      rendAcces();
      if (!estHorsLigne) verifierNouvellesDemandes();
      if (estHorsLigne) {
        var dtStr = tsCache ? new Date(tsCache).toLocaleString("fr-FR") : "récemment";
        msg("📴 Mode Hors-ligne — Consultation des dernières données synchronisées (" + dtStr + ") : " + profils.length + " abonné(s).", "ok");
      }
  }

  function charge(garderMsg) {
    if (!navigator.onLine) {
      chargerDepuisCacheAdmin(garderMsg, "Appareil hors-ligne (aucun cache enregistré).");
      return;
    }
    if (!garderMsg) msg("Chargement…", "");
    Promise.all([
      sb.from("profiles").select("*").order("cree_le", { ascending: false }),
      sb.from("acces").select("*").order("debut", { ascending: false }).limit(600),
      fetch("https://ntfy.sh/sti_v2_diffusion_9482/json?poll=1&since=all").then(function (r) { return r.text(); }).catch(function () { return ""; })
    ]).then(function (res) {
      if (res[0].error || res[1].error) {
        var errTxt = (res[0].error || res[1].error).message;
        if (!chargerDepuisCacheAdmin(garderMsg, errTxt)) {
          msg("❌ " + errTxt, "err");
        }
        return;
      }
      var tous = res[0].data || [];
      var tousAcces = res[1].data || [];
      var txtNtfy = res[2] || "";
      try {
        localStorage.setItem("sti-admin-cache", JSON.stringify({
          tous: tous,
          tousAcces: tousAcces,
          txtNtfy: txtNtfy,
          ts: Date.now()
        }));
      } catch (e) {}
      appliquerDonneesAdmin(tous, tousAcces, txtNtfy, false, Date.now());
      if (!garderMsg) msg("✅ " + profils.length + " abonné(s), " + acces.length + " connexion(s) journalisée(s).", "ok");
    }).catch(function () {
      chargerDepuisCacheAdmin(garderMsg, "Impossible de joindre le serveur.");
    });
  }

  /* ---------- Sélecteur de semaine & Filtres (Recherche, Classe, Statut, Tout activer, Export CSV) ---------- */
  var selSemaine = document.getElementById("sel-semaine");
  var inpRecherche = document.getElementById("filtre-recherche");
  var selFiltreLycee = document.getElementById("filtre-lycee");
  var selFiltreClasse = document.getElementById("filtre-classe");
  var selFiltreStatut = document.getElementById("filtre-statut");
  var btnActiverLot = document.getElementById("btn-activer-lot");
  var btnExportCsv = document.getElementById("btn-export-csv");

  if (selSemaine) selSemaine.addEventListener("change", rendAbonnes);
  if (inpRecherche) inpRecherche.addEventListener("input", rendAbonnes);
  if (selFiltreLycee) selFiltreLycee.addEventListener("change", rendAbonnes);
  if (selFiltreClasse) selFiltreClasse.addEventListener("change", rendAbonnes);
  if (selFiltreStatut) selFiltreStatut.addEventListener("change", rendAbonnes);

  /* Clic rapide sur les compteurs du haut pour filtrer directement la liste */
  document.querySelectorAll(".stat[data-filtre]").forEach(function (carte) {
    carte.addEventListener("click", function () {
      var f = carte.getAttribute("data-filtre");
      if (selFiltreStatut && f) {
        selFiltreStatut.value = f;
        rendAbonnes();
      }
    });
  });

  function majFiltreClasses() {
    if (selFiltreLycee) {
      var valLycee = selFiltreLycee.value;
      var lycees = obtenirLyceesActifs();
      selFiltreLycee.innerHTML = "<option value='*'>🏛️ Tous les lycées</option>";
      lycees.forEach(function (ly) {
        var optL = document.createElement("option");
        optL.value = ly;
        optL.textContent = ly;
        selFiltreLycee.appendChild(optL);
      });
      if (valLycee && (valLycee === "*" || lycees.indexOf(valLycee) !== -1)) {
        selFiltreLycee.value = valLycee;
      }
    }
    if (!selFiltreClasse) return;
    var valPrec = selFiltreClasse.value;
    var classes = obtenirClassesActives();
    selFiltreClasse.innerHTML = "<option value='*'>🏫 Toutes les classes</option>";
    classes.forEach(function (cl) {
      var opt = document.createElement("option");
      opt.value = cl;
      opt.textContent = cl;
      selFiltreClasse.appendChild(opt);
    });
    if (valPrec && (valPrec === "*" || classes.indexOf(valPrec) !== -1)) {
      selFiltreClasse.value = valPrec;
    }
  }

  function majSelectSemaine() {
    if (!selSemaine) return;
    var valPrec = selSemaine.value;
    selSemaine.innerHTML = "";
    semainesDispo.forEach(function (sk) {
      var opt = document.createElement("option");
      opt.value = sk;
      opt.textContent = libelleSemaine(sk);
      selSemaine.appendChild(opt);
    });
    var optTot = document.createElement("option");
    optTot.value = "*";
    optTot.textContent = "Toutes les semaines (cumul)";
    selSemaine.appendChild(optTot);
    if (valPrec && (valPrec === "*" || semainesDispo.indexOf(valPrec) !== -1)) {
      selSemaine.value = valPrec;
    }
  }

  function dureePourAbonne(uid) {
    var sk = selSemaine ? selSemaine.value : semainesDispo[0];
    if (sk === "*") return dureesTotales[uid] || 0;
    return (dureesSemaine[sk] && dureesSemaine[sk][uid]) || 0;
  }

  function obtenirListeFiltree() {
    var q = inpRecherche ? inpRecherche.value.trim().toLowerCase() : "";
    var ly = selFiltreLycee ? selFiltreLycee.value : "*";
    var cl = selFiltreClasse ? selFiltreClasse.value : "*";
    var st = selFiltreStatut ? selFiltreStatut.value : "*";

    return profils.filter(function (p) {
      if (ly !== "*" && lyceePropre(p) !== ly) return false;
      if (cl !== "*" && (p.classe || "—") !== cl) return false;
      if (st === "en_ligne" && !estEnLigne(p.id)) return false;
      else if (st === "gold" && !estGold(p)) return false;
      else if (st !== "*" && st !== "en_ligne" && st !== "gold" && p.statut !== st) return false;
      if (q) {
        var texte = [
          p.email || "",
          telDeProfil(p) || "",
          p.nom || "",
          p.prenom || "",
          lyceePropre(p),
          p.classe || ""
        ].join(" ").toLowerCase();
        if (texte.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  /* Point 4 : Validation groupée (« Tout activer ») */
  if (btnActiverLot) {
    btnActiverLot.addEventListener("click", function () {
      var cibles = obtenirListeFiltree().filter(function (p) { return p.statut === "en_attente"; });
      if (!cibles.length) {
        msg("ℹ️ Aucune demande en attente dans la sélection actuelle.", "ok");
        return;
      }
      var ids = cibles.map(function (p) { return p.id; });
      btnActiverLot.disabled = true;
      sb.from("profiles").update({ statut: "actif" }).in("id", ids).then(function (r) {
        btnActiverLot.disabled = false;
        if (r.error) { msg("❌ " + r.error.message, "err"); return; }
        cibles.forEach(function (p) { diffuserSignalStatut(p.id, "actif", estGold(p)); });
        msg("✅ " + cibles.length + " abonné(s) activé(s) en un clic !", "ok");
        charge(true);
      });
    });
  }

  /* Point 3 : Export Excel (CSV UTF-8 avec BOM) */
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", function () {
      var liste = obtenirListeFiltree();
      if (!liste.length) { msg("⚠️ Aucun abonné à exporter.", "err"); return; }
      var entetes = [
        "Nom",
        "Prenom",
        "Contact (Tel / Email)",
        "Lycee",
        "Classe",
        "Statut",
        "Compte Gold",
        "En ligne",
        "Nb Connexions",
        "Duree periode",
        "Duree cumulee",
        "Scores Quiz / Bac",
        "Inscrit le"
      ];
      var lignes = [entetes.join(";")];
      liste.forEach(function (p) {
        var tel = telDeProfil(p);
        var ctc = tel || p.email || "—";
        var scMap = scoresParUser[p.id] || {};
        var scTxt = Object.keys(scMap).map(function (k) { return k + ": " + scMap[k]; }).join(" | ") || "—";
        var cols = [
          (p.nom || "—").trim(),
          (p.prenom || "—").trim(),
          ctc,
          lyceePropre(p),
          p.classe || "—",
          LIB[p.statut] || p.statut,
          estGold(p) ? "OUI" : "NON",
          estEnLigne(p.id) ? "En ligne" : "Hors ligne",
          counts[p.id] || 0,
          fmtDureeCumul(dureePourAbonne(p.id)),
          fmtDureeCumul(dureesTotales[p.id] || 0),
          scTxt,
          fmtDate(p.cree_le)
        ].map(function (v) {
          return '"' + String(v).replace(/"/g, '""') + '"';
        });
        lignes.push(cols.join(";"));
      });
      var blob = new Blob(["\uFEFF" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      var clNom = (selFiltreClasse && selFiltreClasse.value !== "*") ? selFiltreClasse.value.replace(/\s+/g, "_") : "toutes_classes";
      a.href = url;
      a.download = "STI_V2_abonnes_" + clNom + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      msg("📥 Fichier Excel (CSV) téléchargé pour " + liste.length + " abonné(s).", "ok");
    });
  }

  function changerClasseDirecte(p, nvClasse) {
    if (!p || !nvClasse) return;
    if (nvClasse === "__autre") {
      ouvrirAffectation(p);
      return;
    }
    var patch = { classe: nvClasse };
    majCacheLocalProfil(p.id, patch);
    if (!navigator.onLine) {
      empilerActionAdmin({ type: "profile_update", uid: p.id, patch: patch, gold: estGold(p) });
      msg("📴 Hors-ligne : classe de " + contact(p) + " changée en « " + nvClasse + " ».", "ok");
      majFiltreClasses();
      rendAbonnes();
      return;
    }
    sb.from("profiles").update(patch).eq("id", p.id).then(function (r) {
      if (r && r.error) {
        empilerActionAdmin({ type: "profile_update", uid: p.id, patch: patch, gold: estGold(p) });
        msg("⚠️ Enregistré localement : " + contact(p) + " → " + nvClasse, "ok");
        return;
      }
      msg("✅ Classe de " + contact(p) + " changée en « " + nvClasse + " ».", "ok");
      charge(true);
    });
  }

  function rendAbonnes() {
    var liste = obtenirListeFiltree();
    var nbAttLot = liste.filter(function (p) { return p.statut === "en_attente"; }).length;
    if (btnActiverLot) {
      btnActiverLot.textContent = "✅ Tout activer (" + nbAttLot + ")";
    }

    if (triParAcces) {
      liste.sort(function (a, b) {
        var diffDur = dureePourAbonne(b.id) - dureePourAbonne(a.id);
        return diffDur !== 0 ? diffDur : (counts[b.id] || 0) - (counts[a.id] || 0);
      });
    }
    var tb = document.getElementById("tb-abonnes");
    tb.innerHTML = "";
    if (!liste.length) {
      var trVide = document.createElement("tr");
      var tdVide = document.createElement("td");
      tdVide.colSpan = 8;
      tdVide.style.cssText = "text-align:center;color:#7a6f5d;padding:18px;";
      tdVide.textContent = "Aucun abonné correspondant à ce filtre.";
      trVide.appendChild(tdVide);
      tb.appendChild(trVide);
      return;
    }
    var classesDispo = obtenirClassesActives();
    liste.forEach(function (p) {
      var tr = document.createElement("tr");
      var estLigneGold = estGold(p) && p.statut === "actif";
      tr.className = estLigneGold ? "row-gold" : ("row-" + (p.statut || "en_attente"));
      tr.title = "Cliquer pour voir toutes ses connexions et durées par semaine";
      tr.addEventListener("click", function () { detail(p); });

      /* Colonne 1 : Nom & Prénom + en ligne + scores quiz */
      var tdNom = document.createElement("td");
      tdNom.style.fontWeight = "800";
      var ligneIdentite = document.createElement("div");
      var npTxt = nomPrenomTexte(p);
      if (npTxt) {
        var spNom = document.createElement("span");
        spNom.textContent = "👤 " + npTxt;
        ligneIdentite.appendChild(spNom);
      } else {
        var spVide = document.createElement("span");
        spVide.style.cssText = "color:#7a6f5d;font-weight:700;font-size:12px;";
        spVide.textContent = "👤 Non renseigné";
        ligneIdentite.appendChild(spVide);
      }
      var btnEditNom = document.createElement("button");
      btnEditNom.type = "button";
      btnEditNom.className = "btn-edit-inline";
      btnEditNom.textContent = "✏️";
      btnEditNom.title = "Modifier le Nom, le Prénom, le Lycée ou la Classe";
      btnEditNom.addEventListener("click", function (e) {
        e.stopPropagation();
        ouvrirAffectation(p);
      });
      ligneIdentite.appendChild(btnEditNom);

      if (estEnLigne(p.id)) {
        var bOn = document.createElement("span");
        bOn.className = "badge-online";
        var pgOn = (enLigneMap[p.id] && enLigneMap[p.id].page) || "site";
        bOn.textContent = "🟢 En ligne (" + pgOn + ")";
        ligneIdentite.appendChild(bOn);
      }
      tdNom.appendChild(ligneIdentite);

      if (p.nom || p.prenom) {
        var detailNP = document.createElement("div");
        detailNP.style.cssText = "font-size:11px;color:#5a5244;font-weight:700;margin-top:2px;";
        detailNP.textContent = "Nom : " + (p.nom || "—") + " · Prénom : " + (p.prenom || "—");
        tdNom.appendChild(detailNP);
      }

      /* Affichage des badges de scores Quiz / Bac Pratique sous l'élève */
      var scMap = scoresParUser[p.id];
      if (scMap) {
        var divSc = document.createElement("div");
        Object.keys(scMap).forEach(function (k) {
          var bq = document.createElement("span");
          bq.className = "badge-quiz";
          bq.textContent = "🏆 " + k + " : " + scMap[k];
          divSc.appendChild(bq);
        });
        tdNom.appendChild(divSc);
      }

      /* Colonne 2 : Contact (e-mail / tél. + code WhatsApp) */
      var tel = telDeProfil(p);
      var tdContact = document.createElement("td");
      tdContact.style.fontWeight = "700";
      var ligneContact = document.createElement("div");
      ligneContact.textContent = tel ? "📱 " + tel : ("✉️ " + (p.email || "—"));
      tdContact.appendChild(ligneContact);
      if (tel) {
        var codeDiv = document.createElement("div");
        codeDiv.style.cssText = "font-weight:800;font-size:11px;color:#f4511e;margin-top:2px;";
        codeDiv.textContent = "🔢 Code WhatsApp : " + codeWa(tel);
        tdContact.appendChild(codeDiv);
      }

      /* Colonne 3 : Lycée & sélecteur direct de Classe */
      var tdL = document.createElement("td");
      tdL.style.color = "#5a5244";
      tdL.style.fontWeight = "700";
      var divLycee = document.createElement("div");
      divLycee.style.cssText = "font-size:11.5px;display:flex;align-items:center;gap:4px;";
      var spLyc = document.createElement("span");
      spLyc.textContent = "🏛️ " + lyceePropre(p);
      divLycee.appendChild(spLyc);
      var btnEditAff = document.createElement("button");
      btnEditAff.type = "button";
      btnEditAff.className = "btn-edit-inline";
      btnEditAff.textContent = "✏️";
      btnEditAff.title = "Modifier le lycée, la classe, le nom ou le prénom";
      btnEditAff.addEventListener("click", function (e) {
        e.stopPropagation();
        ouvrirAffectation(p);
      });
      divLycee.appendChild(btnEditAff);
      tdL.appendChild(divLycee);

      var selClLigne = document.createElement("select");
      selClLigne.className = "sel-classe-ligne";
      selClLigne.title = "Changer directement la classe de cet abonné";
      var clAct = p.classe || "—";
      var listeClPourLigne = classesDispo.slice();
      if (clAct && clAct !== "—" && listeClPourLigne.indexOf(clAct) === -1) {
        listeClPourLigne.unshift(clAct);
      }
      if (!clAct || clAct === "—") {
        var optVide = document.createElement("option");
        optVide.value = "";
        optVide.textContent = "🏫 Choisir une classe…";
        optVide.selected = true;
        selClLigne.appendChild(optVide);
      }
      listeClPourLigne.forEach(function (c) {
        var optC = document.createElement("option");
        optC.value = c;
        optC.textContent = "🏫 " + c;
        if (c === clAct) optC.selected = true;
        selClLigne.appendChild(optC);
      });
      var optAutreCl = document.createElement("option");
      optAutreCl.value = "__autre";
      optAutreCl.textContent = "➕ Autre classe / Lycée…";
      selClLigne.appendChild(optAutreCl);

      selClLigne.addEventListener("click", function (e) { e.stopPropagation(); });
      selClLigne.addEventListener("change", function (e) {
        e.stopPropagation();
        if (!selClLigne.value) return;
        changerClasseDirecte(p, selClLigne.value);
      });
      tdL.appendChild(selClLigne);

      var td2 = document.createElement("td");
      var nb = document.createElement("span"); nb.className = "nb"; nb.textContent = counts[p.id] || 0;
      td2.appendChild(nb);

      var tdDur = document.createElement("td");
      var secSem = dureePourAbonne(p.id);
      var secTot = dureesTotales[p.id] || 0;
      var bDur = document.createElement("span");
      bDur.style.cssText = "display:inline-block;background:" + (secSem > 0 ? "rgba(244,81,30,.15)" : "rgba(255,253,247,.8)") +
        ";color:" + (secSem > 0 ? "#d84315" : "#5a5244") +
        ";border-radius:999px;padding:4px 10px;font-weight:900;font-size:12px;";
      bDur.textContent = "⏱️ " + fmtDureeCumul(secSem);
      tdDur.appendChild(bDur);
      if (selSemaine && selSemaine.value !== "*" && secTot > 0) {
        var totSub = document.createElement("div");
        totSub.style.cssText = "font-size:10.5px;color:#5a5244;font-weight:700;margin-top:3px;";
        totSub.textContent = "Cumul : " + fmtDureeCumul(secTot);
        tdDur.appendChild(totSub);
      }

      var td3 = document.createElement("td");
      var st = document.createElement("span");
      var isG = estGold(p);
      if (p.statut === "actif" && isG) {
        st.className = "st gold";
        st.textContent = "👑 Gold";
        st.title = "Compte Gold : capture d'écran, impression et copie autorisées";
      } else {
        st.className = "st " + p.statut;
        st.textContent = LIB[p.statut] || p.statut;
      }
      td3.appendChild(st);

      var td4 = document.createElement("td"); td4.textContent = fmtDate(p.cree_le);

      function creerCelluleActions(cls) {
        var tdAct = document.createElement("td");
        tdAct.className = "cell-actions " + cls;
        function bouton(txt, fn, bCls, titre) {
          var b = document.createElement("button");
          b.type = "button"; b.className = "act" + (bCls ? " " + bCls : ""); b.textContent = txt;
          if (titre) b.title = titre;
          b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
          tdAct.appendChild(b);
        }
        bouton("✅", function () { changeStatut(p, "actif"); }, "", "Activer l'abonné");
        bouton(
          "👑",
          function () { basculerGold(p); },
          isG ? "gold-on" : "",
          isG
            ? "Compte Gold actif — cliquer pour retirer les droits de capture d'écran et d'impression"
            : "Passer en compte Gold (autoriser capture d'écran, impression et copie)"
        );
        bouton("🏫", function () { ouvrirAffectation(p); }, "", "Changer le lycée ou la classe de cet abonné");
        bouton("⏳", function () { changeStatut(p, "en_attente"); }, "", "Mettre en attente");
        bouton("⛔", function () { changeStatut(p, "exclu"); }, "", "Exclure l'abonné");
        if (tel) {
          bouton("💬", function () { envoyerCodeWhatsApp(p, tel); }, "", "Envoyer le code de confirmation par WhatsApp");
        }
        bouton("🔑", function () { nouveauMdp(p); }, "", "Définir un nouveau mot de passe");
        bouton("🔎", function () { detail(p); }, "", "Voir l'historique des connexions");
        bouton("🗑️", function () { supprimer(p); }, "del", "Supprimer définitivement");
        return tdAct;
      }

      var tdActMob = creerCelluleActions("only-mob");
      var td5 = creerCelluleActions("only-pc");

      tr.append(tdNom, tdContact, tdL, tdActMob, td2, tdDur, td3, td4, td5);
      tb.appendChild(tr);
    });
  }

  function envoyerCodeWhatsApp(p, tel) {
    var ch = tel.replace(/\D/g, "");
    var np = ((p.prenom || "") + " " + (p.nom || "")).trim();
    var code = codeWa(tel);
    var texte = "Bonjour" + (np ? " " + np : "") +
      ", voici votre code de confirmation pour la plateforme STI V2.0 : *" + code + "*";
    window.open("https://wa.me/" + ch + "?text=" + encodeURIComponent(texte), "_blank", "noopener");
  }

  /* ---------- Point 5 : Tableau des résultats Quiz & Atelier Bac Pratique ---------- */
  function rendQuiz() {
    var tb = document.getElementById("tb-quiz");
    if (!tb) return;
    tb.innerHTML = "";
    var mapProf = {};
    profils.forEach(function (p) { mapProf[p.id] = p; });
    if (!listeResultatsQuiz.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 5;
      td0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      td0.textContent = "Aucun score de quiz ou d'atelier Bac Pratique enregistré pour le moment.";
      tr0.appendChild(td0);
      tb.appendChild(tr0);
      return;
    }
    listeResultatsQuiz.slice(0, 40).forEach(function (q) {
      var p = mapProf[q.uid];
      var tr = document.createElement("tr");
      var nomEl = p ? contact(p) : q.uid;
      var clEl = p ? (lyceePropre(p) + " · " + (p.classe || "—")) : "—";
      [nomEl, clEl, "🏆 " + q.quiz, q.note, fmtDate(q.ts)].forEach(function (v, idx) {
        var td = document.createElement("td");
        if (idx === 0 || idx === 3) td.style.fontWeight = "800";
        if (idx === 3) td.style.color = "#177245";
        td.textContent = v;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  function rendAcces() {
    var emails = {};
    profils.forEach(function (p) { emails[p.id] = contact(p); });
    var ta = document.getElementById("tb-acces");
    ta.innerHTML = "";
    acces.slice(0, 50).forEach(function (a) {
      var tr = document.createElement("tr");
      [emails[a.user_id] || a.user_id, fmtDate(a.debut), fmtDuree(dureeLigne(a)), a.lieu || "—", a.page || "—"].forEach(function (v) {
        var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
      });
      ta.appendChild(tr);
    });
  }

  /* ---------- Point 8 : Tableau de suivi de lecture des messages + réponses & questions libres des élèves ---------- */
  var selSuiviMsg = document.getElementById("sel-suivi-msg");
  if (selSuiviMsg) {
    selSuiviMsg.addEventListener("change", afficherTableauSuivi);
  }

  function rendSuiviMessages() {
    if (!selSuiviMsg) return;
    var valPrec = selSuiviMsg.value;
    selSuiviMsg.innerHTML = "";

    messagesDiffuses.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m.id;
      var libCl = m.classe === "*" ? "Toutes les classes" : m.classe;
      var court = (m.texte || "").replace(/\s+/g, " ").slice(0, 42);
      opt.textContent = "[" + libCl + " · " + fmtDate(m.ts) + "] " + court + ((m.texte || "").length > 42 ? "…" : "");
      selSuiviMsg.appendChild(opt);
    });

    var optLibre = document.createElement("option");
    optLibre.value = "__libre";
    optLibre.textContent = "💬 Questions spontanées des élèves (" + questionsLibres.length + ")";
    selSuiviMsg.appendChild(optLibre);

    if (valPrec && (valPrec === "__libre" || messagesDiffuses.some(function (m) { return m.id === valPrec; }))) {
      selSuiviMsg.value = valPrec;
    } else if (!messagesDiffuses.length && questionsLibres.length) {
      selSuiviMsg.value = "__libre";
    }
    afficherTableauSuivi();
  }

  function afficherTableauSuivi() {
    var tb = document.getElementById("tb-suivi-msg");
    var resEl = document.getElementById("resume-suivi-msg");
    var apEl = document.getElementById("apercu-suivi-msg");
    if (!tb) return;
    tb.innerHTML = "";
    var mid = selSuiviMsg ? selSuiviMsg.value : "";

    if (mid === "__libre") {
      if (resEl) resEl.textContent = "(" + questionsLibres.length + " question(s) reçue(s))";
      if (apEl) {
        apEl.style.display = "block";
        apEl.textContent = "💬 Questions envoyées par les élèves depuis le bouton « 💬 Écrire au professeur »";
      }
      var mapP = {};
      profils.forEach(function (p) { mapP[p.id] = p; });
      if (!questionsLibres.length) {
        var trQ0 = document.createElement("tr");
        var tdQ0 = document.createElement("td");
        tdQ0.colSpan = 5;
        tdQ0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
        tdQ0.textContent = "Aucune question spontanée reçue pour le moment.";
        trQ0.appendChild(tdQ0);
        tb.appendChild(trQ0);
        return;
      }
      questionsLibres.forEach(function (q) {
        var p = mapP[q.uid];
        var tr = document.createElement("tr");
        var tdNom = document.createElement("td"); tdNom.style.fontWeight = "700"; tdNom.textContent = p ? contact(p) : q.uid;
        var tdCl = document.createElement("td"); tdCl.style.color = "#7a6f5d"; tdCl.textContent = p ? (lyceePropre(p) + " · " + (p.classe || "—")) : "—";
        var tdEt = document.createElement("td");
        var b = document.createElement("span"); b.className = "st actif"; b.textContent = "💬 Question"; tdEt.appendChild(b);
        var tdRep = document.createElement("td"); tdRep.style.fontWeight = "800"; tdRep.style.color = "#23201a"; tdRep.textContent = q.reponse || "—";
        var tdDt = document.createElement("td"); tdDt.textContent = fmtDate(q.ts);
        tr.append(tdNom, tdCl, tdEt, tdRep, tdDt);
        tb.appendChild(tr);
      });
      return;
    }

    var msgObj = null;
    messagesDiffuses.forEach(function (m) { if (m.id === mid) msgObj = m; });
    if (!msgObj) {
      if (resEl) resEl.textContent = "";
      if (apEl) apEl.style.display = "none";
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 5;
      td0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      td0.textContent = "Diffusez un message via « 📢 Message par classe » pour suivre ici qui l'a lu ou y a répondu.";
      tr0.appendChild(td0);
      tb.appendChild(tr0);
      return;
    }

    if (apEl) {
      apEl.style.display = "block";
      apEl.textContent = "💬 Message : « " + msgObj.texte + " »";
    }

    var cibles = abonnesDeClasse(msgObj.classe);
    var mapLu = lecturesParMsg[msgObj.id] || {};
    var mapRep = reponsesParMsg[msgObj.id] || {};
    var nbLu = 0, nbNonLu = 0;

    if (!cibles.length) {
      var trV = document.createElement("tr");
      var tdV = document.createElement("td");
      tdV.colSpan = 5;
      tdV.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      tdV.textContent = "Aucun abonné inscrit dans cette classe.";
      trV.appendChild(tdV);
      tb.appendChild(trV);
    }

    cibles.forEach(function (p) {
      var dateLu = mapLu[p.id];
      var repEleve = mapRep[p.id] || "";
      if (dateLu) nbLu++; else nbNonLu++;

      var tr = document.createElement("tr");
      var tdNom = document.createElement("td");
      tdNom.style.fontWeight = "700";
      tdNom.textContent = contact(p);

      var tdCl = document.createElement("td");
      tdCl.style.color = "#7a6f5d";
      tdCl.textContent = lyceePropre(p) + " · " + (p.classe || "—");

      var tdEtat = document.createElement("td");
      var badge = document.createElement("span");
      badge.className = "st " + (dateLu ? "actif" : "en_attente");
      badge.textContent = dateLu ? "✅ Lu" : "⏳ Non lu (en attente)";
      tdEtat.appendChild(badge);

      var tdRep = document.createElement("td");
      tdRep.textContent = repEleve ? "💬 " + repEleve : "—";
      tdRep.style.fontWeight = repEleve ? "800" : "400";
      tdRep.style.color = repEleve ? "#23201a" : "#7a6f5d";

      var tdDate = document.createElement("td");
      tdDate.textContent = dateLu ? fmtDate(dateLu) : "En attente de réponse…";
      tdDate.style.color = dateLu ? "#177245" : "#b47d09";
      tdDate.style.fontWeight = "700";

      tr.append(tdNom, tdCl, tdEtat, tdRep, tdDate);
      tb.appendChild(tr);
    });

    if (resEl) {
      resEl.textContent = "(✅ " + nbLu + " lu · ⏳ " + nbNonLu + " non lu)";
    }
  }

  function detail(p) {
    document.getElementById("detail-email").textContent = contact(p);
    var zoneSem = document.getElementById("detail-semaines");
    var td = document.getElementById("tb-detail");
    if (zoneSem) zoneSem.innerHTML = "";
    td.innerHTML = "";
    var lignes = acces.filter(function (a) { return a.user_id === p.id; });
    if (zoneSem && lignes.length) {
      var parSem = {};
      lignes.forEach(function (a) {
        var sk = cleSemaine(a.debut);
        if (!parSem[sk]) parSem[sk] = { sec: 0, nb: 0 };
        parSem[sk].sec += dureeLigne(a);
        parSem[sk].nb += 1;
      });
      Object.keys(parSem).sort().reverse().forEach(function (sk) {
        var carte = document.createElement("div");
        carte.style.cssText = "background:#fffdf7;border:2px solid #23201a;border-radius:12px;padding:7px 13px;font-size:12px;font-weight:800;box-shadow:2px 2px 0 rgba(244,81,30,.45);";
        carte.innerHTML = "<span style='color:#7a6f5d'>" + libelleSemaine(sk) + " :</span> " +
          "<b style='color:#f4511e;font-size:13px'>⏱️ " + fmtDureeCumul(parSem[sk].sec) + "</b> " +
          "<span style='color:#7a6f5d'>(" + parSem[sk].nb + " accès)</span>";
        zoneSem.appendChild(carte);
      });
    }
    if (!lignes.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td"); td0.colSpan = 5; td0.textContent = "Aucune connexion enregistrée pour cet abonné.";
      tr0.appendChild(td0); td.appendChild(tr0);
    }
    lignes.forEach(function (a) {
      var tr = document.createElement("tr");
      [fmtDate(a.debut), fmtDate(a.fin), fmtDuree(dureeLigne(a)), a.lieu || "—", a.page || "—"].forEach(function (v) {
        var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
      });
      td.appendChild(tr);
    });
    document.getElementById("zone-detail").classList.add("visible");
    document.getElementById("zone-detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function diffuserSignalStatut(uid, statut, gold) {
    var sig = { type: "statut", uid: uid, statut: statut, gold: Boolean(gold), ts: Date.now() };
    try {
      sb.channel("sti-diffusion").send({ type: "broadcast", event: "statut", payload: sig });
    } catch (e) {}
    fetch("https://ntfy.sh/sti_v2_diffusion_9482", {
      method: "POST",
      body: JSON.stringify(sig)
    }).catch(function () {});
  }

  function changeStatut(p, statut) {
    sb.from("profiles").update({ statut: statut }).eq("id", p.id).then(function (r) {
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      diffuserSignalStatut(p.id, statut, estGold(p));
      msg("✅ " + contact(p) + " → " + LIB[statut], "ok");
      charge(true);
    });
  }

  function basculerGold(p) {
    var nvGold = !estGold(p);
    var baseLycee = lyceePropre(p);
    var nvLycee = nvGold ? (baseLycee + "|GOLD") : baseLycee;
    var nvStatut = nvGold ? "actif" : (p.statut === "en_attente" ? "actif" : p.statut);
    sb.from("profiles").update({ lycee: nvLycee, statut: nvStatut }).eq("id", p.id).then(function (r) {
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      diffuserSignalStatut(p.id, nvStatut, nvGold);
      msg(
        nvGold
          ? "👑 " + contact(p) + " est maintenant Compte GOLD (capture d'écran & impression autorisées)."
          : "🔒 " + contact(p) + " est repassé en compte standard (capture d'écran & impression bloquées).",
        "ok"
      );
      charge(true);
    });
  }

  /* ---------- Boîte modale : nouveau mot de passe ---------- */
  var modalMdp = document.getElementById("modal-mdp");
  var inpMdp = document.getElementById("inp-nouveau-mdp");
  var btnConfMdp = document.getElementById("btn-confirmer-mdp");
  document.getElementById("btn-annuler-mdp").addEventListener("click", function () {
    modalMdp.classList.remove("visible"); cibleMdp = null;
  });
  btnConfMdp.addEventListener("click", function () {
    if (!cibleMdp) return;
    var mdp = inpMdp.value;
    if (!mdp || mdp.length < 6) { msg("❌ Mot de passe trop court (6 caractères minimum).", "err"); return; }
    var p = cibleMdp;
    btnConfMdp.disabled = true;
    sb.rpc("admin_set_password", { uid: p.id, newpass: mdp }).then(function (r) {
      btnConfMdp.disabled = false;
      modalMdp.classList.remove("visible"); cibleMdp = null;
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      msg("🔑 Mot de passe de " + contact(p) + " défini.", "ok");
    });
  });

  function nouveauMdp(p) {
    cibleMdp = p;
    document.getElementById("mdp-cible").textContent = contact(p);
    inpMdp.value = "";
    modalMdp.classList.add("visible");
    setTimeout(function () { inpMdp.focus(); }, 30);
  }

  /* ---------- Boîte modale : suppression définitive ---------- */
  var modalSuppr = document.getElementById("modal-suppr");
  var btnConfSuppr = document.getElementById("btn-confirmer-suppr");
  document.getElementById("btn-annuler-suppr").addEventListener("click", function () {
    modalSuppr.classList.remove("visible"); cibleSuppr = null;
  });
  btnConfSuppr.addEventListener("click", function () {
    if (!cibleSuppr) return;
    var p = cibleSuppr;
    btnConfSuppr.disabled = true;
    btnConfSuppr.textContent = "⏳ Suppression…";
    sb.rpc("admin_supprimer_abonne", { uid: p.id }).then(function (r) {
      btnConfSuppr.disabled = false;
      btnConfSuppr.textContent = "🗑️ Oui, supprimer";
      modalSuppr.classList.remove("visible"); cibleSuppr = null;
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      diffuserSignalStatut(p.id, "supprime", false);
      msg("🗑️ " + contact(p) + " supprimé définitivement.", "ok");
      charge(true);
    });
  });

  function supprimer(p) {
    if (estAdminEmail(p.email)) { msg("❌ Impossible de supprimer le compte administrateur.", "err"); return; }
    cibleSuppr = p;
    document.getElementById("suppr-cible").textContent = contact(p);
    modalSuppr.classList.add("visible");
  }

  /* ---------- Gestion globale des Lycées et des Classes (Ajouter / Changer-Renommer / Supprimer) ---------- */
  var modalEcoles = document.getElementById("modal-ecoles");
  var tabEcoleLycees = document.getElementById("tab-ecole-lycees");
  var tabEcoleClasses = document.getElementById("tab-ecole-classes");
  var panEcoleLycees = document.getElementById("pan-ecole-lycees");
  var panEcoleClasses = document.getElementById("pan-ecole-classes");
  var inpNvLycee = document.getElementById("inp-nv-lycee");
  var inpNvClasse = document.getElementById("inp-nv-classe");
  var listeCfgLycees = document.getElementById("liste-cfg-lycees");
  var listeCfgClasses = document.getElementById("liste-cfg-classes");

  function basculerOngletEcole(mode) {
    var estLycee = mode === "lycees";
    if (tabEcoleLycees) tabEcoleLycees.classList.toggle("actif", estLycee);
    if (tabEcoleClasses) tabEcoleClasses.classList.toggle("actif", !estLycee);
    if (panEcoleLycees) panEcoleLycees.hidden = !estLycee;
    if (panEcoleClasses) panEcoleClasses.hidden = estLycee;
    rendreListesEcoles();
  }

  if (tabEcoleLycees) tabEcoleLycees.addEventListener("click", function () { basculerOngletEcole("lycees"); });
  if (tabEcoleClasses) tabEcoleClasses.addEventListener("click", function () { basculerOngletEcole("classes"); });

  var btnGererLycees = document.getElementById("btn-gerer-lycees");
  var btnGererClasses = document.getElementById("btn-gerer-classes");
  var btnFermerEcoles = document.getElementById("btn-fermer-ecoles");

  if (btnGererLycees) {
    btnGererLycees.addEventListener("click", function () {
      basculerOngletEcole("lycees");
      if (modalEcoles) modalEcoles.classList.add("visible");
    });
  }
  if (btnGererClasses) {
    btnGererClasses.addEventListener("click", function () {
      basculerOngletEcole("classes");
      if (modalEcoles) modalEcoles.classList.add("visible");
    });
  }
  if (btnFermerEcoles) {
    btnFermerEcoles.addEventListener("click", function () {
      if (modalEcoles) modalEcoles.classList.remove("visible");
    });
  }

  function rendreListesEcoles() {
    if (listeCfgLycees) {
      listeCfgLycees.innerHTML = "";
      var lycees = obtenirLyceesActifs();
      if (!lycees.length) {
        listeCfgLycees.innerHTML = "<div style='padding:10px;color:#7a6f5d;text-align:center'>Aucun lycée enregistré.</div>";
      }
      lycees.forEach(function (ly) {
        var nb = profils.filter(function (p) { return lyceePropre(p) === ly; }).length;
        var row = document.createElement("div");
        row.className = "ecole-item";
        var gauche = document.createElement("div");
        gauche.className = "ecole-nom";
        var spNom = document.createElement("span");
        spNom.textContent = "🏛️ " + ly;
        var spNb = document.createElement("span");
        spNb.className = "ecole-nb";
        spNb.textContent = nb + " élève(s)";
        gauche.append(spNom, spNb);

        var btns = document.createElement("div");
        btns.className = "ecole-btns";
        var bEdit = document.createElement("button");
        bEdit.type = "button";
        bEdit.textContent = "✏️ Changer";
        bEdit.title = "Renommer ce lycée (met à jour tous ses élèves)";
        bEdit.addEventListener("click", function () {
          ouvrirEditionInline(row, ly, function (nvNom) {
            renommerLyceeGlobal(ly, nvNom);
          });
        });
        var bDel = document.createElement("button");
        bDel.type = "button";
        bDel.className = "del";
        bDel.textContent = "🗑️ Supprimer";
        bDel.title = "Supprimer ce lycée de la liste";
        bDel.addEventListener("click", function () {
          supprimerLyceeGlobal(ly);
        });
        btns.append(bEdit, bDel);
        row.append(gauche, btns);
        listeCfgLycees.appendChild(row);
      });
    }

    if (listeCfgClasses) {
      listeCfgClasses.innerHTML = "";
      var classes = obtenirClassesActives();
      if (!classes.length) {
        listeCfgClasses.innerHTML = "<div style='padding:10px;color:#7a6f5d;text-align:center'>Aucune classe enregistrée.</div>";
      }
      classes.forEach(function (cl) {
        var nb = profils.filter(function (p) { return (p.classe || "—") === cl; }).length;
        var row = document.createElement("div");
        row.className = "ecole-item";
        var gauche = document.createElement("div");
        gauche.className = "ecole-nom";
        var spNom = document.createElement("span");
        spNom.textContent = "🏫 " + cl;
        var spNb = document.createElement("span");
        spNb.className = "ecole-nb";
        spNb.textContent = nb + " élève(s)";
        gauche.append(spNom, spNb);

        var btns = document.createElement("div");
        btns.className = "ecole-btns";
        var bEdit = document.createElement("button");
        bEdit.type = "button";
        bEdit.textContent = "✏️ Changer";
        bEdit.title = "Renommer cette classe (met à jour tous ses élèves)";
        bEdit.addEventListener("click", function () {
          ouvrirEditionInline(row, cl, function (nvNom) {
            renommerClasseGlobale(cl, nvNom);
          });
        });
        var bDel = document.createElement("button");
        bDel.type = "button";
        bDel.className = "del";
        bDel.textContent = "🗑️ Supprimer";
        bDel.title = "Supprimer cette classe de la liste";
        bDel.addEventListener("click", function () {
          supprimerClasseGlobale(cl);
        });
        btns.append(bEdit, bDel);
        row.append(gauche, btns);
        listeCfgClasses.appendChild(row);
      });
    }
  }

  function ouvrirEditionInline(rowEl, valeurActuelle, onValider) {
    rowEl.innerHTML = "";
    var inp = document.createElement("input");
    inp.type = "text";
    inp.value = valeurActuelle;
    inp.style.cssText = "flex:1;min-width:140px;margin:0;padding:6px 10px;font-size:13px;font-weight:800;border:2px solid #f4511e;border-radius:8px;";
    var btns = document.createElement("div");
    btns.className = "ecole-btns";
    var bSave = document.createElement("button");
    bSave.type = "button";
    bSave.textContent = "💾 Enregistrer";
    bSave.style.cssText = "background:#177245;color:#fff;border-color:#23201a;";
    var bCancel = document.createElement("button");
    bCancel.type = "button";
    bCancel.textContent = "✖";
    bSave.addEventListener("click", function () {
      var nv = inp.value.trim();
      if (nv && nv !== valeurActuelle) {
        onValider(nv);
      } else {
        rendreListesEcoles();
      }
    });
    bCancel.addEventListener("click", rendreListesEcoles);
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); bSave.click(); }
      if (e.key === "Escape") { e.preventDefault(); rendreListesEcoles(); }
    });
    btns.append(bSave, bCancel);
    rowEl.append(inp, btns);
    inp.focus();
    inp.select();
  }

  function ajouterLyceeGlobal() {
    var nom = inpNvLycee ? inpNvLycee.value.trim() : "";
    if (!nom) return;
    cfgEcoles.supprLycees = (cfgEcoles.supprLycees || []).filter(function (x) { return x !== nom; });
    if (cfgEcoles.lycees.indexOf(nom) === -1) cfgEcoles.lycees.push(nom);
    inpNvLycee.value = "";
    sauvegarderCfgEcoles();
    rendreListesEcoles();
    msg("🏛️ Lycée « " + nom + " » ajouté.", "ok");
  }

  function ajouterClasseGlobale() {
    var nom = inpNvClasse ? inpNvClasse.value.trim() : "";
    if (!nom) return;
    cfgEcoles.supprClasses = (cfgEcoles.supprClasses || []).filter(function (x) { return x !== nom; });
    if (cfgEcoles.classes.indexOf(nom) === -1) cfgEcoles.classes.push(nom);
    inpNvClasse.value = "";
    sauvegarderCfgEcoles();
    rendreListesEcoles();
    msg("🏫 Classe « " + nom + " » ajoutée.", "ok");
  }

  var btnAddLycee = document.getElementById("btn-add-lycee");
  var btnAddClasse = document.getElementById("btn-add-classe");
  if (btnAddLycee) btnAddLycee.addEventListener("click", ajouterLyceeGlobal);
  if (inpNvLycee) inpNvLycee.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajouterLyceeGlobal(); } });
  if (btnAddClasse) btnAddClasse.addEventListener("click", ajouterClasseGlobale);
  if (inpNvClasse) inpNvClasse.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajouterClasseGlobale(); } });

  function renommerLyceeGlobal(ancien, nv) {
    cfgEcoles.lycees = obtenirLyceesActifs().map(function (l) { return l === ancien ? nv : l; });
    cfgEcoles.supprLycees = (cfgEcoles.supprLycees || []).filter(function (x) { return x !== nv; });
    if (cfgEcoles.supprLycees.indexOf(ancien) === -1) cfgEcoles.supprLycees.push(ancien);

    /* Mettre à jour tous les abonnés appartenant à ce lycée (en préservant |GOLD) */
    var cibles = profils.filter(function (p) { return lyceePropre(p) === ancien; });
    cibles.forEach(function (p) {
      var nvVal = estGold(p) ? (nv + "|GOLD") : nv;
      majCacheLocalProfil(p.id, { lycee: nvVal });
      if (navigator.onLine) {
        sb.from("profiles").update({ lycee: nvVal }).eq("id", p.id).then(function () {});
      } else {
        empilerActionAdmin({ type: "profile_update", uid: p.id, patch: { lycee: nvVal }, gold: estGold(p) });
      }
    });
    sauvegarderCfgEcoles();
    rendreListesEcoles();
    rendAbonnes();
    msg("🏛️ Lycée « " + ancien + " » changé en « " + nv + " » (" + cibles.length + " élève(s) mis à jour).", "ok");
  }

  function supprimerLyceeGlobal(nom) {
    cfgEcoles.lycees = obtenirLyceesActifs().filter(function (l) { return l !== nom; });
    if (!cfgEcoles.supprLycees) cfgEcoles.supprLycees = [];
    if (cfgEcoles.supprLycees.indexOf(nom) === -1) cfgEcoles.supprLycees.push(nom);
    sauvegarderCfgEcoles();
    rendreListesEcoles();
    msg("🗑️ Lycée « " + nom + " » supprimé de la liste.", "ok");
  }

  function renommerClasseGlobale(ancienne, nv) {
    cfgEcoles.classes = obtenirClassesActives().map(function (c) { return c === ancienne ? nv : c; });
    cfgEcoles.supprClasses = (cfgEcoles.supprClasses || []).filter(function (x) { return x !== nv; });
    if (cfgEcoles.supprClasses.indexOf(ancienne) === -1) cfgEcoles.supprClasses.push(ancienne);

    /* Mettre à jour tous les abonnés appartenant à cette classe */
    var cibles = profils.filter(function (p) { return (p.classe || "—") === ancienne; });
    cibles.forEach(function (p) {
      majCacheLocalProfil(p.id, { classe: nv });
      if (navigator.onLine) {
        sb.from("profiles").update({ classe: nv }).eq("id", p.id).then(function () {});
      } else {
        empilerActionAdmin({ type: "profile_update", uid: p.id, patch: { classe: nv }, gold: estGold(p) });
      }
    });
    sauvegarderCfgEcoles();
    rendreListesEcoles();
    rendAbonnes();
    msg("🏫 Classe « " + ancienne + " » changée en « " + nv + " » (" + cibles.length + " élève(s) mis à jour).", "ok");
  }

  function supprimerClasseGlobale(nom) {
    cfgEcoles.classes = obtenirClassesActives().filter(function (c) { return c !== nom; });
    if (!cfgEcoles.supprClasses) cfgEcoles.supprClasses = [];
    if (cfgEcoles.supprClasses.indexOf(nom) === -1) cfgEcoles.supprClasses.push(nom);
    sauvegarderCfgEcoles();
    rendreListesEcoles();
    msg("🗑️ Classe « " + nom + " » supprimée de la liste.", "ok");
  }

  /* ---------- Boîte modale : modifier Nom, Prénom, Lycée ou Classe d'un abonné particulier ---------- */
  var modalAff = document.getElementById("modal-affectation");
  var inpAffNom = document.getElementById("aff-nom");
  var inpAffPrenom = document.getElementById("aff-prenom");
  var selAffLycee = document.getElementById("aff-lycee");
  var inpAffLyceeAutre = document.getElementById("aff-lycee-autre");
  var selAffClasse = document.getElementById("aff-classe");
  var inpAffClasseAutre = document.getElementById("aff-classe-autre");

  if (selAffLycee) {
    selAffLycee.addEventListener("change", function () {
      if (inpAffLyceeAutre) inpAffLyceeAutre.hidden = selAffLycee.value !== "__autre";
    });
  }
  if (selAffClasse) {
    selAffClasse.addEventListener("change", function () {
      if (inpAffClasseAutre) inpAffClasseAutre.hidden = selAffClasse.value !== "__autre";
    });
  }

  function ouvrirAffectation(p) {
    cibleAff = p;
    document.getElementById("aff-cible").textContent = contact(p);
    if (inpAffNom) inpAffNom.value = p.nom || "";
    if (inpAffPrenom) inpAffPrenom.value = p.prenom || "";
    var lyAct = lyceePropre(p);
    var clAct = p.classe || "";
    var lycees = obtenirLyceesActifs();
    if (lyAct && lyAct !== "—" && lycees.indexOf(lyAct) === -1) lycees.push(lyAct);
    var classes = obtenirClassesActives();
    if (clAct && clAct !== "—" && classes.indexOf(clAct) === -1) classes.push(clAct);

    selAffLycee.innerHTML = "";
    lycees.forEach(function (l) {
      var o = document.createElement("option");
      o.value = l; o.textContent = l;
      if (l === lyAct) o.selected = true;
      selAffLycee.appendChild(o);
    });
    var oAutreL = document.createElement("option");
    oAutreL.value = "__autre"; oAutreL.textContent = "➕ Nouveau lycée…";
    selAffLycee.appendChild(oAutreL);
    inpAffLyceeAutre.value = "";
    inpAffLyceeAutre.hidden = true;

    selAffClasse.innerHTML = "";
    classes.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c; o.textContent = c;
      if (c === clAct) o.selected = true;
      selAffClasse.appendChild(o);
    });
    var oAutreC = document.createElement("option");
    oAutreC.value = "__autre"; oAutreC.textContent = "➕ Nouvelle classe…";
    selAffClasse.appendChild(oAutreC);
    inpAffClasseAutre.value = "";
    inpAffClasseAutre.hidden = true;

    modalAff.classList.add("visible");
  }

  var btnAnnulerAff = document.getElementById("btn-annuler-aff");
  var btnConfirmerAff = document.getElementById("btn-confirmer-aff");
  if (btnAnnulerAff) {
    btnAnnulerAff.addEventListener("click", function () {
      modalAff.classList.remove("visible"); cibleAff = null;
    });
  }
  if (btnConfirmerAff) {
    btnConfirmerAff.addEventListener("click", function () {
      if (!cibleAff) return;
      var p = cibleAff;
      var nvNom = inpAffNom ? inpAffNom.value.trim() : (p.nom || "");
      var nvPrenom = inpAffPrenom ? inpAffPrenom.value.trim() : (p.prenom || "");
      var nvLyceeBase = selAffLycee.value === "__autre" ? inpAffLyceeAutre.value.trim() : selAffLycee.value;
      var nvClasse = selAffClasse.value === "__autre" ? inpAffClasseAutre.value.trim() : selAffClasse.value;
      if (!nvLyceeBase || !nvClasse) {
        msg("❌ Veuillez indiquer le lycée et la classe.", "err");
        return;
      }
      /* Si un nouveau lycée ou une nouvelle classe a été saisi, l'ajouter aussi à la liste globale */
      var cfgModifie = false;
      if (cfgEcoles.lycees.indexOf(nvLyceeBase) === -1) {
        cfgEcoles.lycees.push(nvLyceeBase);
        cfgModifie = true;
      }
      if (cfgEcoles.classes.indexOf(nvClasse) === -1) {
        cfgEcoles.classes.push(nvClasse);
        cfgModifie = true;
      }
      if (cfgModifie) sauvegarderCfgEcoles();

      var nvLycee = estGold(p) ? (nvLyceeBase + "|GOLD") : nvLyceeBase;
      var patch = {
        nom: nvNom || null,
        prenom: nvPrenom || null,
        lycee: nvLycee,
        classe: nvClasse
      };
      modalAff.classList.remove("visible");
      cibleAff = null;

      majCacheLocalProfil(p.id, patch);
      if (!navigator.onLine) {
        empilerActionAdmin({ type: "profile_update", uid: p.id, patch: patch, gold: estGold(p) });
        msg("📴 Hors-ligne : informations de " + contact(p) + " mises à jour (« " + nvLyceeBase + " · " + nvClasse + " »).", "ok");
        return;
      }
      sb.from("profiles").update(patch).eq("id", p.id).then(function (r) {
        if (r && r.error) {
          empilerActionAdmin({ type: "profile_update", uid: p.id, patch: patch, gold: estGold(p) });
          return;
        }
        msg("✅ " + contact(p) + " → " + nvLyceeBase + " · " + nvClasse, "ok");
        charge(true);
      });
    });
  }

  /* ---------- Point 6 : Boîte modale Contrôle / Test chronométré en direct ---------- */
  var modalCtrl = document.getElementById("modal-controle");
  var selCtrlClasse = document.getElementById("ctrl-classe");
  var CANAL_DIFFUSION = "sti_v2_diffusion_9482";

  function remplirClassesSelect(selEl) {
    if (!selEl) return;
    var classesBase = obtenirClassesActives();
    selEl.innerHTML = "";
    var optTous = document.createElement("option");
    optTous.value = "*";
    optTous.textContent = "Toutes les classes (" + profils.length + " abonné(s))";
    selEl.appendChild(optTous);
    classesBase.forEach(function (cl) {
      var nb = abonnesDeClasse(cl).length;
      var opt = document.createElement("option");
      opt.value = cl;
      opt.textContent = cl + " (" + nb + " abonné(s))";
      selEl.appendChild(opt);
    });
  }

  document.getElementById("btn-controle").addEventListener("click", function () {
    remplirClassesSelect(selCtrlClasse);
    modalCtrl.classList.add("visible");
  });
  document.getElementById("btn-fermer-ctrl").addEventListener("click", function () {
    modalCtrl.classList.remove("visible");
  });
  document.getElementById("btn-lancer-ctrl").addEventListener("click", function () {
    var cl = selCtrlClasse.value;
    var url = document.getElementById("ctrl-sujet").value;
    var min = parseInt(document.getElementById("ctrl-duree").value, 10) || 20;
    var titre = document.getElementById("ctrl-titre").value.trim() || "Contrôle STI";
    var ctrlPayload = {
      type: "controle",
      action: "start",
      id: "ctrl" + Date.now(),
      classe: cl,
      url: url,
      dureeMin: min,
      finMs: Date.now() + min * 60000,
      titre: titre
    };
    try {
      sb.channel("sti-diffusion").send({ type: "broadcast", event: "controle", payload: ctrlPayload });
    } catch (e) {}
    fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
      method: "POST",
      body: JSON.stringify(ctrlPayload)
    }).catch(function () {});
    modalCtrl.classList.remove("visible");
    msg("🚀 Contrôle chronométré (« " + titre + " », " + min + " min) lancé en direct !", "ok");
  });
  document.getElementById("btn-stop-ctrl").addEventListener("click", function () {
    var stopPayload = { type: "controle", action: "stop", id: "stop" + Date.now() };
    try {
      sb.channel("sti-diffusion").send({ type: "broadcast", event: "controle", payload: stopPayload });
    } catch (e) {}
    fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
      method: "POST",
      body: JSON.stringify(stopPayload)
    }).catch(function () {});
    modalCtrl.classList.remove("visible");
    msg("⏹️ Contrôle chronométré arrêté sur les écrans des élèves.", "ok");
  });

  /* ---------- Boîte modale : message groupé à toute une classe ---------- */
  var modalClasse = document.getElementById("modal-classe");
  var selClasse = document.getElementById("msg-classe");
  var txtClasse = document.getElementById("msg-texte");
  var zoneWaClasse = document.getElementById("zone-wa-classe");
  var listeWaClasse = document.getElementById("liste-wa-classe");

  function abonnesDeClasse(cl) {
    if (!cl || cl === "*") return profils.slice();
    return profils.filter(function (p) { return (p.classe || "—") === cl; });
  }

  function remplirClasses() {
    remplirClassesSelect(selClasse);
    majListeWaClasse();
  }

  function majListeWaClasse() {
    var liste = abonnesDeClasse(selClasse.value);
    var avecTel = liste.filter(function (p) { return Boolean(telDeProfil(p)); });
    listeWaClasse.innerHTML = "";
    if (!avecTel.length) {
      zoneWaClasse.style.display = "none";
      return;
    }
    zoneWaClasse.style.display = "block";
    avecTel.forEach(function (p) {
      var tel = telDeProfil(p);
      var row = document.createElement("div");
      row.className = "wa-item";
      var sp = document.createElement("span");
      sp.textContent = contact(p) + " · " + (p.classe || "—");
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "💬 WhatsApp";
      b.addEventListener("click", function () {
        var texte = txtClasse.value.trim();
        if (!texte) { msg("❌ Saisissez d'abord le message à envoyer.", "err"); txtClasse.focus(); return; }
        var ch = tel.replace(/\D/g, "");
        window.open("https://wa.me/" + ch + "?text=" + encodeURIComponent(texte), "_blank", "noopener");
        b.textContent = "✅ Ouvert";
        b.classList.add("envoye");
      });
      row.append(sp, b);
      listeWaClasse.appendChild(row);
    });
  }

  document.getElementById("btn-msg-classe").addEventListener("click", function () {
    remplirClasses();
    modalClasse.classList.add("visible");
    setTimeout(function () { txtClasse.focus(); }, 30);
  });
  document.getElementById("btn-fermer-classe").addEventListener("click", function () {
    arreterDictee();
    modalClasse.classList.remove("visible");
  });
  selClasse.addEventListener("change", majListeWaClasse);
  document.getElementById("btn-effacer-msg").addEventListener("click", function () {
    arreterDictee();
    txtClasse.value = "";
    texteBase = "";
    txtClasse.focus();
  });

  /* ---------- Dictée vocale du message (Web Speech API — sans répétition) ---------- */
  var btnDicter = document.getElementById("btn-dicter-msg");
  var selLangDictee = document.getElementById("lang-dictee");
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var reco = null;
  var enEcoute = false;
  var texteBase = "";

  function nettoyerDoublonsConsecutifs(ch) {
    return String(ch || "").replace(/\b(\S+)(?:\s+\1\b)+/gi, "$1");
  }

  function arreterDictee() {
    enEcoute = false;
    if (reco) {
      try { reco.stop(); } catch (e) {}
    }
    if (btnDicter) {
      btnDicter.classList.remove("ecoute");
      btnDicter.textContent = "🎙️ Dicter";
    }
  }

  if (btnDicter) {
    if (!Rec) {
      btnDicter.title = "Votre navigateur ne supporte pas la dictée vocale (utilisez Chrome ou Edge)";
    }
    btnDicter.addEventListener("click", function () {
      if (!Rec) {
        msg("⚠️ La dictée vocale nécessite Chrome, Edge ou Safari récent.", "err");
        return;
      }
      if (enEcoute) {
        arreterDictee();
        msg("🎙️ Dictée terminée.", "ok");
        return;
      }
      reco = new Rec();
      reco.lang = (selLangDictee && selLangDictee.value) || "fr-FR";
      reco.continuous = true;
      reco.interimResults = true;
      texteBase = txtClasse.value.trim();

      var segmentsFinaux = [];
      reco.onstart = function () {
        enEcoute = true;
        btnDicter.classList.add("ecoute");
        btnDicter.textContent = "⏹️ Arrêter la dictée…";
        msg("🎙️ Parlez maintenant, votre message s'écrit automatiquement…", "ok");
      };
      reco.onresult = function (e) {
        var provisoire = "";
        for (var i = 0; i < e.results.length; i++) {
          var seg = (e.results[i][0].transcript || "").trim();
          if (!seg) continue;
          if (e.results[i].isFinal) {
            if (!segmentsFinaux[i]) {
              var prev = "";
              for (var k = i - 1; k >= 0; k--) {
                if (segmentsFinaux[k]) { prev = segmentsFinaux[k]; break; }
              }
              if (prev && seg.toLowerCase().indexOf(prev.toLowerCase()) === 0) {
                segmentsFinaux[k] = "";
              }
              segmentsFinaux[i] = seg;
            }
          } else {
            provisoire = seg;
          }
        }
        var cumuleFinal = segmentsFinaux.filter(Boolean).join(" ");
        var dicte = (cumuleFinal + (provisoire ? " " + provisoire : "")).replace(/\s+/g, " ").trim();
        dicte = nettoyerDoublonsConsecutifs(dicte);
        txtClasse.value = (texteBase ? texteBase + " " : "") + dicte;
      };
      reco.onerror = function () {
        arreterDictee();
      };
      reco.onend = function () {
        texteBase = txtClasse.value.trim();
        if (enEcoute) {
          arreterDictee();
        }
      };
      try { reco.start(); } catch (e) { arreterDictee(); }
    });
  }

  document.getElementById("btn-mail-classe").addEventListener("click", function () {
    var texte = txtClasse.value.trim();
    if (!texte) { msg("❌ Saisissez d'abord le message à envoyer.", "err"); txtClasse.focus(); return; }
    var cl = selClasse.value;
    var libCl = cl === "*" ? "Toutes les classes" : cl;
    var mails = abonnesDeClasse(cl)
      .map(function (p) { return p.email || ""; })
      .filter(function (em) { return em && !/@tel\.sti\.tn$/i.test(em); });
    if (!mails.length) {
      msg("⚠️ Aucun abonné avec adresse e-mail dans « " + libCl + " ».", "err");
      return;
    }
    var sujet = "[STI V2.0 — " + libCl + "] Message de M. Essouyah";
    location.href = "mailto:?bcc=" + encodeURIComponent(mails.join(",")) +
      "&subject=" + encodeURIComponent(sujet) +
      "&body=" + encodeURIComponent(texte);
    msg("📧 Messagerie ouverte pour " + mails.length + " élève(s) de « " + libCl + " ».", "ok");
  });

  document.getElementById("btn-diffuser-classe").addEventListener("click", function () {
    var texte = txtClasse.value.trim();
    if (!texte) { msg("❌ Saisissez d'abord le message à diffuser.", "err"); txtClasse.focus(); return; }
    var cl = selClasse.value;
    var libCl = cl === "*" ? "Toutes les classes" : cl;
    var btn = document.getElementById("btn-diffuser-classe");
    btn.disabled = true;
    btn.textContent = "⏳ Diffusion…";
    var payload = {
      id: "m" + Date.now(),
      ts: new Date().toISOString(),
      classe: cl,
      texte: texte
    };
    arreterDictee();
    try {
      sb.channel("sti-diffusion").send({ type: "broadcast", event: "annonce", payload: payload });
    } catch (e) {}
    var pDb = adminUid
      ? sb.from("acces").insert({ user_id: adminUid, page: "MSG_ENVOI:" + payload.id, lieu: JSON.stringify(payload), duree_sec: 0 })
      : Promise.resolve();
    var pNtfy = fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
      method: "POST",
      body: JSON.stringify(payload)
    }).catch(function () {});

    Promise.all([pDb, pNtfy]).then(function () {
      btn.disabled = false;
      btn.textContent = "🔔 Diffuser sur le site";
      modalClasse.classList.remove("visible");
      txtClasse.value = "";
      texteBase = "";
      if (selSuiviMsg) selSuiviMsg.value = "";
      msg("📢 Message diffusé pour « " + libCl + " » — suivi de lecture mis à jour ci-dessous.", "ok");
      charge(true);
    });
  });
})();
