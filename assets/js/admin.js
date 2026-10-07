/* STI v2 — tableau de bord admin : stats, tri, compteur, détail connexions, mot de passe, suppression, code WhatsApp */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
  var elMsg = document.getElementById("msg");
  function msg(t, c) { elMsg.textContent = t; elMsg.className = "msg" + (c ? " " + c : ""); }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.update(); });
    });
  }

  var LIB = { actif: "Actif", en_attente: "En attente", suspendu: "Suspendu", exclu: "Exclu" };
  function estAdminEmail(em) {
    return (em || "").trim().toLowerCase() === (cfg.ADMIN || "").trim().toLowerCase();
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
  function contact(p) {
    var tel = telDeProfil(p);
    var base = tel ? "📱 " + tel : (p.email || "—");
    var np = ((p.prenom || "") + " " + (p.nom || "")).trim();
    return np ? base + " (" + np + ")" : base;
  }
  var triParAcces = false;
  var profils = [], acces = [], counts = {};
  var dureesSemaine = {}, dureesTotales = {}, semainesDispo = [];
  var messagesDiffuses = [], lecturesParMsg = {};
  var adminUid = null;
  var cibleSuppr = null, cibleMdp = null;

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDuree(sec) {
    if (sec == null) return "en cours…";
    if (sec < 60) return sec + " s";
    if (sec < 3600) return Math.round(sec / 60) + " min";
    return (sec / 3600).toFixed(1) + " h";
  }
  function fmtDureeCumul(sec) {
    var s = Math.max(0, Math.round(sec || 0));
    if (s === 0) return "0 min";
    if (s < 60) return s + " s";
    var h = Math.floor(s / 3600);
    var m = Math.round((s % 3600) / 60);
    if (h === 0) return m + " min";
    return m > 0 ? h + " h " + (m < 10 ? "0" + m : m) + " min" : h + " h";
  }
  function dureeLigne(a) {
    if (a.duree_sec != null && a.duree_sec >= 0) return a.duree_sec;
    if (a.debut && a.fin) {
      var diff = Math.round((new Date(a.fin) - new Date(a.debut)) / 1000);
      return diff > 0 ? diff : 0;
    }
    return 0;
  }
  function cleSemaine(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var jour = d.getDay(); /* 0 = dim, 1 = lun ... */
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
    var s = r.data.session;
    if (!s || !estAdminEmail(s.user.email)) { location.replace(cfg.RACINE + "portail.html#connexion"); return; }
    adminUid = s.user.id;
    charge(false);
    setInterval(function () { charge(true); }, 15000);
    try {
      sb.channel("admin-demandes")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, function () { charge(true); })
        .on("postgres_changes", { event: "*", schema: "public", table: "acces" }, function () { charge(true); })
        .subscribe();
      sb.channel("sti-diffusion")
        .on("broadcast", { event: "lu" }, function () { charge(true); })
        .subscribe();
    } catch (err) {}
  });

  /* ---------- Alertes sonores + notifications système ---------- */
  function sonnerNotification() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [587.33, 880].forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.14);
        osc.stop(ctx.currentTime + i * 0.14 + 0.34);
      });
    } catch (err) {}
  }

  function afficherNotifSysteme(titre, corps) {
    sonnerNotification();
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    var opts = {
      body: corps,
      icon: "assets/icons/sti-icon-192.png",
      badge: "assets/icons/sti-icon-192.png",
      tag: "sti-demande-" + Date.now()
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg && reg.showNotification) reg.showNotification(titre, opts);
        else new Notification(titre, opts);
      }).catch(function () {
        try { new Notification(titre, opts); } catch (e) {}
      });
    } else {
      try { new Notification(titre, opts); } catch (e) {}
    }
  }

  function majBoutonNotif() {
    var b = document.getElementById("btn-notif");
    if (!b) return;
    var ok = ("Notification" in window) && Notification.permission === "granted";
    b.classList.toggle("on", ok);
    b.textContent = ok ? "🔔 Notifications actives" : "🔔 Notifications";
  }
  majBoutonNotif();

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
      var detail = contact(p) + " — " + (p.lycee || "—") + " · " + (p.classe || "—");
      if (tel) detail += "\nCode WhatsApp : " + codeWa(tel);
      afficherNotifSysteme("🆕 Nouvelle demande d'inscription STI V2.0", detail);
    });
  }

  document.getElementById("btn-logout").addEventListener("click", function () {
    sb.auth.signOut().then(function () { location.replace(cfg.RACINE + "portail.html#deconnecte"); });
  });
  document.getElementById("btn-refresh").addEventListener("click", function () { charge(false); });
  document.getElementById("btn-stats").addEventListener("click", function () {
    triParAcces = !triParAcces;
    this.classList.toggle("on", triParAcces);
    document.getElementById("stats").classList.toggle("visible", true);
    document.getElementById("note-tri").textContent = triParAcces ? "(triés par nombre d'accès ↓)" : "";
    rendAbonnes();
  });
  document.getElementById("btn-fermer-detail").addEventListener("click", function () {
    document.getElementById("zone-detail").classList.remove("visible");
  });

  function charge(garderMsg) {
    if (!garderMsg) msg("Chargement…", "");
    Promise.all([
      sb.from("profiles").select("*").order("cree_le", { ascending: false }),
      sb.from("acces").select("*").order("debut", { ascending: false }).limit(500),
      fetch("https://ntfy.sh/sti_v2_diffusion_9482/json?poll=1&since=all").then(function (r) { return r.text(); }).catch(function () { return ""; })
    ]).then(function (res) {
      if (res[0].error || res[1].error) { msg("❌ " + (res[0].error || res[1].error).message, "err"); return; }
      var tous = res[0].data || [];
      var tousAcces = res[1].data || [];
      var txtNtfy = res[2] || "";
      var adminIds = {};
      tous.forEach(function (p) { if (estAdminEmail(p.email)) adminIds[p.id] = true; });
      /* L'administrateur n'est jamais affiché dans la liste des abonnés */
      profils = tous.filter(function (p) { return !estAdminEmail(p.email); });

      /* Extraction des messages diffusés et des accusés de lecture (Lu / Non lu) */
      var mapMsg = {};
      lecturesParMsg = {};
      tousAcces.forEach(function (a) {
        var pg = a.page || "";
        if (pg.indexOf("MSG_ENVOI:") === 0) {
          try {
            var m = JSON.parse(a.lieu || "{}");
            if (m && m.id) mapMsg[m.id] = m;
          } catch (e) {}
        } else if (pg.indexOf("MSG_LU:") === 0) {
          var mid = pg.slice(7);
          if (!lecturesParMsg[mid]) lecturesParMsg[mid] = {};
          if (!lecturesParMsg[mid][a.user_id]) lecturesParMsg[mid][a.user_id] = a.debut;
        }
      });

      /* Complément depuis le flux ntfy (annonces et accusés temps réel) */
      txtNtfy.trim().split("\n").forEach(function (ligne) {
        if (!ligne) return;
        try {
          var evt = JSON.parse(ligne);
          if (!evt || !evt.message) return;
          var obj = JSON.parse(evt.message);
          if (obj && obj.id && obj.texte && !obj.type) {
            if (!mapMsg[obj.id]) mapMsg[obj.id] = obj;
          } else if (obj && obj.type === "lu" && obj.msgId && obj.uid) {
            if (!lecturesParMsg[obj.msgId]) lecturesParMsg[obj.msgId] = {};
            if (!lecturesParMsg[obj.msgId][obj.uid]) lecturesParMsg[obj.msgId][obj.uid] = obj.ts;
          }
        } catch (e) {}
      });

      messagesDiffuses = Object.keys(mapMsg).map(function (k) { return mapMsg[k]; }).sort(function (a, b) {
        return String(b.ts || "").localeCompare(String(a.ts || ""));
      });

      acces = tousAcces.filter(function (a) {
        var pg = a.page || "";
        return !adminIds[a.user_id] && pg.indexOf("MSG_ENVOI:") !== 0 && pg.indexOf("MSG_LU:") !== 0;
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
      });

      semainesDispo = Object.keys(mapSem).sort().reverse();
      majSelectSemaine();

      document.getElementById("s-total").textContent = profils.length;
      document.getElementById("s-actifs").textContent = profils.filter(function (p) { return p.statut === "actif"; }).length;
      document.getElementById("s-attente").textContent = profils.filter(function (p) { return p.statut === "en_attente"; }).length;
      document.getElementById("s-connex").textContent = acces.length;
      rendAbonnes();
      rendSuiviMessages();
      rendAcces();
      verifierNouvellesDemandes();
      if (!garderMsg) msg("✅ " + profils.length + " abonné(s), " + acces.length + " connexion(s) journalisée(s).", "ok");
    });
  }

  var selSemaine = document.getElementById("sel-semaine");
  if (selSemaine) {
    selSemaine.addEventListener("change", rendAbonnes);
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

  function rendAbonnes() {
    var liste = profils.slice();
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
      tdVide.colSpan = 7;
      tdVide.style.cssText = "text-align:center;color:#7a6f5d;padding:18px;";
      tdVide.textContent = "Aucun abonné inscrit pour le moment.";
      trVide.appendChild(tdVide);
      tb.appendChild(trVide);
      return;
    }
    liste.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.title = "Cliquer pour voir toutes ses connexions et durées par semaine";
      tr.addEventListener("click", function () { detail(p); });

      var tel = telDeProfil(p);
      var td1 = document.createElement("td");
      td1.style.fontWeight = "700";
      td1.textContent = tel ? "📱 " + tel : (p.email || "—");
      if (p.nom || p.prenom) {
        var petit = document.createElement("div");
        petit.style.cssText = "font-weight:700;font-size:11.5px;color:#23201a;margin-top:2px;";
        petit.textContent = "👤 " + ((p.prenom || "") + " " + (p.nom || "")).trim();
        td1.appendChild(petit);
      }
      if (tel) {
        var codeDiv = document.createElement("div");
        codeDiv.style.cssText = "font-weight:800;font-size:11px;color:#f4511e;margin-top:2px;";
        codeDiv.textContent = "🔢 Code WhatsApp : " + codeWa(tel);
        td1.appendChild(codeDiv);
      }

      var tdL = document.createElement("td");
      tdL.textContent = (p.lycee || "—") + " · " + (p.classe || "—");
      tdL.style.color = "#7a6f5d";

      var td2 = document.createElement("td");
      var nb = document.createElement("span"); nb.className = "nb"; nb.textContent = counts[p.id] || 0;
      td2.appendChild(nb);

      var tdDur = document.createElement("td");
      var secSem = dureePourAbonne(p.id);
      var secTot = dureesTotales[p.id] || 0;
      var bDur = document.createElement("span");
      bDur.style.cssText = "display:inline-block;background:" + (secSem > 0 ? "rgba(244,81,30,.13)" : "#f3ead9") +
        ";color:" + (secSem > 0 ? "#d84315" : "#7a6f5d") +
        ";border-radius:999px;padding:4px 10px;font-weight:900;font-size:12px;";
      bDur.textContent = "⏱️ " + fmtDureeCumul(secSem);
      tdDur.appendChild(bDur);
      if (selSemaine && selSemaine.value !== "*" && secTot > 0) {
        var totSub = document.createElement("div");
        totSub.style.cssText = "font-size:10.5px;color:#7a6f5d;font-weight:700;margin-top:3px;";
        totSub.textContent = "Cumul : " + fmtDureeCumul(secTot);
        tdDur.appendChild(totSub);
      }

      var td3 = document.createElement("td");
      var st = document.createElement("span"); st.className = "st " + p.statut; st.textContent = LIB[p.statut] || p.statut;
      td3.appendChild(st);

      var td4 = document.createElement("td"); td4.textContent = fmtDate(p.cree_le);

      var td5 = document.createElement("td");
      function bouton(txt, fn, cls, titre) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "act" + (cls ? " " + cls : ""); b.textContent = txt;
        if (titre) b.title = titre;
        b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
        td5.appendChild(b);
      }
      bouton("✅", function () { changeStatut(p, "actif"); }, "", "Activer l'abonné");
      bouton("⏳", function () { changeStatut(p, "en_attente"); }, "", "Mettre en attente");
      bouton("⛔", function () { changeStatut(p, "exclu"); }, "", "Exclure l'abonné");
      if (tel) {
        bouton("💬", function () { envoyerCodeWhatsApp(p, tel); }, "", "Envoyer le code de confirmation par WhatsApp");
      }
      bouton("🔑", function () { nouveauMdp(p); }, "", "Définir un nouveau mot de passe");
      bouton("🔎", function () { detail(p); }, "", "Voir l'historique des connexions");
      bouton("🗑️", function () { supprimer(p); }, "del", "Supprimer définitivement");

      tr.append(td1, tdL, td2, tdDur, td3, td4, td5);
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

  function rendAcces() {
    var emails = {};
    profils.forEach(function (p) { emails[p.id] = contact(p); });
    var ta = document.getElementById("tb-acces");
    ta.innerHTML = "";
    acces.slice(0, 50).forEach(function (a) {
      var tr = document.createElement("tr");
      [emails[a.user_id] || a.user_id, fmtDate(a.debut), fmtDuree(a.duree_sec), a.lieu || "—", a.page || "—"].forEach(function (v) {
        var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
      });
      ta.appendChild(tr);
    });
  }

  /* ---------- Tableau de suivi de lecture des messages (Lu / Non lu) ---------- */
  var selSuiviMsg = document.getElementById("sel-suivi-msg");
  if (selSuiviMsg) {
    selSuiviMsg.addEventListener("change", afficherTableauSuivi);
  }

  function rendSuiviMessages() {
    if (!selSuiviMsg) return;
    var valPrec = selSuiviMsg.value;
    selSuiviMsg.innerHTML = "";
    if (!messagesDiffuses.length) {
      var opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Aucun message diffusé pour le moment";
      selSuiviMsg.appendChild(opt0);
      afficherTableauSuivi();
      return;
    }
    messagesDiffuses.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m.id;
      var libCl = m.classe === "*" ? "Toutes les classes" : m.classe;
      var court = (m.texte || "").replace(/\s+/g, " ").slice(0, 42);
      opt.textContent = "[" + libCl + " · " + fmtDate(m.ts) + "] " + court + ((m.texte || "").length > 42 ? "…" : "");
      selSuiviMsg.appendChild(opt);
    });
    if (valPrec && messagesDiffuses.some(function (m) { return m.id === valPrec; })) {
      selSuiviMsg.value = valPrec;
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
    var msgObj = null;
    messagesDiffuses.forEach(function (m) { if (m.id === mid) msgObj = m; });
    if (!msgObj) {
      if (resEl) resEl.textContent = "";
      if (apEl) apEl.style.display = "none";
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 4;
      td0.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      td0.textContent = "Diffusez un message via « 📢 Message par classe » pour suivre ici qui l'a lu ou non.";
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
    var nbLu = 0, nbNonLu = 0;

    if (!cibles.length) {
      var trV = document.createElement("tr");
      var tdV = document.createElement("td");
      tdV.colSpan = 4;
      tdV.style.cssText = "text-align:center;color:#7a6f5d;padding:16px;";
      tdV.textContent = "Aucun abonné inscrit dans cette classe.";
      trV.appendChild(tdV);
      tb.appendChild(trV);
    }

    cibles.forEach(function (p) {
      var dateLu = mapLu[p.id];
      if (dateLu) nbLu++; else nbNonLu++;

      var tr = document.createElement("tr");
      var tdNom = document.createElement("td");
      tdNom.style.fontWeight = "700";
      tdNom.textContent = contact(p);

      var tdCl = document.createElement("td");
      tdCl.style.color = "#7a6f5d";
      tdCl.textContent = (p.lycee || "—") + " · " + (p.classe || "—");

      var tdEtat = document.createElement("td");
      var badge = document.createElement("span");
      badge.className = "st " + (dateLu ? "actif" : "en_attente");
      badge.textContent = dateLu ? "✅ Lu" : "⏳ Non lu (en attente)";
      tdEtat.appendChild(badge);

      var tdDate = document.createElement("td");
      tdDate.textContent = dateLu ? fmtDate(dateLu) : "En attente de réponse…";
      tdDate.style.color = dateLu ? "#177245" : "#b47d09";
      tdDate.style.fontWeight = "700";

      tr.append(tdNom, tdCl, tdEtat, tdDate);
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

  function changeStatut(p, statut) {
    sb.from("profiles").update({ statut: statut }).eq("id", p.id).then(function (r) {
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      msg("✅ " + contact(p) + " → " + LIB[statut], "ok");
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

  /* ---------- Boîte modale : message groupé à toute une classe ---------- */
  var modalClasse = document.getElementById("modal-classe");
  var selClasse = document.getElementById("msg-classe");
  var txtClasse = document.getElementById("msg-texte");
  var zoneWaClasse = document.getElementById("zone-wa-classe");
  var listeWaClasse = document.getElementById("liste-wa-classe");
  var CANAL_DIFFUSION = "sti_v2_diffusion_9482";

  function abonnesDeClasse(cl) {
    if (!cl || cl === "*") return profils.slice();
    return profils.filter(function (p) { return (p.classe || "—") === cl; });
  }

  function remplirClasses() {
    var classesBase = ["3eme SI1", "3eme SI2", "4eme SI1", "4eme SI2"];
    profils.forEach(function (p) {
      var c = p.classe || "";
      if (c && classesBase.indexOf(c) === -1) classesBase.push(c);
    });
    var valPrec = selClasse.value;
    selClasse.innerHTML = "";
    var optTous = document.createElement("option");
    optTous.value = "*";
    optTous.textContent = "Toutes les classes (" + profils.length + " abonné(s))";
    selClasse.appendChild(optTous);
    classesBase.forEach(function (c) {
      var nb = abonnesDeClasse(c).length;
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c + " (" + nb + " abonné(s))";
      selClasse.appendChild(opt);
    });
    if (valPrec) selClasse.value = valPrec;
    majListeWaClasse();
  }

  function majListeWaClasse() {
    var cibles = abonnesDeClasse(selClasse.value).filter(function (p) { return !!telDeProfil(p); });
    listeWaClasse.innerHTML = "";
    if (!cibles.length) {
      zoneWaClasse.style.display = "none";
      return;
    }
    zoneWaClasse.style.display = "block";
    cibles.forEach(function (p) {
      var tel = telDeProfil(p);
      var row = document.createElement("div");
      row.className = "wa-item";
      var sp = document.createElement("span");
      sp.textContent = contact(p);
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "💬 Envoyer";
      b.addEventListener("click", function () {
        var texte = txtClasse.value.trim();
        if (!texte) { msg("❌ Saisissez d'abord le message à envoyer.", "err"); txtClasse.focus(); return; }
        var ch = tel.replace(/\D/g, "");
        var entete = "📢 *Message STI V2.0 (" + (selClasse.value === "*" ? "Toutes les classes" : selClasse.value) + ")* :\n";
        window.open("https://wa.me/" + ch + "?text=" + encodeURIComponent(entete + texte), "_blank", "noopener");
        b.textContent = "✓ Ouvert";
        b.classList.add("envoye");
      });
      row.append(sp, b);
      listeWaClasse.appendChild(row);
    });
  }

  selClasse.addEventListener("change", majListeWaClasse);
  document.getElementById("btn-msg-classe").addEventListener("click", function () {
    remplirClasses();
    modalClasse.classList.add("visible");
    setTimeout(function () { txtClasse.focus(); }, 30);
  });
  document.getElementById("btn-fermer-classe").addEventListener("click", function () {
    arreterDictee();
    modalClasse.classList.remove("visible");
  });

  /* ---------- Dictée vocale du message (sans répétition + bouton Effacer) ---------- */
  var btnDicter = document.getElementById("btn-dicter-msg");
  var btnEffacer = document.getElementById("btn-effacer-msg");
  var selLangDictee = document.getElementById("lang-dictee");
  var RecoVocale = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recoInstance = null;
  var enEcoute = false;
  var texteBase = "";
  var dernierSegment = "";

  function formaterPonctuation(t) {
    return t
      .replace(/\s+à la ligne\b/gi, "\n")
      .replace(/\s+point d'interrogation\b/gi, " ?")
      .replace(/\s+point d'exclamation\b/gi, " !")
      .replace(/\s+deux[- ]points\b/gi, " :")
      .replace(/\s+virgule\b/gi, ",")
      .replace(/\s+point\b/gi, ".")
      /* supprime les doublons consécutifs produits par certains moteurs mobiles */
      .replace(/\b(\S+)(?:\s+\1\b)+/gi, "$1");
  }

  function joindreSansDoublon(base, ajout) {
    var b = (base || "").trim();
    var a = (ajout || "").trim();
    if (!b) return a;
    if (!a) return b;
    var bMin = b.toLowerCase();
    var aMin = a.toLowerCase();
    if (bMin.slice(-aMin.length) === aMin) return b;
    if (aMin.indexOf(bMin) === 0) return a;
    var motsB = b.split(/\s+/);
    var motsA = a.split(/\s+/);
    var maxK = Math.min(motsB.length, motsA.length);
    for (var k = maxK; k >= 1; k--) {
      var finB = motsB.slice(motsB.length - k).join(" ").toLowerCase();
      var debA = motsA.slice(0, k).join(" ").toLowerCase();
      if (finB === debA) {
        var reste = motsA.slice(k).join(" ");
        return reste ? b + " " + reste : b;
      }
    }
    return b + " " + a;
  }

  function arreterDictee() {
    enEcoute = false;
    dernierSegment = "";
    if (recoInstance) {
      try { recoInstance.onend = null; recoInstance.stop(); } catch (e) {}
      recoInstance = null;
    }
    if (btnDicter) {
      btnDicter.classList.remove("ecoute");
      btnDicter.textContent = "🎙️ Dicter";
    }
  }

  if (btnEffacer) {
    btnEffacer.addEventListener("click", function () {
      txtClasse.value = "";
      texteBase = "";
      dernierSegment = "";
      txtClasse.focus();
    });
  }

  function demarrerCycleReco() {
    if (!enEcoute || !RecoVocale) return;
    recoInstance = new RecoVocale();
    recoInstance.lang = (selLangDictee && selLangDictee.value) || "fr-FR";
    /* continuous=false évite le bug Android/Chrome qui cumule et répète chaque mot */
    recoInstance.continuous = false;
    recoInstance.interimResults = true;
    recoInstance.maxAlternatives = 1;
    dernierSegment = "";

    recoInstance.onresult = function (evt) {
      var dernier = evt.results[evt.results.length - 1];
      if (!dernier || !dernier[0]) return;
      var seg = formaterPonctuation(dernier[0].transcript || "");
      dernierSegment = seg;
      txtClasse.value = joindreSansDoublon(texteBase, seg);
      if (dernier.isFinal) {
        texteBase = txtClasse.value;
        dernierSegment = "";
      }
    };
    recoInstance.onerror = function (evt) {
      if (evt.error === "not-allowed" || evt.error === "service-not-allowed") {
        msg("❌ Autorisez l'accès au microphone dans votre navigateur pour dicter.", "err");
        arreterDictee();
      }
    };
    recoInstance.onend = function () {
      if (dernierSegment) {
        texteBase = joindreSansDoublon(texteBase, dernierSegment);
        txtClasse.value = texteBase;
        dernierSegment = "";
      }
      if (enEcoute) {
        try { recoInstance.start(); } catch (e) { setTimeout(demarrerCycleReco, 120); }
      }
    };
    try {
      recoInstance.start();
    } catch (e) {
      arreterDictee();
    }
  }

  if (btnDicter) {
    btnDicter.addEventListener("click", function () {
      if (!RecoVocale) {
        msg("⚠️ La dictée vocale n'est pas prise en charge par ce navigateur (utilisez Chrome ou Edge).", "err");
        return;
      }
      if (enEcoute) {
        arreterDictee();
        return;
      }
      texteBase = (txtClasse.value || "").trim();
      enEcoute = true;
      btnDicter.classList.add("ecoute");
      btnDicter.textContent = "🔴 Arrêter";
      demarrerCycleReco();
    });
  }

  /* Envoi par e-mail groupé (BCC) à tous les abonnés e-mail de la classe */
  document.getElementById("btn-mail-classe").addEventListener("click", function () {
    var texte = txtClasse.value.trim();
    if (!texte) { msg("❌ Saisissez d'abord le message à envoyer.", "err"); txtClasse.focus(); return; }
    var cl = selClasse.value;
    var libCl = cl === "*" ? "Toutes les classes" : cl;
    var mails = abonnesDeClasse(cl)
      .map(function (p) { return p.email; })
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

  /* Diffusion directe sur le site STI V2.0 (affichée sur l'écran de tous les élèves de la classe) */
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
