/* STI v2 — tableau de bord admin : stats, tri, compteur, détail connexions, mot de passe */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
  var elMsg = document.getElementById("msg");
  function msg(t, c) { elMsg.textContent = t; elMsg.className = "msg" + (c ? " " + c : ""); }

  var LIB = { actif: "Actif", en_attente: "En attente", suspendu: "Suspendu", exclu: "Exclu" };
  function contact(p) { return p.email || p.phone || "—"; }
  var triParAcces = false;
  var profils = [], acces = [], counts = {};

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
    if (!s || s.user.email !== cfg.ADMIN) { location.replace(cfg.RACINE + "portail.html#connexion"); return; }
    charge();
  });

  document.getElementById("btn-logout").addEventListener("click", function () {
    sb.auth.signOut().then(function () { location.replace(cfg.RACINE + "portail.html#deconnecte"); });
  });
  document.getElementById("btn-refresh").addEventListener("click", charge);
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

  function charge() {
    msg("Chargement…", "");
    Promise.all([
      sb.from("profiles").select("*").order("cree_le", { ascending: false }),
      sb.from("acces").select("*").order("debut", { ascending: false }).limit(500)
    ]).then(function (res) {
      if (res[0].error || res[1].error) { msg("❌ " + (res[0].error || res[1].error).message, "err"); return; }
      profils = res[0].data; acces = res[1].data;
      counts = {};
      acces.forEach(function (a) { counts[a.user_id] = (counts[a.user_id] || 0) + 1; });
      document.getElementById("s-total").textContent = profils.length;
      document.getElementById("s-actifs").textContent = profils.filter(function (p) { return p.statut === "actif"; }).length;
      document.getElementById("s-attente").textContent = profils.filter(function (p) { return p.statut === "en_attente"; }).length;
      document.getElementById("s-connex").textContent = acces.length;
      rendAbonnes();
      rendAcces();
      msg("✅ " + profils.length + " abonné(s), " + acces.length + " connexion(s) journalisée(s).", "ok");
    });
  }

  function rendAbonnes() {
    var liste = profils.slice();
    if (triParAcces) liste.sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); });
    var tb = document.getElementById("tb-abonnes");
    tb.innerHTML = "";
    liste.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.title = "Cliquer pour voir toutes ses connexions";
      tr.addEventListener("click", function () { detail(p); });

      var td1 = document.createElement("td");
      td1.style.fontWeight = "700";
      td1.textContent = p.email
        ? p.email + (p.email === cfg.ADMIN ? " (admin)" : "")
        : "📱 " + (p.phone || "—");
      if (p.nom || p.prenom) {
        var petit = document.createElement("div");
        petit.style.cssText = "font-weight:600;font-size:11px;color:#7a6f5d;";
        petit.textContent = ((p.prenom || "") + " " + (p.nom || "")).trim();
        td1.appendChild(petit);
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
      function bouton(txt, fn) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "act"; b.textContent = txt;
        b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
        td5.appendChild(b);
      }
      bouton("✅", function () { changeStatut(p, "actif"); });
      bouton("⏳", function () { changeStatut(p, "en_attente"); });
      bouton("⛔", function () { changeStatut(p, "exclu"); });
      bouton("🔑", function () { nouveauMdp(p); });
      bouton("🔎", function () { detail(p); });
      bouton("🗑️", function () { supprimer(p); });

      tr.append(td1, tdL, td2, td3, td4, td5);
      tb.appendChild(tr);
    });
  }

  function rendAcces() {
    var emails = {};
    profils.forEach(function (p) { emails[p.id] = p.email || p.phone; });
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
      charge();
    });
  }

  function nouveauMdp(p) {
    var mdp = window.prompt("Nouveau mot de passe pour " + contact(p) + " :\n(min. 6 caractères — l'ancien mot de passe n'est jamais visible, par sécurité)");
    if (!mdp) return;
    if (mdp.length < 6) { msg("❌ Mot de passe trop court (6 caractères minimum).", "err"); return; }
    sb.rpc("admin_set_password", { uid: p.id, newpass: mdp }).then(function (r) {
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      msg("🔑 Mot de passe de " + contact(p) + " défini.", "ok");
    });
  }

  function supprimer(p) {
    if (p.email === cfg.ADMIN) { msg("❌ Impossible de supprimer le compte administrateur.", "err"); return; }
    if (!window.confirm("Supprimer définitivement l'abonné " + contact(p) + " ?\nSon profil et tout son journal de connexions seront effacés.")) return;
    if (!window.confirm("Dernière vérification : confirmez la suppression de " + contact(p) + ".")) return;
    sb.rpc("admin_supprimer_abonne", { uid: p.id }).then(function (r) {
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      msg("🗑️ " + contact(p) + " supprimé définitivement.", "ok");
      charge();
    });
  }
})();
