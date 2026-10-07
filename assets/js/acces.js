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
    if (!session) {
      /* hors-ligne : session locale déjà validée précédemment sur cet appareil */
      if (localStorage.getItem("sti-offline")) return;
      location.replace(PORTAIL + "#connexion"); return;
    }
    var user = session.user;
    if (user.email === cfg.ADMIN) { badgeAdmin(); journal(user.id); return; }
    sb.from("profiles").select("statut").eq("id", user.id).maybeSingle().then(function (rp) {
      /* réseau absent mais session valide : on laisse passer (mode hors-ligne) */
      if (rp.error) { verrouBio(user, function () { journal(user.id); }); return; }
      var st = rp.data && rp.data.statut;
      if (st === "actif") { verrouBio(user, function () { journal(user.id); }); return; }
      if (st === "en_attente") { sb.auth.signOut(); location.replace(PORTAIL + "#attente"); return; }
      sb.auth.signOut(); location.replace(PORTAIL + "#refuse");
    });
  });

  /* ---------- badge ADMIN visible sur tout le site ---------- */
  function badgeAdmin() {
    var b = document.createElement("a");
    b.href = PORTAIL.replace("portail.html", "admin.html");
    b.textContent = "⚙️ ADMIN";
    b.title = "Tableau de bord administrateur";
    b.style.cssText = "position:fixed;top:10px;right:10px;z-index:2147483646;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border:2px solid #23201a;border-radius:999px;padding:7px 14px;font:900 12px/1 system-ui,'Segoe UI',sans-serif;letter-spacing:1px;text-decoration:none;box-shadow:3px 3px 0 #23201a;";
    document.documentElement.appendChild(b);
  }

  /* ---------- verrou biométrique (abonnés ayant activé l'option) ---------- */
  function verrouBio(user, suite) {
    if (user.email === cfg.ADMIN || !localStorage.getItem("sti-bio")) { suite(); return; }
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
