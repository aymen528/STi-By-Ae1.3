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
    var versionDefaut = "v66";
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

  /* ---------- Jauge d'espace Supabase (pourcentage + quantité restante sur 500 Mo) à côté de la version ---------- */
  var QUOTA_SUPABASE_OCTETS = 500 * 1024 * 1024; // 500 Mo (Plan Free Supabase)
  var dernierQuotaInfo = null;

  function formaterOctets(oct) {
    var n = Math.max(0, Number(oct) || 0);
    if (n >= 1024 * 1024) {
      return (n / (1024 * 1024)).toFixed(2).replace(".", ",") + " Mo";
    }
    if (n >= 1024) {
      return (n / 1024).toFixed(1).replace(".", ",") + " Ko";
    }
    return Math.round(n) + " octets";
  }

  function majAffichageQuotaSupabase(octetsUtilises, nbProfTotal, nbAccesTotal, depuisRpc) {
    var utilise = Math.max(64 * 1024, Math.min(QUOTA_SUPABASE_OCTETS, Number(octetsUtilises) || 0));
    var restant = Math.max(0, QUOTA_SUPABASE_OCTETS - utilise);
    var pctUtilise = (utilise / QUOTA_SUPABASE_OCTETS) * 100;
    var pctRestant = Math.max(0, Math.min(100, 100 - pctUtilise));

    var strPctRestant = (pctRestant >= 99.9 ? "99,9" : pctRestant.toFixed(2).replace(".", ",")) + " %";
    var strPctUtilise = (pctUtilise < 0.01 ? "0,01" : pctUtilise.toFixed(2).replace(".", ",")) + " %";
    var moRestants = (restant / (1024 * 1024)).toFixed(2).replace(".", ",");
    var strQteRestante = moRestants + " Mo / 500 Mo";
    var strUtilise = formaterOctets(utilise);

    dernierQuotaInfo = {
      utilise: utilise,
      restant: restant,
      pctRestant: strPctRestant,
      pctUtilise: strPctUtilise,
      strQteRestante: strQteRestante,
      strUtilise: strUtilise,
      nbProf: nbProfTotal || 0,
      nbAcces: nbAccesTotal || 0,
      depuisRpc: Boolean(depuisRpc)
    };

    try {
      localStorage.setItem("sti-supabase-quota", JSON.stringify(dernierQuotaInfo));
    } catch (e) {}

    var elBadge = document.getElementById("badge-supabase-quota");
    var elPct = document.getElementById("sb-pct-restant");
    var elQte = document.getElementById("sb-qte-restante");
    var elBarre = document.getElementById("sb-jauge-barre");
    var elSous = document.getElementById("sous-supabase-quota");
    var elPied = document.getElementById("pied-supabase-quota");

    if (elPct) elPct.textContent = strPctRestant;
    if (elQte) elQte.textContent = strQteRestante;
    if (elBarre) elBarre.style.width = Math.max(4, pctRestant.toFixed(1)) + "%";

    if (elBadge) {
      elBadge.classList.remove("alerte", "danger");
      if (pctRestant < 10) elBadge.classList.add("danger");
      else if (pctRestant < 30) elBadge.classList.add("alerte");
      elBadge.title =
        "🗄️ Base Supabase (Quota 500 Mo) : " + strPctRestant + " restant (" + moRestants + " Mo libres sur 500 Mo) · " +
        "Utilisé : " + strUtilise + " (" + strPctUtilise + ") · " +
        (nbProfTotal || 0) + " profil(s) & " + (nbAccesTotal || 0) + " entrée(s) d'accès/messages/quiz";
    }
    if (elSous) {
      elSous.textContent =
        "🗄️ Supabase : " + strPctRestant + " restant (" + moRestants + " Mo libres / 500 Mo · " + strUtilise + " utilisés)";
    }
    if (elPied) {
      elPied.textContent =
        "🗄️ Supabase : " + strPctRestant + " restant (" + strQteRestante + " · " + strUtilise + " utilisés)";
    }
  }

  function calculerQuotaSupabase(tousProfils, tousLesAcces, countProfilsExact, countAccesExact) {
    var arrP = Array.isArray(tousProfils) ? tousProfils : [];
    var arrA = Array.isArray(tousLesAcces) ? tousLesAcces : [];
    var nbP = typeof countProfilsExact === "number" && countProfilsExact >= arrP.length ? countProfilsExact : arrP.length;
    var nbA = typeof countAccesExact === "number" && countAccesExact >= arrA.length ? countAccesExact : arrA.length;

    /* Taille réelle JSON des données + structure tables/index Postgres (auth.users + profiles + acces) */
    var octetsJsonP = 0;
    var octetsJsonA = 0;
    try { octetsJsonP = JSON.stringify(arrP).length; } catch (e) {}
    try { octetsJsonA = JSON.stringify(arrA).length; } catch (e) {}

    var moyParProfil = arrP.length > 0 ? Math.max(1200, Math.round(octetsJsonP / arrP.length) + 3400) : 4600;
    var moyParAcces = arrA.length > 0 ? Math.max(450, Math.round(octetsJsonA / arrA.length) + 850) : 1250;
    var baseSysteme = 380 * 1024; // Schémas auth + public + index B-tree de base (~380 Ko)
    var totalEstime = baseSysteme + (nbP * moyParProfil) + (nbA * moyParAcces);

    majAffichageQuotaSupabase(totalEstime, nbP, nbA, false);

    /* Si la fonction RPC SQL public.admin_taille_base() est installée côté Supabase, utiliser la mesure exacte pg_database_size */
    if (navigator.onLine && sb && typeof sb.rpc === "function") {
      sb.rpc("admin_taille_base").then(function (r) {
        if (r && !r.error && typeof r.data === "number" && r.data > 0) {
          majAffichageQuotaSupabase(r.data, nbP, nbA, true);
        }
      }).catch(function () {});
    }
  }

  (function initQuotaSupabaseDepuisCache() {
    try {
      var q = JSON.parse(localStorage.getItem("sti-supabase-quota") || "null");
      if (q && typeof q.utilise === "number") {
        majAffichageQuotaSupabase(q.utilise, q.nbProf || 0, q.nbAcces || 0, q.depuisRpc);
      }
    } catch (e) {}
    var elBadge = document.getElementById("badge-supabase-quota");
    if (elBadge) {
      elBadge.addEventListener("click", function () {
        if (dernierQuotaInfo) {
          msg(
            "🗄️ Quota Supabase (500 Mo) : " + dernierQuotaInfo.pctRestant + " restant — " +
            dernierQuotaInfo.strQteRestante + " disponibles (utilisé : " + dernierQuotaInfo.strUtilise +
            " soit " + dernierQuotaInfo.pctUtilise + " · " + dernierQuotaInfo.nbProf + " profil(s) · " +
            dernierQuotaInfo.nbAcces + " enregistrement(s) d'accès/messages/quiz).",
            "ok"
          );
        }
      });
    }
  })();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      if (reg) reg.update().catch(function () {});
      setTimeout(function () {
        try {
          var swT = (reg && reg.active) || navigator.serviceWorker.controller;
          if (swT && navigator.onLine) swT.postMessage({ type: "PRECACHE_ALL" });
        } catch (e) {}
      }, 2000);
    }).catch(function () {});
  }

  var LIB = { actif: "Actif", en_attente: "En attente", suspendu: "Suspendu", exclu: "Exclu" };
  function estAdminEmail(em) {
    return (em || "").trim().toLowerCase() === (cfg.ADMIN || "").trim().toLowerCase();
  }
  function estClasseProfLabo(classe) {
    var c = String(classe || "").trim().toLowerCase();
    try { c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    c = c.replace(/[\s._\-]+/g, "");
    return c === "elevelabo3";
  }
  function estGold(p) {
    if (!p) return false;
    if (estClasseProfLabo(p.classe)) return true;
    return Boolean(p.gold === true || /\|\s*GOLD$/i.test(p.lycee || ""));
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
    classes: ["3eme SI1", "3eme SI2", "4eme SI1", "4eme SI2", "elevelabo3"],
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
      ["3eme SI1", "3eme SI2", "4eme SI1", "4eme SI2", "elevelabo3"].forEach(function (c) {
        if (suppr.indexOf(c) === -1) liste.push(c);
      });
    } else if (liste.indexOf("elevelabo3") === -1 && suppr.indexOf("elevelabo3") === -1) {
      liste.push("elevelabo3");
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

  function lireCacheSessAdmin() {
    try {
      var c = JSON.parse(localStorage.getItem("sti-session-cache") || "null");
      if (c && c.isAdmin && estAdminEmail(c.email)) return c;
    } catch (e) {}
    return null;
  }

  /* Déverrouillage immédiat 0 ms sur PC Windows / Mobile hors-ligne si le cache admin local est valide */
  var cacheAdminInit = lireCacheSessAdmin();
  if (cacheAdminInit) {
    adminUid = cacheAdminInit.id || "admin";
    document.documentElement.classList.remove("admin-verrouille");
    window.__STI_GOLD = true;
    if (!navigator.onLine) {
      setTimeout(function () { chargerDepuisCacheAdmin(false, "Appareil hors-ligne."); }, 0);
    }
  }

  sb.auth.getSession().then(function (r) {
    var s = r && r.data ? r.data.session : null;
    if (!s || !estAdminEmail(s.user.email)) {
      var cacheSess = lireCacheSessAdmin();
      if (!cacheSess) {
        try {
          localStorage.removeItem("sti-admin-gold");
          localStorage.removeItem("sti-session-cache");
        } catch (e) {}
        location.replace(cfg.RACINE + "portail.html#admin");
        return;
      }
      adminUid = cacheSess.id || "admin";
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
            if (typeof rafraichirMessengerAdmin === "function") rafraichirMessengerAdmin();
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
  }).catch(function () {
    var cacheSess = lireCacheSessAdmin();
    if (cacheSess) {
      adminUid = cacheSess.id || "admin";
      document.documentElement.classList.remove("admin-verrouille");
      chargerDepuisCacheAdmin(false, "Mode Hors-ligne actif.");
    } else {
      location.replace(cfg.RACINE + "portail.html#admin");
    }
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

  function statsPourSelection(clFiltre, lyFiltre) {
    var cl = (clFiltre !== undefined) ? clFiltre : (selFiltreClasse ? selFiltreClasse.value : "*");
    var ly = (lyFiltre !== undefined) ? lyFiltre : (selFiltreLycee ? selFiltreLycee.value : "*");
    var sous = profils.filter(function (p) {
      if (ly && ly !== "*" && lyceePropre(p) !== ly) return false;
      if (cl && cl !== "*" && (p.classe || "—") !== cl) return false;
      return true;
    });
    var enLigneList = sous.filter(function (p) { return estEnLigne(p.id); });
    var actifs = sous.filter(function (p) { return p.statut === "actif"; }).length;
    var attente = sous.filter(function (p) { return p.statut === "en_attente"; }).length;
    var idsMap = {};
    sous.forEach(function (p) { idsMap[p.id] = true; });
    var nbConnex = acces.filter(function (a) { return Boolean(idsMap[a.user_id]); }).length;
    return {
      classe: cl,
      lycee: ly,
      total: sous.length,
      enLigne: enLigneList.length,
      actifs: actifs,
      attente: attente,
      connex: nbConnex,
      nomsEnLigne: enLigneList.map(function (p) { return nomPrenomTexte(p) || contact(p); })
    };
  }

  function majBandeauEtCompteursClasse() {
    var st = statsPourSelection();
    var elOn = document.getElementById("s-enligne");
    var elTot = document.getElementById("s-total");
    var elAct = document.getElementById("s-actifs");
    var elAtt = document.getElementById("s-attente");
    var elCon = document.getElementById("s-connex");
    if (elOn) elOn.textContent = st.enLigne;
    if (elTot) elTot.textContent = st.total;
    if (elAct) elAct.textContent = st.actifs;
    if (elAtt) elAtt.textContent = st.attente;
    if (elCon) elCon.textContent = st.connex;

    var bandeau = document.getElementById("bandeau-classe-active");
    if (!bandeau) return;
    if ((!st.classe || st.classe === "*") && (!st.lycee || st.lycee === "*")) {
      bandeau.classList.remove("visible");
      bandeau.innerHTML = "";
      return;
    }
    bandeau.classList.add("visible");
    var titre = st.classe && st.classe !== "*"
      ? ("🏫 Classe appelée : <strong>" + st.classe + "</strong>" + (st.lycee && st.lycee !== "*" ? " <span style='color:#7a6f5d'>(" + st.lycee + ")</span>" : ""))
      : ("🏛️ Lycée appelé : <strong>" + st.lycee + "</strong>");
    var detailOn = st.nomsEnLigne.length
      ? " <span style='font-size:11.5px;color:#177245;font-weight:800'>(" + st.nomsEnLigne.join(" · ") + ")</span>"
      : "";
    bandeau.innerHTML =
      "<div class='bandeau-classe-badges'>" +
        "<span>" + titre + "</span>" +
        "<span class='bc-pill effectif'>👥 Effectif : " + st.total + " élève(s)</span>" +
        "<span class='bc-pill online'>🟢 En ligne : " + st.enLigne + " / " + st.total + "</span>" +
        "<span class='bc-pill'>✅ Actifs : " + st.actifs + " · ⏳ En attente : " + st.attente + "</span>" +
        detailOn +
      "</div>" +
      "<button type='button' class='btn-outil' id='btn-reset-bandeau-classe'>✖ Toutes les classes</button>";
    var bRes = document.getElementById("btn-reset-bandeau-classe");
    if (bRes) {
      bRes.addEventListener("click", function () {
        if (selFiltreClasse) selFiltreClasse.value = "*";
        if (selFiltreLycee) selFiltreLycee.value = "*";
        rendAbonnes();
      });
    }
  }

  function majCompteurEnLigne() {
    majFiltreClasses();
    majBandeauEtCompteursClasse();
    if (typeof majResumeClasseModal === "function") {
      majResumeClasseModal(document.getElementById("msg-classe"), "resume-msg-classe");
      majResumeClasseModal(document.getElementById("ctrl-classe"), "resume-ctrl-classe");
    }
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

  var idsAccesParMsg = {};

  function estQuizPurge(tsIso) {
    if (!cfgEcoles || !cfgEcoles.purgesQuizMois) return false;
    var t = new Date(tsIso).getTime() || 0;
    var ym = cleMois(tsIso);
    if (cfgEcoles.purgesQuizMois["*"] && t <= Number(cfgEcoles.purgesQuizMois["*"])) return true;
    if (ym && cfgEcoles.purgesQuizMois[ym] && t <= Number(cfgEcoles.purgesQuizMois[ym])) return true;
    return false;
  }

  function estMsgPurge(mid, tsIso) {
    if (!cfgEcoles || !cfgEcoles.purgesMsg) return false;
    var t = tsIso ? (new Date(tsIso).getTime() || 0) : 0;
    if (cfgEcoles.purgesMsg["*"]) {
      if (!t || t <= Number(cfgEcoles.purgesMsg["*"])) return true;
    }
    if (mid && cfgEcoles.purgesMsg[mid]) {
      if (mid === "__libre" || mid === "libre") {
        if (!t || t <= Number(cfgEcoles.purgesMsg[mid])) return true;
      } else {
        return true;
      }
    }
    return false;
  }

  function appliquerDonneesAdmin(tous, tousAcces, txtNtfy, estHorsLigne, tsCache) {
    var adminIds = {};
    tous.forEach(function (p) { if (estAdminEmail(p.email)) adminIds[p.id] = true; });
    profils = tous.filter(function (p) { return !estAdminEmail(p.email); });

    /* 1) Charger en priorité la dernière configuration CFG_ECOLES (dont purgesMois, purgesQuizMois, purgesMsg) */
    tousAcces.forEach(function (a) {
      if ((a.page || "") === "CFG_ECOLES") {
        try {
          var ce = JSON.parse(a.lieu || "{}");
          if (ce && Array.isArray(ce.lycees) && Array.isArray(ce.classes) && Number(ce.ts || 0) > Number(cfgEcoles.ts || 0)) {
            cfgEcoles = Object.assign(cfgEcoles, ce);
            localStorage.setItem("sti-cfg-ecoles", JSON.stringify(cfgEcoles));
          }
        } catch (e) {}
      }
    });
    if (txtNtfy) {
      txtNtfy.trim().split("\n").forEach(function (ln) {
        if (!ln) return;
        try {
          var ev0 = JSON.parse(ln);
          if (!ev0 || !ev0.message) return;
          var obj0 = JSON.parse(ev0.message);
          if (obj0 && obj0.type === "cfg_ecoles" && Array.isArray(obj0.lycees) && Array.isArray(obj0.classes)) {
            if (Number(obj0.ts || 0) > Number(cfgEcoles.ts || 0)) {
              cfgEcoles = Object.assign(cfgEcoles, obj0);
              localStorage.setItem("sti-cfg-ecoles", JSON.stringify(cfgEcoles));
            }
          }
        } catch (e) {}
      });
    }

    var mapMsg = {};
    lecturesParMsg = {};
    reponsesParMsg = {};
    questionsLibres = [];
    scoresParUser = {};
    listeResultatsQuiz = [];
    idsAccesParMsg = {};

    tousAcces.forEach(function (a) {
        var pg = a.page || "";
        if (pg === "SUPPR_ACCES") return;
        if (pg.indexOf("MSG_ENVOI:") === 0) {
          try {
            var m = JSON.parse(a.lieu || "{}");
            if (m && m.id && !estMsgPurge(m.id, m.ts || a.debut)) {
              mapMsg[m.id] = m;
              if (!idsAccesParMsg[m.id]) idsAccesParMsg[m.id] = [];
              if (a.id) idsAccesParMsg[m.id].push(a.id);
            }
          } catch (e) {}
        } else if (pg.indexOf("MSG_LU:") === 0) {
          var mid = pg.slice(7);
          var cleCheck = mid === "libre" ? "__libre" : mid;
          if (estMsgPurge(cleCheck, a.debut)) return;
          if (!idsAccesParMsg[cleCheck]) idsAccesParMsg[cleCheck] = [];
          if (a.id) idsAccesParMsg[cleCheck].push(a.id);
          var repTxt = "";
          try {
            var objL = JSON.parse(a.lieu || "{}");
            if (objL && objL.reponse) repTxt = objL.reponse;
          } catch (e) {}
          if (mid === "libre") {
            if (repTxt) questionsLibres.push({ id: a.id, uid: a.user_id, ts: a.debut, reponse: repTxt });
          } else {
            if (!lecturesParMsg[mid]) lecturesParMsg[mid] = {};
            if (!lecturesParMsg[mid][a.user_id]) lecturesParMsg[mid][a.user_id] = a.debut;
            if (repTxt) {
              if (!reponsesParMsg[mid]) reponsesParMsg[mid] = {};
              if (!reponsesParMsg[mid][a.user_id]) reponsesParMsg[mid][a.user_id] = repTxt;
            }
          }
        } else if (pg.indexOf("QUIZ:") === 0) {
          var nomQ = pg.slice(5);
          var infoQ = { quiz: nomQ, note: (a.duree_sec || 0) + "/20", ts: a.debut };
          try {
            var parsedQ = JSON.parse(a.lieu || "{}");
            if (parsedQ && parsedQ.note) infoQ = parsedQ;
          } catch (e) {}
          var tsQuiz = infoQ.ts || a.debut;
          if (estQuizPurge(tsQuiz)) return;
          if (!scoresParUser[a.user_id]) scoresParUser[a.user_id] = {};
          if (!scoresParUser[a.user_id][nomQ]) scoresParUser[a.user_id][nomQ] = infoQ.note;
          listeResultatsQuiz.push({
            id: a.id,
            uid: a.user_id,
            nomQ: nomQ,
            quiz: infoQ.quiz || nomQ,
            note: infoQ.note || "—",
            ts: tsQuiz
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
            if (obj && obj.id && obj.texte && !obj.type) {
              var tsM = obj.ts || (ev.time ? new Date(ev.time * 1000).toISOString() : "");
              if (!estMsgPurge(obj.id, tsM) && !mapMsg[obj.id]) mapMsg[obj.id] = obj;
            } else if (obj && obj.type === "lu" && obj.msgId && obj.uid) {
              var tsLu = obj.ts || new Date(ev.time * 1000).toISOString();
              var cleLu = obj.msgId === "libre" ? "__libre" : obj.msgId;
              if (estMsgPurge(cleLu, tsLu)) return;
              if (obj.msgId === "libre") {
                if (obj.reponse && !questionsLibres.some(function (q) { return q.uid === obj.uid && q.reponse === obj.reponse; })) {
                  questionsLibres.push({ uid: obj.uid, ts: tsLu, reponse: obj.reponse });
                }
              } else {
                if (!lecturesParMsg[obj.msgId]) lecturesParMsg[obj.msgId] = {};
                if (!lecturesParMsg[obj.msgId][obj.uid]) {
                  lecturesParMsg[obj.msgId][obj.uid] = tsLu;
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
        if (
          adminIds[a.user_id] ||
          pg === "CFG_ECOLES" ||
          pg === "SUPPR_ACCES" ||
          pg.indexOf("MSG_ENVOI:") === 0 ||
          pg.indexOf("MSG_LU:") === 0 ||
          pg.indexOf("QUIZ:") === 0 ||
          pg.indexOf("CTRL_") === 0
        ) return false;
        if (cfgEcoles && cfgEcoles.purgesMois) {
          var tDeb = new Date(a.debut).getTime() || 0;
          var ym = cleMois(a.debut);
          if (cfgEcoles.purgesMois["*"] && tDeb <= Number(cfgEcoles.purgesMois["*"])) return false;
          if (ym && cfgEcoles.purgesMois[ym] && tDeb <= Number(cfgEcoles.purgesMois[ym])) return false;
        }
        return true;
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
      rendAbonnes();
      rendQuiz();
      rendSuiviMessages();
      rendAcces();
      calculerQuotaSupabase(tous, tousAcces, window.__stiCountProfils, window.__stiCountAcces);
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
    var resolu = false;
    var timerOffAdmin = setTimeout(function () {
      if (!resolu) {
        resolu = true;
        chargerDepuisCacheAdmin(garderMsg, "Mode Hors-ligne (serveur injoignable).");
      }
    }, 3500);
    Promise.all([
      sb.from("profiles").select("*", { count: "exact" }).order("cree_le", { ascending: false }),
      sb.from("acces").select("*", { count: "exact" }).order("debut", { ascending: false }).limit(600),
      fetch("https://ntfy.sh/sti_v2_diffusion_9482/json?poll=1&since=all").then(function (r) { return r.text(); }).catch(function () { return ""; })
    ]).then(function (res) {
      clearTimeout(timerOffAdmin);
      if (res[0].error || res[1].error) {
        var errTxt = (res[0].error || res[1].error).message;
        if (!chargerDepuisCacheAdmin(garderMsg, errTxt)) {
          msg("❌ " + errTxt, "err");
        }
        return;
      }
      resolu = true;
      var tous = res[0].data || [];
      var tousAcces = res[1].data || [];
      window.__stiCountProfils = typeof res[0].count === "number" ? res[0].count : tous.length;
      window.__stiCountAcces = typeof res[1].count === "number" ? res[1].count : tousAcces.length;
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
      clearTimeout(timerOffAdmin);
      if (!resolu) {
        resolu = true;
        chargerDepuisCacheAdmin(garderMsg, "Impossible de joindre le serveur.");
      }
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
  var btnVueListe = document.getElementById("btn-vue-liste");
  var btnVueNoeuds = document.getElementById("btn-vue-noeuds");
  var grilleNoeuds = document.getElementById("grille-noeuds-abonnes");
  var wrapTableAbonnes = document.getElementById("wrap-table-abonnes");
  var modeVueAbonnes = "liste";
  try {
    var vSauv = localStorage.getItem("sti-admin-vue-abonnes");
    if (vSauv === "noeuds" || vSauv === "liste") modeVueAbonnes = vSauv;
  } catch (e) {}

  function appliquerModeVueAbonnes(nvMode) {
    modeVueAbonnes = nvMode === "noeuds" ? "noeuds" : "liste";
    try { localStorage.setItem("sti-admin-vue-abonnes", modeVueAbonnes); } catch (e) {}
    if (btnVueListe) btnVueListe.classList.toggle("actif", modeVueAbonnes === "liste");
    if (btnVueNoeuds) btnVueNoeuds.classList.toggle("actif", modeVueAbonnes === "noeuds");
    if (grilleNoeuds) grilleNoeuds.classList.toggle("visible", modeVueAbonnes === "noeuds");
    if (wrapTableAbonnes) wrapTableAbonnes.style.display = modeVueAbonnes === "noeuds" ? "none" : "";
  }
  appliquerModeVueAbonnes(modeVueAbonnes);
  if (btnVueListe) {
    btnVueListe.addEventListener("click", function () {
      appliquerModeVueAbonnes("liste");
      rendAbonnes();
    });
  }
  if (btnVueNoeuds) {
    btnVueNoeuds.addEventListener("click", function () {
      appliquerModeVueAbonnes("noeuds");
      rendAbonnes();
    });
  }

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
    var totalGlobalOn = profils.filter(function (p) { return estEnLigne(p.id); }).length;
    if (selFiltreLycee) {
      var valLycee = selFiltreLycee.value;
      var lycees = obtenirLyceesActifs();
      selFiltreLycee.innerHTML = "<option value='*'>🏛️ Tous les lycées (" + profils.length + " · 🟢 " + totalGlobalOn + ")</option>";
      lycees.forEach(function (ly) {
        var stL = statsPourSelection("*", ly);
        var optL = document.createElement("option");
        optL.value = ly;
        optL.textContent = "🏛️ " + ly + " (" + stL.total + " élève(s) · 🟢 " + stL.enLigne + " en ligne)";
        selFiltreLycee.appendChild(optL);
      });
      if (valLycee && (valLycee === "*" || lycees.indexOf(valLycee) !== -1)) {
        selFiltreLycee.value = valLycee;
      }
    }
    if (!selFiltreClasse) return;
    var valPrec = selFiltreClasse.value;
    var lyActuel = selFiltreLycee ? selFiltreLycee.value : "*";
    var stToutes = statsPourSelection("*", lyActuel);
    var classes = obtenirClassesActives();
    selFiltreClasse.innerHTML = "<option value='*'>🏫 Toutes les classes (" + stToutes.total + " élève(s) · 🟢 " + stToutes.enLigne + " en ligne)</option>";
    classes.forEach(function (cl) {
      var stC = statsPourSelection(cl, lyActuel);
      var opt = document.createElement("option");
      opt.value = cl;
      opt.textContent = "🏫 " + cl + " (" + stC.total + " élève(s) · 🟢 " + stC.enLigne + " en ligne)";
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
  /* ---------- Extraction d'une note sur 20, statistiques par élève & Fiche récapitulative ---------- */
  function extraireNoteSur20(txt) {
    var s = String(txt || "");
    var m20 = s.match(/(\d+(?:[.,]\d+)?)\s*\/\s*20/);
    if (m20) return parseFloat(m20[1].replace(",", "."));
    var mFrac = s.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
    if (mFrac) {
      var den = parseFloat(mFrac[2].replace(",", "."));
      if (den > 0) return (parseFloat(mFrac[1].replace(",", ".")) / den) * 20;
    }
    var mPct = s.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (mPct) return (parseFloat(mPct[1].replace(",", ".")) / 100) * 20;
    return null;
  }

  function statsQuizPourUser(uid) {
    var items = listeResultatsQuiz.filter(function (q) { return q.uid === uid; });
    var notes20 = [];
    items.forEach(function (q) {
      var n = extraireNoteSur20(q.note);
      if (n != null && !isNaN(n)) notes20.push(n);
    });
    var moy = notes20.length
      ? (Math.round((notes20.reduce(function (a, b) { return a + b; }, 0) / notes20.length) * 10) / 10)
      : null;
    return {
      nb: items.length,
      moyenne20: moy,
      items: items
    };
  }

  function modulesConsultesPourUser(uid) {
    var vus = {};
    acces.forEach(function (a) {
      if (a.user_id !== uid) return;
      var pg = String(a.page || "").toLowerCase();
      if (pg.indexOf("html5") !== -1 || pg.indexOf("datalist") !== -1) vus["HTML5"] = true;
      if (pg.indexOf("css") !== -1 || pg.indexOf("positionnement") !== -1) vus["CSS3"] = true;
      if (pg.indexOf("javascript") !== -1) vus["JS"] = true;
      if (pg.indexOf("sql") !== -1) vus["SQL"] = true;
      if (pg.indexOf("php") !== -1) vus["PHP"] = true;
      if (pg.indexOf("exercice") !== -1 || pg.indexOf("fonctions-standards") !== -1) vus["Exercices"] = true;
      if (pg.indexOf("bac-pratique") !== -1 || pg.indexOf("sti0") !== -1) vus["Bac/Projet"] = true;
    });
    return Object.keys(vus);
  }

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
        "Moyenne Quiz (/20)",
        "Nb Quiz passes",
        "Scores Quiz / Bac",
        "Modules consultes",
        "Inscrit le"
      ];
      var lignes = [entetes.join(";")];
      liste.forEach(function (p) {
        var tel = telDeProfil(p);
        var ctc = tel || p.email || "—";
        var scMap = scoresParUser[p.id] || {};
        var scTxt = Object.keys(scMap).map(function (k) { return k + ": " + scMap[k]; }).join(" | ") || "—";
        var stQ = statsQuizPourUser(p.id);
        var mods = modulesConsultesPourUser(p.id).join(", ") || "—";
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
          stQ.moyenne20 != null ? (String(stQ.moyenne20).replace(".", ",") + "/20") : "—",
          stQ.nb,
          scTxt,
          mods,
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
    majFiltreClasses();
    majBandeauEtCompteursClasse();
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
    if (grilleNoeuds) grilleNoeuds.innerHTML = "";
    appliquerModeVueAbonnes(modeVueAbonnes);

    if (!liste.length) {
      var trVide = document.createElement("tr");
      var tdVide = document.createElement("td");
      tdVide.colSpan = 8;
      tdVide.style.cssText = "text-align:center;color:#7a6f5d;padding:18px;";
      tdVide.textContent = "Aucun abonné correspondant à ce filtre.";
      trVide.appendChild(tdVide);
      tb.appendChild(trVide);
      if (grilleNoeuds) {
        var ndVide = document.createElement("div");
        ndVide.style.cssText = "grid-column:1/-1;text-align:center;color:#7a6f5d;padding:22px;background:#fffdf7;border:2px dashed #23201a;border-radius:16px;font-weight:800;";
        ndVide.textContent = "Aucun abonné correspondant à ce filtre.";
        grilleNoeuds.appendChild(ndVide);
      }
      return;
    }

    /* Rendu des Nœuds (Nom, Prénom, Classe, État de l'abonné) */
    if (grilleNoeuds) {
      liste.forEach(function (p) {
        var nd = document.createElement("div");
        var isG = estGold(p);
        var estNdGold = isG && p.statut === "actif";
        nd.className = "noeud-abonne " + (estNdGold ? "nd-gold" : ("nd-" + (p.statut || "en_attente")));
        nd.title = "Cliquer pour ouvrir la fiche récapitulative complète de cet élève";
        nd.addEventListener("click", function () { ouvrirFicheEleve(p); });

        var haut = document.createElement("div");
        haut.className = "noeud-haut";

        var pastille = document.createElement("div");
        pastille.className = "noeud-pastille";
        var ini = (
          ((p.prenom || "").trim().charAt(0) || "") +
          ((p.nom || "").trim().charAt(0) || "")
        ).toUpperCase();
        if (!ini) ini = (contact(p).replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "ST").toUpperCase();
        pastille.textContent = ini;
        if (estEnLigne(p.id)) {
          var ptOn = document.createElement("span");
          ptOn.className = "point-online";
          ptOn.title = "En ligne maintenant";
          pastille.appendChild(ptOn);
        }

        var idBox = document.createElement("div");
        idBox.className = "noeud-identite";
        var divNom = document.createElement("div");
        divNom.className = "noeud-nom";
        var np = nomPrenomTexte(p);
        divNom.textContent = np || contact(p);
        var divSub = document.createElement("div");
        divSub.className = "noeud-sub";
        divSub.textContent = (p.nom || p.prenom)
          ? ("Nom : " + (p.nom || "—") + " · Prénom : " + (p.prenom || "—"))
          : contact(p);
        idBox.append(divNom, divSub);
        haut.append(pastille, idBox);

        var meta = document.createElement("div");
        meta.className = "noeud-meta";
        var spCl = document.createElement("span");
        spCl.className = "noeud-classe";
        spCl.textContent = "🏫 " + (p.classe || "—");
        spCl.title = "Lycée : " + lyceePropre(p) + " — Cliquer pour modifier";
        spCl.addEventListener("click", function (e) {
          e.stopPropagation();
          ouvrirAffectation(p);
        });

        var spEtat = document.createElement("span");
        if (estNdGold) {
          spEtat.className = "st gold";
          spEtat.textContent = "👑 Gold";
        } else {
          spEtat.className = "st " + (p.statut || "en_attente");
          spEtat.textContent = LIB[p.statut] || p.statut;
        }
        meta.append(spCl, spEtat);

        if (estEnLigne(p.id)) {
          var bOnNd = document.createElement("span");
          bOnNd.className = "badge-online";
          bOnNd.style.marginLeft = "0";
          var pgOnNd = (enLigneMap[p.id] && enLigneMap[p.id].page) || "site";
          bOnNd.textContent = "🟢 En ligne (" + pgOnNd + ")";
          meta.appendChild(bOnNd);
        }

        var barreAct = document.createElement("div");
        barreAct.className = "noeud-actions";
        function btnNd(txt, fn, cls, tit) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "act" + (cls ? " " + cls : "");
          b.textContent = txt;
          if (tit) b.title = tit;
          b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
          barreAct.appendChild(b);
        }
        btnNd("📊", function () { ouvrirFicheEleve(p); }, "", "Ouvrir la fiche bilan complète de l'élève");
        btnNd("📩", function () { ouvrirMessageCandidat(p, ""); }, "", "Envoyer un message personnel à ce candidat");
        if (p.statut !== "actif") {
          btnNd("✅", function () { changeStatut(p, "actif"); }, "", "Activer l'abonné");
        }
        btnNd("👑", function () { basculerGold(p); }, isG ? "gold-on" : "", isG ? "Retirer Gold" : "Accorder Gold");
        btnNd("✏️", function () { ouvrirAffectation(p); }, "", "Modifier Nom, Prénom, Lycée ou Classe");
        if (p.statut !== "exclu") {
          btnNd("⛔", function () { changeStatut(p, "exclu"); }, "", "Exclure");
        }
        btnNd("🗑️", function () { supprime(p); }, "del", "Supprimer");

        nd.append(haut, meta, barreAct);
        grilleNoeuds.appendChild(nd);
      });
    }

    var classesDispo = obtenirClassesActives();
    liste.forEach(function (p) {
      var tr = document.createElement("tr");
      var estLigneGold = estGold(p) && p.statut === "actif";
      tr.className = estLigneGold ? "row-gold" : ("row-" + (p.statut || "en_attente"));
      tr.title = "Cliquer pour voir toutes ses connexions et durées par semaine";
      tr.addEventListener("click", function () { detail(p); });

      /* Colonne 1 : Nom & Prénom (cliquable pour ouvrir la Fiche Élève) + en ligne + scores quiz */
      var tdNom = document.createElement("td");
      tdNom.style.fontWeight = "800";
      var ligneIdentite = document.createElement("div");
      var npTxt = nomPrenomTexte(p);
      var spNom = document.createElement("span");
      spNom.className = "nom-cliquable-fiche";
      spNom.title = "Cliquer pour ouvrir la fiche récapitulative complète de cet élève";
      spNom.textContent = npTxt ? ("👤 " + npTxt) : "👤 Non renseigné";
      if (!npTxt) spNom.style.cssText = "color:#7a6f5d;font-weight:700;font-size:12px;";
      spNom.addEventListener("click", function (e) {
        e.stopPropagation();
        ouvrirFicheEleve(p);
      });
      ligneIdentite.appendChild(spNom);
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
        bouton("📊", function () { ouvrirFicheEleve(p); }, "", "Ouvrir la fiche récapitulative complète de l'élève");
        bouton("📩", function () { ouvrirMessageCandidat(p, ""); }, "", "Envoyer un message personnel ou répondre à ce candidat");
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

  /* ---------- Point 5 : Tableau des résultats Quiz & Atelier Bac Pratique (Filtre classe + Export CSV + 5 premiers + Voir plus + Effacer par mois) ---------- */
  var toutVoirQuiz = false;
  var wrapVoirPlusQuiz = document.getElementById("wrap-voir-plus-quiz");
  var btnVoirPlusQuiz = document.getElementById("btn-voir-plus-quiz");
  var selFiltreQuizClasse = document.getElementById("filtre-quiz-classe");
  var btnExportQuizCsv = document.getElementById("btn-export-quiz-csv");

  if (btnVoirPlusQuiz) {
    btnVoirPlusQuiz.addEventListener("click", function () {
      toutVoirQuiz = !toutVoirQuiz;
      rendQuiz();
    });
  }
  if (selFiltreQuizClasse) {
    selFiltreQuizClasse.addEventListener("change", function () {
      toutVoirQuiz = false;
      rendQuiz();
    });
  }

  function obtenirQuizFiltres() {
    var mapProf = {};
    profils.forEach(function (p) { mapProf[p.id] = p; });
    var clFiltre = selFiltreQuizClasse ? selFiltreQuizClasse.value : "*";
    if (!clFiltre || clFiltre === "*") return listeResultatsQuiz.slice();
    return listeResultatsQuiz.filter(function (q) {
      var p = mapProf[q.uid];
      return p && (p.classe || "—") === clFiltre;
    });
  }

  function majOptionsFiltreQuizClasse() {
    if (!selFiltreQuizClasse) return;
    var valAct = selFiltreQuizClasse.value || "*";
    var classes = obtenirClassesActives();
    selFiltreQuizClasse.innerHTML = '<option value="*">🏫 Toutes les classes</option>';
    classes.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = "🏫 " + c;
      if (c === valAct) opt.selected = true;
      selFiltreQuizClasse.appendChild(opt);
    });
  }

  if (btnExportQuizCsv) {
    btnExportQuizCsv.addEventListener("click", function () {
      var items = obtenirQuizFiltres();
      if (!items.length) {
        msg("⚠️ Aucun résultat de Quiz / Bac à exporter pour cette sélection.", "err");
        return;
      }
      var mapProf = {};
      profils.forEach(function (p) { mapProf[p.id] = p; });
      var entetes = ["Date", "Nom", "Prenom", "Contact", "Lycee", "Classe", "Epreuve / Quiz", "Score / Note", "Note sur 20"];
      var lignes = [entetes.join(";")];
      items.forEach(function (q) {
        var p = mapProf[q.uid];
        var n20 = extraireNoteSur20(q.note);
        var cols = [
          fmtDate(q.ts),
          p ? (p.nom || "—").trim() : "—",
          p ? (p.prenom || "—").trim() : "—",
          p ? (telDeProfil(p) || p.email || "—") : q.uid,
          p ? lyceePropre(p) : "—",
          p ? (p.classe || "—") : "—",
          q.quiz || q.nomQ || "Quiz",
          q.note || "—",
          n20 != null ? String(Math.round(n20 * 10) / 10).replace(".", ",") : "—"
        ].map(function (v) {
          return '"' + String(v).replace(/"/g, '""') + '"';
        });
        lignes.push(cols.join(";"));
      });
      var blob = new Blob(["\uFEFF" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      var clNom = (selFiltreQuizClasse && selFiltreQuizClasse.value !== "*") ? selFiltreQuizClasse.value.replace(/\s+/g, "_") : "toutes_classes";
      a.href = url;
      a.download = "STI_V2_notes_quiz_" + clNom + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      msg("📥 Notes exportées en Excel (CSV) : " + items.length + " résultat(s).", "ok");
    });
  }

  function rendQuiz() {
    var tb = document.getElementById("tb-quiz");
    if (!tb) return;
    majOptionsFiltreQuizClasse();
    tb.innerHTML = "";
    var mapProf = {};
    profils.forEach(function (p) { mapProf[p.id] = p; });
    var filtresQ = obtenirQuizFiltres();
    var totalQ = filtresQ.length;
    if (!totalQ) {
      if (wrapVoirPlusQuiz) wrapVoirPlusQuiz.style.display = "none";
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 5;
      td0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      td0.textContent = "Aucun score de quiz ou d'atelier Bac Pratique enregistré pour cette sélection.";
      tr0.appendChild(td0);
      tb.appendChild(tr0);
      return;
    }
    var limQ = toutVoirQuiz ? totalQ : 5;
    filtresQ.slice(0, limQ).forEach(function (q) {
      var p = mapProf[q.uid];
      var tr = document.createElement("tr");
      var nomEl = p ? contact(p) : q.uid;
      var clEl = p ? (lyceePropre(p) + " · " + (p.classe || "—")) : "—";
      [nomEl, clEl, "🏆 " + q.quiz, q.note, fmtDate(q.ts)].forEach(function (v, idx) {
        var td = document.createElement("td");
        if (idx === 0 || idx === 3) td.style.fontWeight = "800";
        if (idx === 3) td.style.color = "#177245";
        if (idx === 0 && p) {
          td.className = "nom-cliquable-fiche";
          td.title = "Cliquer pour ouvrir la fiche récapitulative de cet élève";
          td.addEventListener("click", function () { ouvrirFicheEleve(p); });
        }
        td.textContent = v;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    if (wrapVoirPlusQuiz && btnVoirPlusQuiz) {
      if (totalQ > 5) {
        wrapVoirPlusQuiz.style.display = "block";
        btnVoirPlusQuiz.textContent = toutVoirQuiz
          ? "➖ Voir moins (afficher les 5 premiers)"
          : ("➕ Voir plus (" + (totalQ - 5) + " autre(s) résultat(s))");
      } else {
        wrapVoirPlusQuiz.style.display = "none";
      }
    }
  }

  /* ---------- Fiche récapitulative complète par élève (#modal-fiche-eleve) ---------- */
  var modalFicheEleve = document.getElementById("modal-fiche-eleve");
  var contenuFicheEleve = document.getElementById("contenu-fiche-eleve");
  var btnFermerFiche = document.getElementById("btn-fermer-fiche");
  var btnFermerFicheX = document.getElementById("btn-fermer-fiche-x");
  var btnModifierDepuisFiche = document.getElementById("btn-modifier-depuis-fiche");
  var btnImprimerFiche = document.getElementById("btn-imprimer-fiche");
  var btnExportFicheCsv = document.getElementById("btn-export-fiche-csv");
  var eleveFicheActif = null;

  function echHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function collecterMessagesEleve(uid) {
    var res = [];
    messagesDiffuses.forEach(function (m) {
      var estPerso = (m.uid && m.uid === uid) || m.classe === ("UID:" + uid);
      var luTs = lecturesParMsg[m.id] && lecturesParMsg[m.id][uid];
      var rep = reponsesParMsg[m.id] && reponsesParMsg[m.id][uid];
      if (estPerso || luTs || rep) {
        res.push({
          type: estPerso ? (m.enReponseA ? "↩️ Réponse du prof" : "📩 Message perso") : "📢 Message diffusé",
          sujet: (m.texte || "").slice(0, 70),
          reponse: rep || (luTs ? "✓ Lu" : "⏳ En attente de lecture"),
          ts: luTs || m.ts
        });
      }
    });
    questionsLibres.forEach(function (ql) {
      if (ql.uid === uid) {
        res.push({
          type: "💬 Question spontanée",
          sujet: "Message envoyé au professeur",
          reponse: ql.reponse || "—",
          ts: ql.ts
        });
      }
    });
    return res;
  }

  function ouvrirFicheEleve(p) {
    if (!p || !modalFicheEleve || !contenuFicheEleve) return;
    eleveFicheActif = p;
    var ini = (
      ((p.prenom || "").trim().charAt(0) || "") +
      ((p.nom || "").trim().charAt(0) || "")
    ).toUpperCase() || "ST";
    var np = nomPrenomTexte(p) || contact(p);
    var tel = telDeProfil(p);
    var ctc = tel ? ("📱 " + tel + " (Code WhatsApp : " + codeWa(tel) + ")") : ("✉️ " + (p.email || "—"));
    var isG = estGold(p);
    var onL = estEnLigne(p.id);
    var secSem = dureePourAbonne(p.id);
    var secTot = dureesTotales[p.id] || 0;
    var nbCon = counts[p.id] || 0;
    var stQ = statsQuizPourUser(p.id);
    var mods = modulesConsultesPourUser(p.id);
    var msgsEl = collecterMessagesEleve(p.id);
    var sesAcces = acces.filter(function (a) { return a.user_id === p.id; });

    var badgeStatut = isG && p.statut === "actif"
      ? "<span class='st gold'>👑 Compte Gold</span>"
      : ("<span class='st " + echHtml(p.statut || "en_attente") + "'>" + echHtml(LIB[p.statut] || p.statut) + "</span>");
    var badgeOnline = onL
      ? "<span class='badge-online'>🟢 En ligne (" + echHtml((enLigneMap[p.id] && enLigneMap[p.id].page) || "site") + ")</span>"
      : "<span style='font-size:11px;color:#7a6f5d;font-weight:800'>⚪ Hors ligne</span>";

    var htmlMods = mods.length
      ? mods.map(function (m) {
          return "<span style='display:inline-block;padding:2px 7px;margin:2px;border-radius:999px;border:1.5px solid #23201a;background:#e3f6e8;color:#177245;font-size:10.5px;font-weight:900'>" + echHtml(m) + " ✔</span>";
        }).join("")
      : "<span style='color:#7a6f5d;font-size:11px'>Aucun cours consulté</span>";

    /* Tableau des Quiz */
    var htmlQuiz = "";
    if (!stQ.items.length) {
      htmlQuiz = "<div style='color:#7a6f5d;font-size:12px;padding:8px 0'>Aucun quiz ou atelier Bac Pratique enregistré pour cet élève.</div>";
    } else {
      htmlQuiz = "<table class='fiche-mini-table'><thead><tr><th>Épreuve / Quiz</th><th>Score / Note</th><th>Date</th></tr></thead><tbody>" +
        stQ.items.slice(0, 12).map(function (q) {
          return "<tr><td><b>🏆 " + echHtml(q.quiz || q.nomQ) + "</b></td><td style='color:#177245;font-weight:900'>" + echHtml(q.note) + "</td><td>" + echHtml(fmtDate(q.ts)) + "</td></tr>";
        }).join("") +
        "</tbody></table>";
    }

    /* Tableau des 10 dernières connexions / pages */
    var htmlAcces = "";
    if (!sesAcces.length) {
      htmlAcces = "<div style='color:#7a6f5d;font-size:12px;padding:8px 0'>Aucune connexion enregistrée.</div>";
    } else {
      htmlAcces = "<table class='fiche-mini-table'><thead><tr><th>Date &amp; Heure</th><th>Durée</th><th>Page consultée</th><th>Lieu</th></tr></thead><tbody>" +
        sesAcces.slice(0, 10).map(function (a) {
          return "<tr><td>" + echHtml(fmtDate(a.debut)) + "</td><td><b>" + echHtml(fmtDuree(dureeLigne(a))) + "</b></td><td>" + echHtml(a.page || "—") + "</td><td>" + echHtml(a.lieu || "—") + "</td></tr>";
        }).join("") +
        "</tbody></table>";
    }

    /* Tableau des messages lus & réponses */
    var htmlMsgs = "";
    if (!msgsEl.length) {
      htmlMsgs = "<div style='color:#7a6f5d;font-size:12px;padding:8px 0'>Aucun message lu ni question envoyée pour le moment.</div>";
    } else {
      htmlMsgs = "<table class='fiche-mini-table'><thead><tr><th>Type</th><th>Message</th><th>Réponse / État</th><th>Date</th></tr></thead><tbody>" +
        msgsEl.slice(0, 8).map(function (m) {
          return "<tr><td><b>" + echHtml(m.type) + "</b></td><td>" + echHtml(m.sujet) + "</td><td style='color:#177245;font-weight:800'>" + echHtml(m.reponse) + "</td><td>" + echHtml(fmtDate(m.ts)) + "</td></tr>";
        }).join("") +
        "</tbody></table>";
    }

    contenuFicheEleve.innerHTML =
      "<div class='fiche-entete'>" +
        "<div style='display:flex;align-items:center;gap:12px;min-width:0'>" +
          "<div class='fiche-avatar'>" + echHtml(ini) + "</div>" +
          "<div style='min-width:0'>" +
            "<div style='font-size:16px;font-weight:900;color:#23201a'>" + echHtml(np) + "</div>" +
            "<div style='font-size:12px;color:#5a5244;font-weight:800'>🏛️ " + echHtml(lyceePropre(p)) + " · 🏫 <b>" + echHtml(p.classe || "—") + "</b></div>" +
            "<div style='font-size:11.5px;color:#7a6f5d;font-weight:700;margin-top:2px'>" + echHtml(ctc) + " · Inscrit le " + echHtml(fmtDate(p.cree_le)) + "</div>" +
          "</div>" +
        "</div>" +
        "<div style='display:flex;flex-direction:column;align-items:flex-end;gap:5px'>" +
          badgeStatut +
          badgeOnline +
        "</div>" +
      "</div>" +
      "<div class='fiche-kpis'>" +
        "<div class='fiche-kpi'><small>⏱️ Temps (période)</small><b style='color:#d84315'>" + echHtml(fmtDureeCumul(secSem)) + "</b><span>Cumul total : " + echHtml(fmtDureeCumul(secTot)) + " (" + nbCon + " sess.)</span></div>" +
        "<div class='fiche-kpi'><small>🏆 Moyenne Quiz / Bac</small><b style='color:#177245'>" + (stQ.moyenne20 != null ? (stQ.moyenne20 + " / 20") : "—") + "</b><span>" + stQ.nb + " épreuve(s) passée(s)</span></div>" +
        "<div class='fiche-kpi'><small>📚 Modules consultés</small><b>" + mods.length + " module(s)</b><div style='margin-top:3px'>" + htmlMods + "</div></div>" +
        "<div class='fiche-kpi'><small>💬 Suivi messages</small><b>" + msgsEl.length + " interaction(s)</b><span>Lectures &amp; réponses au prof</span></div>" +
      "</div>" +
      "<div class='fiche-sec-titre'>🏆 Notes des Quiz &amp; Atelier Bac Pratique (" + stQ.nb + ")</div>" +
      htmlQuiz +
      "<div class='fiche-sec-titre'>🕒 10 dernières connexions &amp; pages consultées (sur " + nbCon + ")</div>" +
      htmlAcces +
      "<div class='fiche-sec-titre'>💬 Messages lus &amp; questions de l'élève (" + msgsEl.length + ")</div>" +
      htmlMsgs;

    modalFicheEleve.classList.add("visible");
  }

  function fermerFicheEleve() {
    if (modalFicheEleve) modalFicheEleve.classList.remove("visible");
  }
  if (btnFermerFiche) btnFermerFiche.addEventListener("click", fermerFicheEleve);
  if (btnFermerFicheX) btnFermerFicheX.addEventListener("click", fermerFicheEleve);
  if (modalFicheEleve) {
    modalFicheEleve.addEventListener("click", function (e) {
      if (e.target === modalFicheEleve) fermerFicheEleve();
    });
  }
  var btnMsgDepuisFiche = document.getElementById("btn-msg-depuis-fiche");
  if (btnMsgDepuisFiche) {
    btnMsgDepuisFiche.addEventListener("click", function () {
      if (!eleveFicheActif) return;
      var pCible = eleveFicheActif;
      fermerFicheEleve();
      ouvrirMessageCandidat(pCible, "");
    });
  }
  if (btnModifierDepuisFiche) {
    btnModifierDepuisFiche.addEventListener("click", function () {
      if (!eleveFicheActif) return;
      fermerFicheEleve();
      ouvrirAffectation(eleveFicheActif);
    });
  }
  if (btnImprimerFiche) {
    btnImprimerFiche.addEventListener("click", function () {
      window.print();
    });
  }
  if (btnExportFicheCsv) {
    btnExportFicheCsv.addEventListener("click", function () {
      var p = eleveFicheActif;
      if (!p) return;
      var stQ = statsQuizPourUser(p.id);
      var mods = modulesConsultesPourUser(p.id);
      var sesAcces = acces.filter(function (a) { return a.user_id === p.id; });
      var lignes = [
        '"Champ";"Valeur"',
        '"Nom";"' + String(p.nom || "—").replace(/"/g, '""') + '"',
        '"Prenom";"' + String(p.prenom || "—").replace(/"/g, '""') + '"',
        '"Contact";"' + String(telDeProfil(p) || p.email || "—").replace(/"/g, '""') + '"',
        '"Lycee";"' + String(lyceePropre(p)).replace(/"/g, '""') + '"',
        '"Classe";"' + String(p.classe || "—").replace(/"/g, '""') + '"',
        '"Statut";"' + String(LIB[p.statut] || p.statut).replace(/"/g, '""') + '"',
        '"Compte Gold";"' + (estGold(p) ? "OUI" : "NON") + '"',
        '"Duree periode";"' + fmtDureeCumul(dureePourAbonne(p.id)) + '"',
        '"Duree cumulee";"' + fmtDureeCumul(dureesTotales[p.id] || 0) + '"',
        '"Moyenne Quiz (/20)";"' + (stQ.moyenne20 != null ? String(stQ.moyenne20).replace(".", ",") : "—") + '"',
        '"Modules consultes";"' + mods.join(", ") + '"',
        "",
        '"=== NOTES QUIZ & BAC PRATIQUE ===";"Score";"Date"'
      ];
      stQ.items.forEach(function (q) {
        lignes.push('"' + String(q.quiz || q.nomQ).replace(/"/g, '""') + '";"' + String(q.note).replace(/"/g, '""') + '";"' + fmtDate(q.ts) + '"');
      });
      lignes.push("");
      lignes.push('"=== CONNEXIONS & PAGES CONSULTEES ===";"Duree";"Page";"Lieu"');
      sesAcces.slice(0, 50).forEach(function (a) {
        lignes.push('"' + fmtDate(a.debut) + '";"' + fmtDuree(dureeLigne(a)) + '";"' + String(a.page || "—").replace(/"/g, '""') + '";"' + String(a.lieu || "—").replace(/"/g, '""') + '"');
      });
      var blob = new Blob(["\uFEFF" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      var slug = (nomPrenomTexte(p) || contact(p)).replace(/[^a-zA-Z0-9_-]+/g, "_");
      a.href = url;
      a.download = "Fiche_Eleve_" + slug + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      msg("📥 Bilan individuel exporté en Excel (CSV).", "ok");
    });
  }

  /* ---------- Suppression des résultats Quiz & Bac Pratique par mois cible ---------- */
  var btnOuvrirPurgeQuiz = document.getElementById("btn-ouvrir-purge-quiz");
  var modalPurgeQuiz = document.getElementById("modal-purge-quiz");
  var selMoisPurgeQuiz = document.getElementById("sel-mois-purge-quiz");
  var resumePurgeQuiz = document.getElementById("resume-purge-quiz");
  var btnAnnulerPurgeQuiz = document.getElementById("btn-annuler-purge-quiz");
  var btnConfirmerPurgeQuiz = document.getElementById("btn-confirmer-purge-quiz");

  function quizDuMois(ym) {
    if (!ym || ym === "*") return listeResultatsQuiz.slice();
    return listeResultatsQuiz.filter(function (q) { return cleMois(q.ts) === ym; });
  }

  function majResumePurgeQuiz() {
    if (!selMoisPurgeQuiz || !resumePurgeQuiz) return;
    var ym = selMoisPurgeQuiz.value || "*";
    var nb = quizDuMois(ym).length;
    var lib = ym === "*" ? "Tous les mois" : libelleMois(ym);
    resumePurgeQuiz.innerHTML =
      "<span>📅 <strong>" + lib + "</strong></span>" +
      "<span style='color:#c0392b'>🗑️ <strong>" + nb + " résultat(s)</strong> à supprimer</span>";
  }

  function remplirMoisPurgeQuiz() {
    if (!selMoisPurgeQuiz) return;
    var mapMois = {};
    var now = new Date();
    for (var k = 0; k < 6; k++) {
      var dRef = new Date(now.getFullYear(), now.getMonth() - k, 1);
      var ymRef = dRef.getFullYear() + "-" + String(dRef.getMonth() + 1).padStart(2, "0");
      mapMois[ymRef] = 0;
    }
    listeResultatsQuiz.forEach(function (q) {
      var ym = cleMois(q.ts);
      mapMois[ym] = (mapMois[ym] || 0) + 1;
    });
    var listeMois = Object.keys(mapMois).sort().reverse();
    selMoisPurgeQuiz.innerHTML = "";
    var premierAvecDonnees = "";
    listeMois.forEach(function (ym) {
      var nb = mapMois[ym] || 0;
      if (!premierAvecDonnees && nb > 0) premierAvecDonnees = ym;
      var opt = document.createElement("option");
      opt.value = ym;
      opt.textContent = "📅 " + libelleMois(ym) + " (" + nb + " résultat(s))";
      selMoisPurgeQuiz.appendChild(opt);
    });
    var optTous = document.createElement("option");
    optTous.value = "*";
    optTous.textContent = "🗓️ Tous les mois — Tout effacer (" + listeResultatsQuiz.length + " résultat(s))";
    selMoisPurgeQuiz.appendChild(optTous);

    if (premierAvecDonnees) selMoisPurgeQuiz.value = premierAvecDonnees;
    majResumePurgeQuiz();
  }

  if (btnOuvrirPurgeQuiz) {
    btnOuvrirPurgeQuiz.addEventListener("click", function () {
      remplirMoisPurgeQuiz();
      if (modalPurgeQuiz) modalPurgeQuiz.classList.add("visible");
    });
  }
  if (selMoisPurgeQuiz) {
    selMoisPurgeQuiz.addEventListener("change", majResumePurgeQuiz);
  }
  if (btnAnnulerPurgeQuiz) {
    btnAnnulerPurgeQuiz.addEventListener("click", function () {
      if (modalPurgeQuiz) modalPurgeQuiz.classList.remove("visible");
    });
  }
  if (btnConfirmerPurgeQuiz) {
    btnConfirmerPurgeQuiz.addEventListener("click", function () {
      var ym = selMoisPurgeQuiz ? selMoisPurgeQuiz.value : "*";
      var cibles = quizDuMois(ym);
      var lib = ym === "*" ? "tous les mois" : libelleMois(ym);
      if (!cfgEcoles.purgesQuizMois || typeof cfgEcoles.purgesQuizMois !== "object") {
        cfgEcoles.purgesQuizMois = {};
      }
      cfgEcoles.purgesQuizMois[ym] = Date.now();
      sauvegarderCfgEcoles();

      var ids = cibles.map(function (q) { return q.id; }).filter(Boolean);
      listeResultatsQuiz = listeResultatsQuiz.filter(function (q) {
        return ym === "*" ? false : (cleMois(q.ts) !== ym);
      });

      /* Recalcul immédiat des badges de scores par élève */
      scoresParUser = {};
      listeResultatsQuiz.forEach(function (q) {
        var cleQ = q.nomQ || q.quiz;
        if (!scoresParUser[q.uid]) scoresParUser[q.uid] = {};
        if (!scoresParUser[q.uid][cleQ]) scoresParUser[q.uid][cleQ] = q.note;
      });

      try {
        var cLoc = JSON.parse(localStorage.getItem("sti-admin-cache") || "null");
        if (cLoc && Array.isArray(cLoc.tousAcces)) {
          var mapIds = {};
          ids.forEach(function (id) { mapIds[id] = true; });
          cLoc.tousAcces = cLoc.tousAcces.filter(function (a) { return !mapIds[a.id]; });
          localStorage.setItem("sti-admin-cache", JSON.stringify(cLoc));
        }
      } catch (e) {}

      if (modalPurgeQuiz) modalPurgeQuiz.classList.remove("visible");
      rendQuiz();
      rendAbonnes();

      if (ids.length && navigator.onLine) {
        sb.from("acces").update({ page: "SUPPR_ACCES" }).in("id", ids).then(function () {});
        sb.from("acces").delete().in("id", ids).then(function () {});
      }
      msg("🗑️ " + cibles.length + " résultat(s) de Quiz / Bac de " + lib + " supprimé(s).", "ok");
    });
  }

  /* ---------- Suppression du Suivi de lecture des messages & réponses (par message cible) ---------- */
  var btnOuvrirPurgeMsg = document.getElementById("btn-ouvrir-purge-msg");
  var modalPurgeMsg = document.getElementById("modal-purge-msg");
  var selCiblePurgeMsg = document.getElementById("sel-cible-purge-msg");
  var resumePurgeMsg = document.getElementById("resume-purge-msg");
  var btnAnnulerPurgeMsg = document.getElementById("btn-annuler-purge-msg");
  var btnConfirmerPurgeMsg = document.getElementById("btn-confirmer-purge-msg");

  function majResumePurgeMsg() {
    if (!selCiblePurgeMsg || !resumePurgeMsg) return;
    var val = selCiblePurgeMsg.value || "";
    if (!val) {
      resumePurgeMsg.innerHTML = "<span>Aucun message à supprimer.</span>";
      return;
    }
    if (val === "*") {
      resumePurgeMsg.innerHTML =
        "<span>🗓️ <strong>Tous les messages &amp; questions</strong></span>" +
        "<span style='color:#c0392b'>🗑️ <strong>" + messagesDiffuses.length + " message(s) + " + questionsLibres.length + " question(s)</strong></span>";
      return;
    }
    if (val === "__libre") {
      resumePurgeMsg.innerHTML =
        "<span>💬 <strong>Questions spontanées des élèves</strong></span>" +
        "<span style='color:#c0392b'>🗑️ <strong>" + questionsLibres.length + " question(s)</strong> à supprimer</span>";
      return;
    }
    var mTrouve = null;
    messagesDiffuses.forEach(function (m) { if (m.id === val) mTrouve = m; });
    var nbLu = Object.keys(lecturesParMsg[val] || {}).length;
    var nbRep = Object.keys(reponsesParMsg[val] || {}).length;
    var libCl = mTrouve ? (mTrouve.classe === "*" ? "Toutes les classes" : mTrouve.classe) : "Message";
    resumePurgeMsg.innerHTML =
      "<span>📨 <strong>" + libCl + "</strong></span>" +
      "<span style='color:#c0392b'>🗑️ Supprimer ce message (" + nbLu + " lu(s) · " + nbRep + " réponse(s))</span>";
  }

  function remplirCiblesPurgeMsg() {
    if (!selCiblePurgeMsg) return;
    selCiblePurgeMsg.innerHTML = "";
    messagesDiffuses.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m.id;
      var libCl = m.classe === "*" ? "Toutes les classes" : m.classe;
      var court = (m.texte || "").replace(/\s+/g, " ").slice(0, 44);
      var nbL = Object.keys(lecturesParMsg[m.id] || {}).length;
      opt.textContent = "📨 [" + libCl + " · " + fmtDate(m.ts) + "] « " + court + ((m.texte || "").length > 44 ? "…" : "") + " » (" + nbL + " lu)";
      selCiblePurgeMsg.appendChild(opt);
    });
    var optLibre = document.createElement("option");
    optLibre.value = "__libre";
    optLibre.textContent = "💬 Questions spontanées des élèves (" + questionsLibres.length + " question(s))";
    selCiblePurgeMsg.appendChild(optLibre);

    var optTous = document.createElement("option");
    optTous.value = "*";
    optTous.textContent = "🗓️ Tous les messages diffusés & questions — Tout effacer (" + messagesDiffuses.length + " msg)";
    selCiblePurgeMsg.appendChild(optTous);

    if (selSuiviMsg && selSuiviMsg.value) {
      selCiblePurgeMsg.value = selSuiviMsg.value;
    }
    majResumePurgeMsg();
  }

  if (btnOuvrirPurgeMsg) {
    btnOuvrirPurgeMsg.addEventListener("click", function () {
      remplirCiblesPurgeMsg();
      if (modalPurgeMsg) modalPurgeMsg.classList.add("visible");
    });
  }
  if (selCiblePurgeMsg) {
    selCiblePurgeMsg.addEventListener("change", majResumePurgeMsg);
  }
  if (btnAnnulerPurgeMsg) {
    btnAnnulerPurgeMsg.addEventListener("click", function () {
      if (modalPurgeMsg) modalPurgeMsg.classList.remove("visible");
    });
  }
  if (btnConfirmerPurgeMsg) {
    btnConfirmerPurgeMsg.addEventListener("click", function () {
      var cible = selCiblePurgeMsg ? selCiblePurgeMsg.value : "";
      if (!cible) return;
      if (!cfgEcoles.purgesMsg || typeof cfgEcoles.purgesMsg !== "object") {
        cfgEcoles.purgesMsg = {};
      }
      var nowMs = Date.now();
      cfgEcoles.purgesMsg[cible] = nowMs;
      if (cible === "__libre") cfgEcoles.purgesMsg["libre"] = nowMs;

      var ids = [];
      if (cible === "*") {
        Object.keys(idsAccesParMsg).forEach(function (k) {
          ids = ids.concat(idsAccesParMsg[k] || []);
        });
        messagesDiffuses = [];
        lecturesParMsg = {};
        reponsesParMsg = {};
        questionsLibres = [];
        idsAccesParMsg = {};
      } else if (cible === "__libre") {
        ids = (idsAccesParMsg["__libre"] || []).slice();
        questionsLibres = [];
        delete idsAccesParMsg["__libre"];
      } else {
        ids = (idsAccesParMsg[cible] || []).slice();
        messagesDiffuses = messagesDiffuses.filter(function (m) { return m.id !== cible; });
        delete lecturesParMsg[cible];
        delete reponsesParMsg[cible];
        delete idsAccesParMsg[cible];
      }

      sauvegarderCfgEcoles();

      try {
        var cLoc = JSON.parse(localStorage.getItem("sti-admin-cache") || "null");
        if (cLoc && Array.isArray(cLoc.tousAcces) && ids.length) {
          var mapIds = {};
          ids.forEach(function (id) { mapIds[id] = true; });
          cLoc.tousAcces = cLoc.tousAcces.filter(function (a) { return !mapIds[a.id]; });
          localStorage.setItem("sti-admin-cache", JSON.stringify(cLoc));
        }
      } catch (e) {}

      if (modalPurgeMsg) modalPurgeMsg.classList.remove("visible");
      rendSuiviMessages();

      if (ids.length && navigator.onLine) {
        sb.from("acces").update({ page: "SUPPR_ACCES" }).in("id", ids).then(function () {});
        sb.from("acces").delete().in("id", ids).then(function () {});
      }
      msg("🗑️ Suivi du message sélectionné effacé avec succès.", "ok");
    });
  }

  var toutVoirAcces = false;
  var toutVoirSuivi = false;
  var wrapVoirPlusAcces = document.getElementById("wrap-voir-plus-acces");
  var btnVoirPlusAcces = document.getElementById("btn-voir-plus-acces");
  var wrapVoirPlusSuivi = document.getElementById("wrap-voir-plus-suivi");
  var btnVoirPlusSuivi = document.getElementById("btn-voir-plus-suivi");

  if (btnVoirPlusAcces) {
    btnVoirPlusAcces.addEventListener("click", function () {
      toutVoirAcces = !toutVoirAcces;
      rendAcces();
    });
  }
  if (btnVoirPlusSuivi) {
    btnVoirPlusSuivi.addEventListener("click", function () {
      toutVoirSuivi = !toutVoirSuivi;
      afficherTableauSuivi();
    });
  }

  function cleMois(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    return d.getFullYear() + "-" + m;
  }

  var NOMS_MOIS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  function libelleMois(ym) {
    if (!ym || ym === "*") return "Tous les mois";
    var parts = String(ym).split("-");
    var an = parts[0] || "";
    var idx = parseInt(parts[1], 10) - 1;
    var nom = NOMS_MOIS[idx] || ym;
    return nom + " " + an;
  }

  function rendAcces() {
    var emails = {};
    profils.forEach(function (p) { emails[p.id] = contact(p); });
    var ta = document.getElementById("tb-acces");
    ta.innerHTML = "";
    var totalA = acces.length;
    if (!totalA) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 5;
      td0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      td0.textContent = "Aucune connexion enregistrée.";
      tr0.appendChild(td0);
      ta.appendChild(tr0);
    }
    var limiteA = toutVoirAcces ? totalA : 5;
    acces.slice(0, limiteA).forEach(function (a) {
      var tr = document.createElement("tr");
      [emails[a.user_id] || a.user_id, fmtDate(a.debut), fmtDuree(dureeLigne(a)), a.lieu || "—", a.page || "—"].forEach(function (v) {
        var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
      });
      ta.appendChild(tr);
    });
    if (wrapVoirPlusAcces && btnVoirPlusAcces) {
      if (totalA > 5) {
        wrapVoirPlusAcces.style.display = "block";
        btnVoirPlusAcces.textContent = toutVoirAcces
          ? "➖ Voir moins (afficher les 5 premiers)"
          : ("➕ Voir plus (" + (totalA - 5) + " autre(s) connexion(s))");
      } else {
        wrapVoirPlusAcces.style.display = "none";
      }
    }
  }

  /* ---------- Suppression des Dernières connexions par mois cible ---------- */
  var btnOuvrirPurgeAcces = document.getElementById("btn-ouvrir-purge-acces");
  var modalPurgeAcces = document.getElementById("modal-purge-acces");
  var selMoisPurge = document.getElementById("sel-mois-purge");
  var resumePurgeAcces = document.getElementById("resume-purge-acces");
  var btnAnnulerPurgeAcces = document.getElementById("btn-annuler-purge-acces");
  var btnConfirmerPurgeAcces = document.getElementById("btn-confirmer-purge-acces");

  function connexionsDuMois(ym) {
    if (!ym || ym === "*") return acces.slice();
    return acces.filter(function (a) { return cleMois(a.debut) === ym; });
  }

  function majResumePurgeMois() {
    if (!selMoisPurge || !resumePurgeAcces) return;
    var ym = selMoisPurge.value || "*";
    var nb = connexionsDuMois(ym).length;
    var lib = ym === "*" ? "Tous les mois" : libelleMois(ym);
    resumePurgeAcces.innerHTML =
      "<span>📅 <strong>" + lib + "</strong></span>" +
      "<span style='color:#c0392b'>🗑️ <strong>" + nb + " connexion(s)</strong> à supprimer</span>";
  }

  function remplirMoisPurge() {
    if (!selMoisPurge) return;
    var mapMois = {};
    var now = new Date();
    for (var k = 0; k < 6; k++) {
      var dRef = new Date(now.getFullYear(), now.getMonth() - k, 1);
      var ymRef = dRef.getFullYear() + "-" + String(dRef.getMonth() + 1).padStart(2, "0");
      mapMois[ymRef] = 0;
    }
    acces.forEach(function (a) {
      var ym = cleMois(a.debut);
      mapMois[ym] = (mapMois[ym] || 0) + 1;
    });
    var listeMois = Object.keys(mapMois).sort().reverse();
    selMoisPurge.innerHTML = "";
    var premierAvecDonnees = "";
    listeMois.forEach(function (ym) {
      var nb = mapMois[ym] || 0;
      if (!premierAvecDonnees && nb > 0) premierAvecDonnees = ym;
      var opt = document.createElement("option");
      opt.value = ym;
      opt.textContent = "📅 " + libelleMois(ym) + " (" + nb + " connexion(s))";
      selMoisPurge.appendChild(opt);
    });
    var optTous = document.createElement("option");
    optTous.value = "*";
    optTous.textContent = "🗓️ Tous les mois — Tout effacer (" + acces.length + " connexion(s))";
    selMoisPurge.appendChild(optTous);

    if (premierAvecDonnees) selMoisPurge.value = premierAvecDonnees;
    majResumePurgeMois();
  }

  if (btnOuvrirPurgeAcces) {
    btnOuvrirPurgeAcces.addEventListener("click", function () {
      remplirMoisPurge();
      if (modalPurgeAcces) modalPurgeAcces.classList.add("visible");
    });
  }
  if (selMoisPurge) {
    selMoisPurge.addEventListener("change", majResumePurgeMois);
  }
  if (btnAnnulerPurgeAcces) {
    btnAnnulerPurgeAcces.addEventListener("click", function () {
      if (modalPurgeAcces) modalPurgeAcces.classList.remove("visible");
    });
  }
  if (btnConfirmerPurgeAcces) {
    btnConfirmerPurgeAcces.addEventListener("click", function () {
      var ym = selMoisPurge ? selMoisPurge.value : "*";
      var cibles = connexionsDuMois(ym);
      var lib = ym === "*" ? "tous les mois" : libelleMois(ym);
      if (!cfgEcoles.purgesMois || typeof cfgEcoles.purgesMois !== "object") {
        cfgEcoles.purgesMois = {};
      }
      cfgEcoles.purgesMois[ym] = Date.now();
      sauvegarderCfgEcoles();

      var ids = cibles.map(function (a) { return a.id; }).filter(Boolean);
      acces = acces.filter(function (a) {
        return ym === "*" ? false : (cleMois(a.debut) !== ym);
      });

      /* Recalcul immédiat des compteurs et durées */
      counts = {};
      dureesSemaine = {};
      dureesTotales = {};
      acces.forEach(function (a) {
        counts[a.user_id] = (counts[a.user_id] || 0) + 1;
        var sec = dureeLigne(a);
        dureesTotales[a.user_id] = (dureesTotales[a.user_id] || 0) + sec;
        var sk = cleSemaine(a.debut);
        if (!dureesSemaine[sk]) dureesSemaine[sk] = {};
        dureesSemaine[sk][a.user_id] = (dureesSemaine[sk][a.user_id] || 0) + sec;
      });

      try {
        var cLoc = JSON.parse(localStorage.getItem("sti-admin-cache") || "null");
        if (cLoc && Array.isArray(cLoc.tousAcces)) {
          var mapIds = {};
          ids.forEach(function (id) { mapIds[id] = true; });
          cLoc.tousAcces = cLoc.tousAcces.filter(function (a) { return !mapIds[a.id]; });
          localStorage.setItem("sti-admin-cache", JSON.stringify(cLoc));
        }
      } catch (e) {}

      if (modalPurgeAcces) modalPurgeAcces.classList.remove("visible");
      rendAcces();
      rendAbonnes();
      majCompteurEnLigne();

      if (ids.length && navigator.onLine) {
        sb.from("acces").update({ page: "SUPPR_ACCES" }).in("id", ids).then(function () {});
        sb.from("acces").delete().in("id", ids).then(function () {});
      }
      msg("🗑️ " + cibles.length + " connexion(s) de " + lib + " supprimée(s).", "ok");
    });
  }

  /* ---------- Point 8 : Tableau de suivi de lecture des messages + réponses & questions libres des élèves ---------- */
  var selSuiviMsg = document.getElementById("sel-suivi-msg");
  if (selSuiviMsg) {
    selSuiviMsg.addEventListener("change", function () {
      toutVoirSuivi = false;
      afficherTableauSuivi();
    });
  }

  function libelleCibleMessage(m) {
    if (!m) return "Message";
    var uidPerso = m.uid || (String(m.classe || "").indexOf("UID:") === 0 ? String(m.classe).slice(4) : "");
    if (uidPerso) {
      var pTrouve = null;
      profils.forEach(function (p) { if (p.id === uidPerso) pTrouve = p; });
      var nomC = pTrouve ? contact(pTrouve) : (m.cibleNom || uidPerso.slice(0, 8));
      return (m.enReponseA ? "↩️ Réponse → " : "📩 Perso → ") + nomC;
    }
    return m.classe === "*" ? "Toutes les classes" : m.classe;
  }

  function abonnesCiblesPourMsg(m) {
    if (!m) return [];
    var uidPerso = m.uid || (String(m.classe || "").indexOf("UID:") === 0 ? String(m.classe).slice(4) : "");
    if (uidPerso) {
      return profils.filter(function (p) { return p.id === uidPerso; });
    }
    return abonnesDeClasse(m.classe);
  }

  function rendSuiviMessages() {
    if (!selSuiviMsg) return;
    var valPrec = selSuiviMsg.value;
    selSuiviMsg.innerHTML = "";

    messagesDiffuses.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m.id;
      var libCl = libelleCibleMessage(m);
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
    if (typeof rafraichirMessengerAdmin === "function") rafraichirMessengerAdmin();
  }

  function afficherTableauSuivi() {
    var tb = document.getElementById("tb-suivi-msg");
    var resEl = document.getElementById("resume-suivi-msg");
    var apEl = document.getElementById("apercu-suivi-msg");
    if (!tb) return;
    tb.innerHTML = "";
    if (wrapVoirPlusSuivi) wrapVoirPlusSuivi.style.display = "none";
    var mid = selSuiviMsg ? selSuiviMsg.value : "";

    if (mid === "__libre") {
      if (resEl) resEl.textContent = "(" + questionsLibres.length + " question(s) reçue(s))";
      if (apEl) {
        apEl.style.display = "block";
        apEl.textContent = "💬 Questions envoyées par les élèves depuis le bouton « 💬 Écrire au professeur » — cliquez sur « ↩️ Répondre » pour répondre directement au candidat.";
      }
      var mapP = {};
      profils.forEach(function (p) { mapP[p.id] = p; });
      if (!questionsLibres.length) {
        var trQ0 = document.createElement("tr");
        var tdQ0 = document.createElement("td");
        tdQ0.colSpan = 6;
        tdQ0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
        tdQ0.textContent = "Aucune question spontanée reçue pour le moment.";
        trQ0.appendChild(tdQ0);
        tb.appendChild(trQ0);
        return;
      }
      var limQ = toutVoirSuivi ? questionsLibres.length : 5;
      questionsLibres.slice(0, limQ).forEach(function (q) {
        var p = mapP[q.uid];
        var tr = document.createElement("tr");
        var tdNom = document.createElement("td"); tdNom.style.fontWeight = "700"; tdNom.textContent = p ? contact(p) : q.uid;
        var tdCl = document.createElement("td"); tdCl.style.color = "#7a6f5d"; tdCl.textContent = p ? (lyceePropre(p) + " · " + (p.classe || "—")) : "—";
        var tdEt = document.createElement("td");
        var repDeja = null;
        messagesDiffuses.forEach(function (m) {
          var uidM = m.uid || (String(m.classe || "").indexOf("UID:") === 0 ? String(m.classe).slice(4) : "");
          if (uidM === q.uid && m.enReponseA && m.enReponseA === q.reponse && !repDeja) {
            repDeja = m;
          }
        });
        var b = document.createElement("span");
        b.className = "st " + (repDeja ? "actif" : "en_attente");
        b.textContent = repDeja ? "✅ Répondu" : "💬 Question";
        tdEt.appendChild(b);

        var tdRep = document.createElement("td");
        tdRep.style.fontWeight = "800";
        tdRep.style.color = "#23201a";
        var divQ = document.createElement("div");
        divQ.textContent = q.reponse || "—";
        tdRep.appendChild(divQ);
        if (repDeja) {
          var divR = document.createElement("div");
          divR.style.cssText = "font-size:11.5px;color:#177245;font-weight:800;margin-top:4px;background:#e3f6e8;padding:4px 8px;border-radius:7px;border-left:3px solid #177245;";
          divR.textContent = "↩️ Votre réponse : « " + repDeja.texte + " »";
          tdRep.appendChild(divR);
        }

        var tdDt = document.createElement("td"); tdDt.textContent = fmtDate(q.ts);
        var tdActQ = document.createElement("td");
        if (p) {
          var btnRepQ = document.createElement("button");
          btnRepQ.type = "button";
          btnRepQ.className = "act";
          btnRepQ.style.cssText = "background:#fff3e0;color:#d84315;border-color:#d84315;font-weight:900;";
          btnRepQ.textContent = "↩️ Répondre";
          btnRepQ.title = "Répondre directement à la question de cet élève";
          btnRepQ.addEventListener("click", function () {
            ouvrirMessageCandidat(p, q.reponse || "");
          });
          tdActQ.appendChild(btnRepQ);
        } else {
          tdActQ.textContent = "—";
        }
        tr.append(tdNom, tdCl, tdEt, tdRep, tdDt, tdActQ);
        tb.appendChild(tr);
      });
      if (wrapVoirPlusSuivi && btnVoirPlusSuivi && questionsLibres.length > 5) {
        wrapVoirPlusSuivi.style.display = "block";
        btnVoirPlusSuivi.textContent = toutVoirSuivi
          ? "➖ Voir moins (afficher les 5 premiers)"
          : ("➕ Voir plus (" + (questionsLibres.length - 5) + " autre(s))");
      }
      return;
    }

    var msgObj = null;
    messagesDiffuses.forEach(function (m) { if (m.id === mid) msgObj = m; });
    if (!msgObj) {
      if (resEl) resEl.textContent = "";
      if (apEl) apEl.style.display = "none";
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 6;
      td0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      td0.textContent = "Diffusez un message via « 📢 Message par classe » ou « 📩 » sur un élève pour suivre ici qui l'a lu ou y a répondu.";
      tr0.appendChild(td0);
      tb.appendChild(tr0);
      return;
    }

    if (apEl) {
      apEl.style.display = "block";
      apEl.textContent = (msgObj.enReponseA ? ("↩️ En réponse à « " + msgObj.enReponseA + " » → ") : "💬 Message : ") + "« " + msgObj.texte + " »";
    }

    var cibles = abonnesCiblesPourMsg(msgObj);
    var mapLu = lecturesParMsg[msgObj.id] || {};
    var mapRep = reponsesParMsg[msgObj.id] || {};
    var nbLu = 0, nbNonLu = 0;

    if (!cibles.length) {
      var trV = document.createElement("tr");
      var tdV = document.createElement("td");
      tdV.colSpan = 6;
      tdV.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      tdV.textContent = "Aucun abonné correspondant à ce message.";
      trV.appendChild(tdV);
      tb.appendChild(trV);
    }

    cibles.forEach(function (p) {
      if (mapLu[p.id]) nbLu++; else nbNonLu++;
    });

    var limCibles = toutVoirSuivi ? cibles.length : 5;
    cibles.slice(0, limCibles).forEach(function (p) {
      var dateLu = mapLu[p.id];
      var repEleve = mapRep[p.id] || "";

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

      var tdActM = document.createElement("td");
      var btnRepM = document.createElement("button");
      btnRepM.type = "button";
      btnRepM.className = "act";
      if (repEleve) {
        btnRepM.style.cssText = "background:#fff3e0;color:#d84315;border-color:#d84315;font-weight:900;";
        btnRepM.textContent = "↩️ Répondre";
        btnRepM.title = "Répondre directement au message de cet élève";
      } else {
        btnRepM.textContent = "📩 Message";
        btnRepM.title = "Envoyer un message personnel à cet élève";
      }
      btnRepM.addEventListener("click", function () {
        ouvrirMessageCandidat(p, repEleve || "");
      });
      tdActM.appendChild(btnRepM);

      tr.append(tdNom, tdCl, tdEtat, tdRep, tdDate, tdActM);
      tb.appendChild(tr);
    });

    if (wrapVoirPlusSuivi && btnVoirPlusSuivi && cibles.length > 5) {
      wrapVoirPlusSuivi.style.display = "block";
      btnVoirPlusSuivi.textContent = toutVoirSuivi
        ? "➖ Voir moins (afficher les 5 premiers)"
        : ("➕ Voir plus (" + (cibles.length - 5) + " autre(s) élève(s))");
    }

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
        var stCl = statsPourSelection(cl, "*");
        var nb = stCl.total;
        var nbOn = stCl.enLigne;
        var row = document.createElement("div");
        row.className = "ecole-item";
        var gauche = document.createElement("div");
        gauche.className = "ecole-nom";
        var spNom = document.createElement("span");
        spNom.textContent = "🏫 " + cl;
        var spNb = document.createElement("span");
        spNb.className = "ecole-nb";
        spNb.textContent = "👥 " + nb + " élève(s) · 🟢 " + nbOn + " en ligne";
        gauche.append(spNom, spNb);

        var btns = document.createElement("div");
        btns.className = "ecole-btns";
        var bCall = document.createElement("button");
        bCall.type = "button";
        bCall.textContent = "👁️ Appeler";
        bCall.title = "Afficher les élèves et les connectés de cette classe dans le tableau de bord";
        bCall.addEventListener("click", function () {
          if (selFiltreClasse) selFiltreClasse.value = cl;
          if (modalEcoles) modalEcoles.classList.remove("visible");
          rendAbonnes();
        });
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
        btns.append(bCall, bEdit, bDel);
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

  function majResumeClasseModal(selEl, boxId) {
    if (!selEl) return;
    var box = document.getElementById(boxId);
    if (!box) return;
    var cl = selEl.value || "*";
    var st = statsPourSelection(cl, "*");
    var lib = cl === "*" ? "Toutes les classes" : ("Classe " + cl);
    box.innerHTML =
      "<span>🏫 <strong>" + lib + "</strong></span>" +
      "<span>👥 Effectif : <strong>" + st.total + " élève(s)</strong> · <strong style='color:#177245'>🟢 " + st.enLigne + " en ligne</strong></span>";
  }

  function remplirClassesSelect(selEl) {
    if (!selEl) return;
    var classesBase = obtenirClassesActives();
    var valPrec = selEl.value;
    selEl.innerHTML = "";
    var stTous = statsPourSelection("*", "*");
    var optTous = document.createElement("option");
    optTous.value = "*";
    optTous.textContent = "Toutes les classes (" + stTous.total + " élève(s) · 🟢 " + stTous.enLigne + " en ligne)";
    selEl.appendChild(optTous);
    classesBase.forEach(function (cl) {
      var stC = statsPourSelection(cl, "*");
      var opt = document.createElement("option");
      opt.value = cl;
      opt.textContent = cl + " (" + stC.total + " élève(s) · 🟢 " + stC.enLigne + " en ligne)";
      selEl.appendChild(opt);
    });
    if (valPrec && (valPrec === "*" || classesBase.indexOf(valPrec) !== -1)) {
      selEl.value = valPrec;
    } else if (selFiltreClasse && selFiltreClasse.value && selFiltreClasse.value !== "*") {
      selEl.value = selFiltreClasse.value;
    }
  }

  if (selCtrlClasse) {
    selCtrlClasse.addEventListener("change", function () {
      majResumeClasseModal(selCtrlClasse, "resume-ctrl-classe");
    });
  }

  document.getElementById("btn-controle").addEventListener("click", function () {
    remplirClassesSelect(selCtrlClasse);
    majResumeClasseModal(selCtrlClasse, "resume-ctrl-classe");
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

  /* ---------- Boîte modale : message groupé à toute une classe OU message/réponse à un candidat précis ---------- */
  var modalClasse = document.getElementById("modal-classe");
  var selClasse = document.getElementById("msg-classe");
  var selCibleUid = document.getElementById("msg-cible-uid");
  var zoneCitationRep = document.getElementById("zone-citation-rep");
  var titreModalMsg = document.getElementById("titre-modal-msg");
  var txtClasse = document.getElementById("msg-texte");
  var zoneWaClasse = document.getElementById("zone-wa-classe");
  var listeWaClasse = document.getElementById("liste-wa-classe");
  var citationEnCours = "";

  function abonnesDeClasse(cl) {
    if (!cl || cl === "*") return profils.slice();
    return profils.filter(function (p) { return (p.classe || "—") === cl; });
  }

  function abonnesCiblesModal() {
    var uidSel = selCibleUid ? selCibleUid.value : "";
    if (uidSel) {
      return profils.filter(function (p) { return p.id === uidSel; });
    }
    return abonnesDeClasse(selClasse ? selClasse.value : "*");
  }

  function remplirCandidatsDeClasse(uidPref) {
    if (!selCibleUid) return;
    var valCible = uidPref !== undefined ? uidPref : (selCibleUid.value || "");
    var liste = abonnesDeClasse(selClasse ? selClasse.value : "*");
    selCibleUid.innerHTML = "";
    var optTous = document.createElement("option");
    optTous.value = "";
    optTous.textContent = "👥 Toute la classe sélectionnée (" + liste.length + " élève(s))";
    selCibleUid.appendChild(optTous);

    liste.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      var stOn = estEnLigne(p.id) ? "🟢 En ligne" : "⚪ Hors ligne";
      opt.textContent = "👤 " + contact(p) + " — " + (p.classe || "—") + " (" + stOn + ")";
      selCibleUid.appendChild(opt);
    });

    if (valCible && liste.some(function (p) { return p.id === valCible; })) {
      selCibleUid.value = valCible;
    } else {
      selCibleUid.value = "";
    }
  }

  function majEnteteEtCitationModal() {
    var uidSel = selCibleUid ? selCibleUid.value : "";
    var pCible = null;
    if (uidSel) {
      profils.forEach(function (p) { if (p.id === uidSel) pCible = p; });
    }
    if (titreModalMsg) {
      if (pCible) {
        titreModalMsg.textContent = citationEnCours
          ? ("↩️ Répondre à " + contact(pCible))
          : ("📩 Message personnel à " + contact(pCible));
      } else {
        titreModalMsg.textContent = "📢 Message à une classe ou à un candidat";
      }
    }
    if (zoneCitationRep) {
      if (pCible && citationEnCours) {
        zoneCitationRep.style.display = "block";
        zoneCitationRep.textContent = "💬 En réponse à « " + citationEnCours + " »";
      } else {
        zoneCitationRep.style.display = "none";
        zoneCitationRep.textContent = "";
      }
    }
  }

  function remplirClasses(uidPref) {
    remplirClassesSelect(selClasse);
    remplirCandidatsDeClasse(uidPref || "");
    majEnteteEtCitationModal();
    majListeWaClasse();
  }

  function ouvrirMessageCandidat(p, texteCitation) {
    if (!p) return;
    if (document.getElementById("sti-messenger-admin")) {
      ouvrirMessengerAdmin(p, texteCitation || "");
      return;
    }
    if (!modalClasse) return;
    citationEnCours = String(texteCitation || "").trim();
    remplirClassesSelect(selClasse);
    var clP = p.classe || "*";
    if (selClasse) {
      var existeOpt = Array.prototype.some.call(selClasse.options, function (o) { return o.value === clP; });
      selClasse.value = existeOpt ? clP : "*";
    }
    remplirCandidatsDeClasse(p.id);
    majEnteteEtCitationModal();
    majListeWaClasse();
    txtClasse.placeholder = citationEnCours
      ? ("Écrivez votre réponse à " + contact(p) + "…")
      : ("Écrivez votre message personnel pour " + contact(p) + "…");
    modalClasse.classList.add("visible");
    setTimeout(function () { txtClasse.focus(); }, 30);
  }

  function majListeWaClasse() {
    var uidSel = selCibleUid ? selCibleUid.value : "";
    if (uidSel) {
      var pSel = null;
      profils.forEach(function (p) { if (p.id === uidSel) pSel = p; });
      var resEl = document.getElementById("resume-msg-classe");
      if (resEl && pSel) {
        var onL = estEnLigne(pSel.id);
        resEl.innerHTML =
          "<span>👤 <strong>" + echHtml(contact(pSel)) + "</strong> (" + echHtml(pSel.classe || "—") + ")</span>" +
          "<span>" + (onL ? "<strong style='color:#177245'>🟢 En ligne maintenant</strong>" : "⚪ Hors ligne (recevra le message dès connexion)") + "</span>";
      }
    } else {
      majResumeClasseModal(selClasse, "resume-msg-classe");
    }

    var liste = abonnesCiblesModal();
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
        var msgWa = citationEnCours
          ? ("En réponse à votre message (« " + citationEnCours + " ») :\n" + texte)
          : texte;
        window.open("https://wa.me/" + ch + "?text=" + encodeURIComponent(msgWa), "_blank", "noopener");
        b.textContent = "✅ Ouvert";
        b.classList.add("envoye");
      });
      row.append(sp, b);
      listeWaClasse.appendChild(row);
    });
  }

  document.getElementById("btn-msg-classe").addEventListener("click", function () {
    citationEnCours = "";
    txtClasse.placeholder = "Ex. : Rappel — devoir de synthèse mardi prochain, révisez le module PHP & MySQLi.";
    remplirClasses("");
    modalClasse.classList.add("visible");
    setTimeout(function () { txtClasse.focus(); }, 30);
  });
  document.getElementById("btn-fermer-classe").addEventListener("click", function () {
    arreterDictee();
    citationEnCours = "";
    modalClasse.classList.remove("visible");
  });
  selClasse.addEventListener("change", function () {
    citationEnCours = "";
    remplirCandidatsDeClasse("");
    majEnteteEtCitationModal();
    majListeWaClasse();
  });
  if (selCibleUid) {
    selCibleUid.addEventListener("change", function () {
      if (!selCibleUid.value) citationEnCours = "";
      majEnteteEtCitationModal();
      majListeWaClasse();
    });
  }
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
    var cibles = abonnesCiblesModal();
    var uidSel = selCibleUid ? selCibleUid.value : "";
    var cl = selClasse.value;
    var libCl = uidSel && cibles[0] ? contact(cibles[0]) : (cl === "*" ? "Toutes les classes" : cl);
    var mails = cibles
      .map(function (p) { return p.email || ""; })
      .filter(function (em) { return em && !/@tel\.sti\.tn$/i.test(em); });
    if (!mails.length) {
      msg("⚠️ Aucune adresse e-mail disponible pour « " + libCl + " ».", "err");
      return;
    }
    var sujet = citationEnCours
      ? "[STI V2.0] Réponse de M. Essouyah à votre message"
      : ("[STI V2.0 — " + libCl + "] Message de M. Essouyah");
    var corpsMail = citationEnCours
      ? ("En réponse à votre message (« " + citationEnCours + " ») :\n\n" + texte)
      : texte;
    location.href = (mails.length === 1 ? ("mailto:" + encodeURIComponent(mails[0]) + "?") : ("mailto:?bcc=" + encodeURIComponent(mails.join(",")) + "&")) +
      "subject=" + encodeURIComponent(sujet) +
      "&body=" + encodeURIComponent(corpsMail);
    msg("📧 Messagerie ouverte pour " + libCl + ".", "ok");
  });

  document.getElementById("btn-diffuser-classe").addEventListener("click", function () {
    var texte = txtClasse.value.trim();
    if (!texte) { msg("❌ Saisissez d'abord le message à envoyer.", "err"); txtClasse.focus(); return; }
    var uidSel = selCibleUid ? selCibleUid.value : "";
    var pCible = null;
    if (uidSel) {
      profils.forEach(function (p) { if (p.id === uidSel) pCible = p; });
    }
    var cl = uidSel ? ("UID:" + uidSel) : selClasse.value;
    var libCl = pCible ? contact(pCible) : (selClasse.value === "*" ? "Toutes les classes" : selClasse.value);
    var btn = document.getElementById("btn-diffuser-classe");
    btn.disabled = true;
    btn.textContent = "⏳ Envoi…";
    var payload = {
      id: "m" + Date.now(),
      ts: new Date().toISOString(),
      classe: cl,
      uid: uidSel || undefined,
      cibleNom: pCible ? contact(pCible) : undefined,
      enReponseA: citationEnCours || undefined,
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
      btn.textContent = "🔔 Envoyer sur le site";
      var etaitReponse = Boolean(citationEnCours);
      modalClasse.classList.remove("visible");
      txtClasse.value = "";
      texteBase = "";
      citationEnCours = "";
      if (selSuiviMsg && !etaitReponse) selSuiviMsg.value = "";
      msg((uidSel ? (etaitReponse ? "↩️ Réponse envoyée à « " : "📩 Message personnel envoyé à « ") : "📢 Message diffusé pour « ") + libCl + " ».", "ok");
      charge(true);
    });
  });

  /* ---------- Fenêtre de discussion style Facebook Messenger (#sti-messenger-admin) ---------- */
  var msnWin = document.getElementById("sti-messenger-admin");
  var btnMsnDock = document.getElementById("btn-messenger-dock");
  var btnMsnTop = document.getElementById("btn-messenger-top");
  var badgeMsnAdmin = document.getElementById("badge-msn-admin");
  var msnSearchUser = document.getElementById("msn-search-user");
  var msnUserList = document.getElementById("msn-user-list");
  var msnChatFeed = document.getElementById("msn-chat-feed");
  var msnHeadAv = document.getElementById("msn-head-av");
  var msnHeadDot = document.getElementById("msn-head-dot");
  var msnHeadNom = document.getElementById("msn-head-nom");
  var msnHeadSub = document.getElementById("msn-head-sub");
  var msnHeadWa = document.getElementById("msn-head-wa");
  var msnHeadFiche = document.getElementById("msn-head-fiche");
  var msnHeadClose = document.getElementById("msn-head-close");
  var msnBtnBackMob = document.getElementById("msn-btn-back-mob");
  var msnBtnBroadcast = document.getElementById("msn-btn-broadcast");
  var msnQuoteBar = document.getElementById("msn-admin-quote-bar");
  var msnQuoteTxt = document.getElementById("msn-admin-quote-txt");
  var msnQuoteClear = document.getElementById("msn-admin-quote-clear");
  var msnChatForm = document.getElementById("msn-chat-form");
  var msnChatInp = document.getElementById("msn-chat-inp");
  var msnBtnMic = document.getElementById("msn-btn-mic");
  var msnBtnSend = document.getElementById("msn-btn-send");

  var msnUidActif = "";
  var msnCitationActuelle = "";

  function fmtHeureCourt(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      var auj = new Date();
      var hh = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
      if (d.toDateString() === auj.toDateString()) return hh;
      return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + " " + hh;
    } catch (e) { return ""; }
  }

  function initialesPourProfil(p) {
    if (!p) return "👤";
    var np = ((p.prenom || "") + " " + (p.nom || "")).trim();
    if (!np) np = contact(p);
    var parts = np.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return np.slice(0, 2).toUpperCase();
  }

  function construireFilConversationAdmin(p) {
    if (!p) return [];
    var uid = p.id;
    var fil = [];

    /* 1. Questions spontanées envoyées par cet élève */
    questionsLibres.forEach(function (q) {
      if (q.uid === uid && q.reponse) {
        fil.push({
          de: "eleve",
          texte: q.reponse,
          ts: q.ts || new Date().toISOString(),
          ms: new Date(q.ts || 0).getTime() || 0,
          type: "question"
        });
      }
    });

    /* 2. Messages personnels et annonces de classe + réponses de cet élève */
    messagesDiffuses.forEach(function (m) {
      var uidM = m.uid || (String(m.classe || "").indexOf("UID:") === 0 ? String(m.classe).slice(4) : "");
      var estPerso = uidM === uid;
      var estSaClasse = !uidM && (m.classe === "*" || m.classe === (p.classe || "—"));
      var luTs = (lecturesParMsg[m.id] || {})[uid] || "";
      var repTxt = (reponsesParMsg[m.id] || {})[uid] || "";

      if (estPerso || (estSaClasse && (luTs || repTxt))) {
        fil.push({
          de: "prof",
          id: m.id,
          texte: m.texte || "",
          enReponseA: m.enReponseA || "",
          perso: estPerso,
          luTs: luTs,
          ts: m.ts || new Date().toISOString(),
          ms: new Date(m.ts || 0).getTime() || 0
        });
      }
      if (repTxt) {
        var tsRep = luTs || m.ts || new Date().toISOString();
        fil.push({
          de: "eleve",
          texte: repTxt,
          enReponseA: m.texte || "",
          ts: tsRep,
          ms: (new Date(tsRep).getTime() || 0) + 1,
          type: "reponse"
        });
      }
    });

    fil.sort(function (a, b) { return a.ms - b.ms; });
    return fil;
  }

  function nbQuestionsNonReponduesCandidat(p) {
    var fil = construireFilConversationAdmin(p);
    if (!fil.length) return 0;
    var nb = 0;
    for (var i = fil.length - 1; i >= 0; i--) {
      if (fil[i].de === "eleve") nb++;
      else if (fil[i].de === "prof" && fil[i].perso) break;
    }
    return nb;
  }

  function definirCitationMessengerAdmin(texte) {
    msnCitationActuelle = String(texte || "").trim();
    if (!msnQuoteBar || !msnQuoteTxt) return;
    if (msnCitationActuelle) {
      msnQuoteBar.style.display = "flex";
      msnQuoteTxt.textContent = "↩️ En réponse à : « " + msnCitationActuelle + " »";
    } else {
      msnQuoteBar.style.display = "none";
      msnQuoteTxt.textContent = "";
    }
  }

  if (msnQuoteClear) {
    msnQuoteClear.addEventListener("click", function () {
      definirCitationMessengerAdmin("");
    });
  }

  function peindreListeUsersMessengerAdmin() {
    if (!msnUserList) return;
    var q = msnSearchUser ? msnSearchUser.value.trim().toLowerCase() : "";
    var totalNonRepondus = 0;

    var enrichis = profils.map(function (p) {
      var fil = construireFilConversationAdmin(p);
      var dernier = fil.length ? fil[fil.length - 1] : null;
      var nonRep = nbQuestionsNonReponduesCandidat(p);
      totalNonRepondus += nonRep;
      return {
        p: p,
        fil: fil,
        dernier: dernier,
        dernierMs: dernier ? dernier.ms : 0,
        nonRep: nonRep,
        online: estEnLigne(p.id)
      };
    });

    if (badgeMsnAdmin) {
      if (totalNonRepondus > 0) {
        badgeMsnAdmin.style.display = "inline-block";
        badgeMsnAdmin.textContent = String(totalNonRepondus);
      } else {
        badgeMsnAdmin.style.display = "none";
      }
    }

    var filtres = enrichis.filter(function (it) {
      if (!q) return true;
      var ch = (contact(it.p) + " " + (it.p.classe || "") + " " + lyceePropre(it.p)).toLowerCase();
      return ch.indexOf(q) !== -1;
    });

    filtres.sort(function (a, b) {
      if (b.nonRep !== a.nonRep) return b.nonRep - a.nonRep;
      if (b.dernierMs !== a.dernierMs) return b.dernierMs - a.dernierMs;
      if (a.online !== b.online) return a.online ? -1 : 1;
      return contact(a.p).localeCompare(contact(b.p), "fr");
    });

    msnUserList.innerHTML = "";
    if (!filtres.length) {
      msnUserList.innerHTML = "<div style='padding:12px;text-align:center;color:#7a6f5d;font-size:11.5px;font-weight:700'>Aucun candidat trouvé.</div>";
      return;
    }

    filtres.forEach(function (it) {
      var p = it.p;
      var row = document.createElement("button");
      row.type = "button";
      row.className = "msn-user-item" + (p.id === msnUidActif ? " actif" : "");
      var ini = initialesPourProfil(p);
      var subTxt = it.dernier
        ? ((it.dernier.de === "prof" ? "Vous : " : "💬 ") + it.dernier.texte)
        : ((p.classe || "—") + " · " + (it.online ? "🟢 En ligne" : "Hors ligne"));

      row.innerHTML =
        "<div class='msn-av'>" + echHtml(ini) + "<span class='msn-av-dot" + (it.online ? " online" : "") + "'></span></div>" +
        "<div class='msn-u-meta'>" +
          "<div class='msn-u-nom'>" + echHtml(contact(p)) + "</div>" +
          "<div class='msn-u-sub'>" + echHtml(subTxt) + "</div>" +
        "</div>" +
        (it.nonRep > 0 ? ("<span class='msn-u-badge' title='Nouveau message de cet élève'>" + it.nonRep + "</span>") : "");

      row.addEventListener("click", function () {
        msnUidActif = p.id;
        definirCitationMessengerAdmin("");
        if (msnWin) msnWin.classList.add("mode-chat");
        peindreListeUsersMessengerAdmin();
        peindreConversationMessengerAdmin();
        if (msnChatInp) msnChatInp.focus();
      });
      msnUserList.appendChild(row);
    });
  }

  function peindreConversationMessengerAdmin() {
    if (!msnChatFeed) return;
    var p = null;
    profils.forEach(function (x) { if (x.id === msnUidActif) p = x; });

    if (!p) {
      if (msnHeadNom) msnHeadNom.textContent = "Sélectionnez un candidat";
      if (msnHeadSub) msnHeadSub.textContent = "Discussion instantanée STI";
      if (msnHeadWa) msnHeadWa.style.display = "none";
      if (msnHeadFiche) msnHeadFiche.style.display = "none";
      msnChatFeed.innerHTML =
        "<div style='margin:auto;text-align:center;color:#6b6152;font-size:12.5px;font-weight:700;padding:18px'>" +
          "👈 Choisissez un candidat dans la liste à gauche pour ouvrir sa conversation style Facebook Messenger." +
        "</div>";
      return;
    }

    var onL = estEnLigne(p.id);
    if (msnHeadAv) {
      msnHeadAv.innerHTML = echHtml(initialesPourProfil(p)) + "<span class='msn-av-dot" + (onL ? " online" : "") + "' id='msn-head-dot'></span>";
    }
    if (msnHeadNom) msnHeadNom.textContent = contact(p);
    if (msnHeadSub) {
      msnHeadSub.textContent = (p.classe || "—") + " · " + lyceePropre(p) + " · " + (onL ? "🟢 En ligne" : "⚪ Hors ligne");
    }
    var telP = telDeProfil(p);
    if (msnHeadWa) {
      msnHeadWa.style.display = telP ? "inline-block" : "none";
      msnHeadWa.onclick = function () {
        var ch = telP.replace(/\D/g, "");
        var txt = (msnChatInp && msnChatInp.value.trim()) || "Bonjour " + contact(p) + ", ";
        window.open("https://wa.me/" + ch + "?text=" + encodeURIComponent(txt), "_blank", "noopener");
      };
    }
    if (msnHeadFiche) {
      msnHeadFiche.style.display = "inline-block";
      msnHeadFiche.onclick = function () {
        ouvrirFicheEleve(p);
      };
    }
    if (msnChatInp) {
      msnChatInp.placeholder = "Écrire à " + contact(p) + "… (Entrée pour envoyer)";
    }

    var fil = construireFilConversationAdmin(p);
    if (!fil.length) {
      msnChatFeed.innerHTML =
        "<div style='margin:auto;text-align:center;color:#6b6152;font-size:12px;padding:18px;max-width:300px'>" +
          "<div style='font-size:28px;margin-bottom:6px'>👋</div>" +
          "<b>Démarrez la discussion avec " + echHtml(contact(p)) + "</b><br>" +
          "<span style='color:#8a7f6d'>Votre message s'affichera instantanément dans une fenêtre Messenger sur son écran.</span>" +
        "</div>";
      return;
    }

    msnChatFeed.innerHTML = fil.map(function (it, idx) {
      var estProf = it.de === "prof";
      var h = fmtHeureCourt(it.ts);
      if (estProf) {
        var citProf = it.enReponseA
          ? ("<div style='background:rgba(0,0,0,.18);border-left:3px solid #ffd54f;border-radius:7px;padding:4px 8px;margin-bottom:5px;font-size:11px;opacity:.95'>↩️ « " + echHtml(it.enReponseA) + " »</div>")
          : (!it.perso ? "<div style='font-size:10px;font-weight:900;color:#ffd54f;margin-bottom:3px'>📢 Annonce de classe</div>" : "");
        var vuTxt = it.luTs ? ("✓✓ Lu (" + fmtHeureCourt(it.luTs) + ")") : "✓ Envoyé";
        return (
          "<div style='display:flex;flex-direction:column;align-items:flex-end'>" +
            "<div style='max-width:82%;background:linear-gradient(135deg,#f4511e,#ff7043);color:#fff;border:2px solid #23201a;border-radius:16px 16px 4px 16px;padding:8px 12px;font-size:12.5px;font-weight:700;box-shadow:2px 2px 0 rgba(35,32,26,.2);word-break:break-word'>" +
              citProf +
              "<div style='white-space:pre-wrap'>" + echHtml(it.texte) + "</div>" +
            "</div>" +
            "<div style='font-size:10px;color:#6b6152;margin-top:2px;padding:0 4px;font-weight:800'>" + echHtml(h) + " · <span style='color:" + (it.luTs ? "#177245" : "#7a6f5d") + "'>" + echHtml(vuTxt) + "</span></div>" +
          "</div>"
        );
      } else {
        var citEleve = it.enReponseA
          ? ("<div style='background:#f3ead9;border-left:3px solid #f4511e;border-radius:7px;padding:4px 8px;margin-bottom:5px;font-size:11px;color:#5a5244'>📢 En réponse à : « " + echHtml(it.enReponseA) + " »</div>")
          : "";
        return (
          "<div style='display:flex;flex-direction:column;align-items:flex-start'>" +
            "<div style='display:flex;align-items:center;gap:6px;max-width:86%'>" +
              "<div style='background:#fff;color:#23201a;border:2px solid #23201a;border-radius:16px 16px 16px 4px;padding:8px 12px;font-size:12.5px;font-weight:700;box-shadow:2px 2px 0 rgba(35,32,26,.15);word-break:break-word'>" +
                "<div style='font-size:10px;font-weight:900;color:#f4511e;margin-bottom:2px'>💬 " + echHtml(contact(p)) + "</div>" +
                citEleve +
                "<div style='white-space:pre-wrap'>" + echHtml(it.texte) + "</div>" +
              "</div>" +
              "<button type='button' class='msn-btn-quote-item' data-idx='" + idx + "' style='border:1.5px solid #23201a;background:#fff3e0;color:#d84315;border-radius:999px;padding:3px 7px;font-size:11px;font-weight:900;cursor:pointer;flex-shrink:0' title='Citer et répondre à ce message'>↩️</button>" +
            "</div>" +
            "<div style='font-size:10px;color:#6b6152;margin-top:2px;padding:0 4px;font-weight:800'>" + echHtml(h) + "</div>" +
          "</div>"
        );
      }
    }).join("");

    Array.prototype.forEach.call(msnChatFeed.querySelectorAll(".msn-btn-quote-item"), function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-idx"), 10);
        if (fil[idx] && fil[idx].texte) {
          definirCitationMessengerAdmin(fil[idx].texte);
          if (msnChatInp) msnChatInp.focus();
        }
      });
    });

    msnChatFeed.scrollTop = msnChatFeed.scrollHeight;
  }

  function ouvrirMessengerAdmin(pCible, texteCitation) {
    if (!msnWin) return;
    if (pCible && pCible.id) {
      msnUidActif = pCible.id;
      msnWin.classList.add("mode-chat");
    } else if (!msnUidActif && profils.length) {
      /* Choisir automatiquement le 1er élève ayant posé une question ou en ligne */
      peindreListeUsersMessengerAdmin();
      var premierBtn = msnUserList ? msnUserList.querySelector(".msn-user-item") : null;
      if (premierBtn) premierBtn.click();
    }
    definirCitationMessengerAdmin(texteCitation || "");
    msnWin.classList.add("visible");
    peindreListeUsersMessengerAdmin();
    peindreConversationMessengerAdmin();
    setTimeout(function () {
      if (msnChatInp && msnUidActif) msnChatInp.focus();
    }, 40);
  }

  function rafraichirMessengerAdmin() {
    peindreListeUsersMessengerAdmin();
    if (msnWin && msnWin.classList.contains("visible")) {
      peindreConversationMessengerAdmin();
    }
  }

  if (btnMsnDock) {
    btnMsnDock.addEventListener("click", function () {
      if (msnWin && msnWin.classList.contains("visible")) {
        msnWin.classList.remove("visible");
      } else {
        ouvrirMessengerAdmin(null, "");
      }
    });
  }
  if (btnMsnTop) {
    btnMsnTop.addEventListener("click", function () {
      ouvrirMessengerAdmin(null, "");
    });
  }
  if (msnHeadClose) {
    msnHeadClose.addEventListener("click", function () {
      if (msnWin) msnWin.classList.remove("visible");
    });
  }
  if (msnBtnBackMob) {
    msnBtnBackMob.addEventListener("click", function () {
      if (msnWin) msnWin.classList.remove("mode-chat");
    });
  }
  if (msnBtnBroadcast) {
    msnBtnBroadcast.addEventListener("click", function () {
      if (msnWin) msnWin.classList.remove("visible");
      var btnCl = document.getElementById("btn-msg-classe");
      if (btnCl) btnCl.click();
    });
  }
  if (msnSearchUser) {
    msnSearchUser.addEventListener("input", peindreListeUsersMessengerAdmin);
  }

  /* Dictée vocale directe dans Messenger STI */
  if (msnBtnMic) {
    var recoMsn = null;
    var ecouteMsn = false;
    msnBtnMic.addEventListener("click", function () {
      if (!Rec) {
        msg("⚠️ La dictée vocale nécessite Chrome, Edge ou Safari.", "err");
        return;
      }
      if (ecouteMsn && recoMsn) {
        ecouteMsn = false;
        try { recoMsn.stop(); } catch (e) {}
        msnBtnMic.textContent = "🎙️";
        return;
      }
      recoMsn = new Rec();
      recoMsn.lang = "fr-FR";
      recoMsn.continuous = false;
      recoMsn.interimResults = false;
      recoMsn.onstart = function () {
        ecouteMsn = true;
        msnBtnMic.textContent = "⏹️";
      };
      recoMsn.onresult = function (e) {
        var seg = (e.results[0] && e.results[0][0] && e.results[0][0].transcript) || "";
        if (seg && msnChatInp) {
          msnChatInp.value = (msnChatInp.value ? msnChatInp.value.trim() + " " : "") + seg.trim();
          msnChatInp.focus();
        }
      };
      recoMsn.onend = function () {
        ecouteMsn = false;
        msnBtnMic.textContent = "🎙️";
      };
      try { recoMsn.start(); } catch (e) { ecouteMsn = false; msnBtnMic.textContent = "🎙️"; }
    });
  }

  /* Envoi instantané depuis la barre Messenger STI */
  if (msnChatForm) {
    msnChatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!msnUidActif) {
        msg("⚠️ Sélectionnez d'abord un candidat dans la colonne de gauche.", "err");
        return;
      }
      var texte = msnChatInp ? msnChatInp.value.trim() : "";
      if (!texte) return;
      var pCible = null;
      profils.forEach(function (x) { if (x.id === msnUidActif) pCible = x; });
      var payload = {
        id: "m" + Date.now(),
        ts: new Date().toISOString(),
        classe: "UID:" + msnUidActif,
        uid: msnUidActif,
        cibleNom: pCible ? contact(pCible) : msnUidActif,
        enReponseA: msnCitationActuelle || undefined,
        texte: texte
      };

      /* Mise à jour immédiate de l'interface Messenger sans attendre le réseau */
      messagesDiffuses.unshift(payload);
      if (msnChatInp) msnChatInp.value = "";
      definirCitationMessengerAdmin("");
      peindreListeUsersMessengerAdmin();
      peindreConversationMessengerAdmin();
      rendSuiviMessages();

      try {
        sb.channel("sti-diffusion").send({ type: "broadcast", event: "annonce", payload: payload });
      } catch (err) {}
      if (adminUid) {
        sb.from("acces").insert({ user_id: adminUid, page: "MSG_ENVOI:" + payload.id, lieu: JSON.stringify(payload), duree_sec: 0 }).then(function () {});
      }
      fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
        method: "POST",
        body: JSON.stringify(payload)
      }).catch(function () {});
    });
  }
})();
