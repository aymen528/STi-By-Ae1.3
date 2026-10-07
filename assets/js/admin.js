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

  sb.auth.getSession().then(function (r) {
    var s = r.data.session;
    if (!s || !estAdminEmail(s.user.email)) { location.replace(cfg.RACINE + "portail.html#connexion"); return; }
    charge(false);
    setInterval(function () { charge(true); }, 15000);
    try {
      sb.channel("admin-demandes")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, function () {
          charge(true);
        })
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
      sb.from("acces").select("*").order("debut", { ascending: false }).limit(500)
    ]).then(function (res) {
      if (res[0].error || res[1].error) { msg("❌ " + (res[0].error || res[1].error).message, "err"); return; }
      var tous = res[0].data || [];
      var adminIds = {};
      tous.forEach(function (p) { if (estAdminEmail(p.email)) adminIds[p.id] = true; });
      /* L'administrateur n'est jamais affiché dans la liste des abonnés */
      profils = tous.filter(function (p) { return !estAdminEmail(p.email); });
      acces = (res[1].data || []).filter(function (a) { return !adminIds[a.user_id]; });
      counts = {};
      acces.forEach(function (a) { counts[a.user_id] = (counts[a.user_id] || 0) + 1; });
      document.getElementById("s-total").textContent = profils.length;
      document.getElementById("s-actifs").textContent = profils.filter(function (p) { return p.statut === "actif"; }).length;
      document.getElementById("s-attente").textContent = profils.filter(function (p) { return p.statut === "en_attente"; }).length;
      document.getElementById("s-connex").textContent = acces.length;
      rendAbonnes();
      rendAcces();
      verifierNouvellesDemandes();
      if (!garderMsg) msg("✅ " + profils.length + " abonné(s), " + acces.length + " connexion(s) journalisée(s).", "ok");
    });
  }

  function rendAbonnes() {
    var liste = profils.slice();
    if (triParAcces) liste.sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); });
    var tb = document.getElementById("tb-abonnes");
    tb.innerHTML = "";
    if (!liste.length) {
      var trVide = document.createElement("tr");
      var tdVide = document.createElement("td");
      tdVide.colSpan = 6;
      tdVide.style.cssText = "text-align:center;color:#7a6f5d;padding:18px;";
      tdVide.textContent = "Aucun abonné inscrit pour le moment.";
      trVide.appendChild(tdVide);
      tb.appendChild(trVide);
      return;
    }
    liste.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.title = "Cliquer pour voir toutes ses connexions";
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

      tr.append(td1, tdL, td2, td3, td4, td5);
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

  function detail(p) {
    document.getElementById("detail-email").textContent = contact(p);
    var td = document.getElementById("tb-detail");
    td.innerHTML = "";
    var lignes = acces.filter(function (a) { return a.user_id === p.id; });
    if (!lignes.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td"); td0.colSpan = 5; td0.textContent = "Aucune connexion enregistrée pour cet abonné.";
      tr0.appendChild(td0); td.appendChild(tr0);
    }
    lignes.forEach(function (a) {
      var tr = document.createElement("tr");
      [fmtDate(a.debut), fmtDate(a.fin), fmtDuree(a.duree_sec), a.lieu || "—", a.page || "—"].forEach(function (v) {
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
    modalClasse.classList.remove("visible");
  });

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
    try {
      sb.channel("sti-diffusion").send({ type: "broadcast", event: "annonce", payload: payload });
    } catch (e) {}
    fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "🔔 Diffuser sur le site";
      modalClasse.classList.remove("visible");
      txtClasse.value = "";
      msg("📢 Message diffusé sur le site pour « " + libCl + " » !", "ok");
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = "🔔 Diffuser sur le site";
      modalClasse.classList.remove("visible");
      msg("📢 Message diffusé en temps réel pour « " + libCl + " ».", "ok");
    });
  });
})();
