/* STI v2 — verrou d'accès + journal des accès (lieu, date, durée)
   Chargé sur toutes les pages SAUF portail.html et admin.html. */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  if (!cfg || cfg.URL.indexOf("https://") !== 0) return; /* pas encore configuré */
  var chemin = location.pathname.split("/").pop() || "index.html";
  if (chemin === "portail.html" || chemin === "admin.html") return;

  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
  var PORTAIL = cfg.RACINE + "portail.html";

  sb.auth.getSession().then(function (r) {
    var session = r.data.session;
    if (!session) { location.replace(PORTAIL + "#connexion"); return; }
    var user = session.user;
    if (user.email === cfg.ADMIN) { journal(user.id); return; }
    sb.from("profiles").select("statut").eq("id", user.id).maybeSingle().then(function (rp) {
      var st = rp.data && rp.data.statut;
      if (st === "actif") { journal(user.id); return; }
      if (st === "en_attente") { sb.auth.signOut(); location.replace(PORTAIL + "#attente"); return; }
      sb.auth.signOut(); location.replace(PORTAIL + "#refuse");
    });
  });

  /* ---------- journal : lieu + durée ---------- */
  function journal(uid) {
    var lieu = "inconnu";
    function insere() {
      sb.from("acces").insert({ user_id: uid, lieu: lieu, page: chemin }).select("id").single().then(function (r) {
        if (r.error || !r.data) return;
        var id = r.data.id, debut = Date.now();
        function ferme() {
          sb.from("acces").update({
            fin: new Date().toISOString(),
            duree_sec: Math.round((Date.now() - debut) / 1000)
          }).eq("id", id).then(function () {});
        }
        setInterval(ferme, 60000);                       /* cœur : maj durée toutes les 60 s */
        window.addEventListener("beforeunload", ferme);
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "hidden") ferme();
        });
      });
    }
    fetch("https://ipapi.co/json/").then(function (r) { return r.json(); }).then(function (j) {
      lieu = (j.city || "") + (j.country_name ? ", " + j.country_name : "") || "inconnu";
      insere();
    }).catch(function () { insere(); });
  }
})();
