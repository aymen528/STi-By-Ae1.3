/* STI v2 — tableau de bord admin : abonnés + journal des accès */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
  var elMsg = document.getElementById("msg");
  function msg(t, c) { elMsg.textContent = t; elMsg.className = "msg" + (c ? " " + c : ""); }

  var LIB = { actif: "Actif", en_attente: "En attente", suspendu: "En attente (suspendu)", exclu: "Exclu" };

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

  function charge() {
    msg("Chargement…", "");
    Promise.all([
      sb.from("profiles").select("*").order("cree_le", { ascending: false }),
      sb.from("acces").select("*").order("debut", { ascending: false }).limit(200)
    ]).then(function (res) {
      if (res[0].error || res[1].error) { msg("❌ " + (res[0].error || res[1].error).message, "err"); return; }
      var profils = res[0].data, acces = res[1].data;
      var emails = {};
      profils.forEach(function (p) { emails[p.id] = p.email; });

      var tb = document.getElementById("tb-abonnes");
      tb.innerHTML = "";
      profils.forEach(function (p) {
        var tr = document.createElement("tr");
        var td1 = document.createElement("td"); td1.textContent = p.email + (p.email === cfg.ADMIN ? " (admin)" : "");
        var td2 = document.createElement("td");
        var st = document.createElement("span"); st.className = "st " + p.statut; st.textContent = LIB[p.statut] || p.statut; td2.appendChild(st);
        var td3 = document.createElement("td"); td3.textContent = fmtDate(p.cree_le);
        var td4 = document.createElement("td");
        [["actif", "✅ Accepter"], ["en_attente", "⏳ Attente"], ["exclu", "⛔ Exclure"]].forEach(function (a) {
          var b = document.createElement("button");
          b.type = "button"; b.className = "act"; b.textContent = a[1];
          b.addEventListener("click", function () { changeStatut(p.id, a[0], p.email); });
          td4.appendChild(b);
        });
        tr.append(td1, td2, td3, td4);
        tb.appendChild(tr);
      });

      var ta = document.getElementById("tb-acces");
      ta.innerHTML = "";
      acces.forEach(function (a) {
        var tr = document.createElement("tr");
        [emails[a.user_id] || a.user_id, fmtDate(a.debut), fmtDuree(a.duree_sec), a.lieu || "—", a.page || "—"].forEach(function (v) {
          var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
        });
        ta.appendChild(tr);
      });
      msg("✅ " + profils.length + " abonné(s), " + acces.length + " accès journalisé(s).", "ok");
    });
  }

  function changeStatut(id, statut, email) {
    sb.from("profiles").update({ statut: statut }).eq("id", id).then(function (r) {
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      msg("✅ " + email + " → " + LIB[statut], "ok");
      charge();
    });
  }
})();
