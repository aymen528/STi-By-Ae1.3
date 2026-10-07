/* STI v2 — portail d'accès : captcha, connexion, inscription, mot de passe oublié */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);

  /* ---------- petit captcha maison ---------- */
  function fabriqueCaptcha(canvasId, btnId, stock) {
    var canvas = document.getElementById(canvasId);
    var ctx = canvas.getContext("2d");
    var ETATS = {};
    function nouveau() {
      var car = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      var code = "";
      for (var i = 0; i < 5; i++) code += car[Math.floor(Math.random() * car.length)];
      ETATS[canvasId] = code;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0e1220";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var l = 0; l < 3; l++) {
        ctx.strokeStyle = "rgba(255,138,80," + (0.15 + Math.random() * 0.2) + ")";
        ctx.beginPath();
        ctx.moveTo(Math.random() * 150, Math.random() * 44);
        ctx.lineTo(Math.random() * 150, Math.random() * 44);
        ctx.stroke();
      }
      for (var c = 0; c < 5; c++) {
        ctx.save();
        ctx.translate(20 + c * 26, 24 + (Math.random() * 8 - 4));
        ctx.rotate((Math.random() * 40 - 20) * Math.PI / 180);
        ctx.font = "800 " + (18 + Math.random() * 5) + "px system-ui";
        ctx.fillStyle = c % 2 ? "#ff8a50" : "#eef0f9";
        ctx.fillText(code[c], -7, 7);
        ctx.restore();
      }
    }
    document.getElementById(btnId).addEventListener("click", nouveau);
    nouveau();
    return {
      ok: function (saisie) {
        return saisie.trim().toUpperCase() === ETATS[canvasId];
      },
      reset: nouveau
    };
  }
  var cap1 = fabriqueCaptcha("captcha-canvas", "captcha-refresh");
  var cap2 = fabriqueCaptcha("captcha-canvas2", "captcha-refresh2");

  /* ---------- onglets ---------- */
  var tabs = { "tab-connexion": "f-connexion", "tab-inscription": "f-inscription", "tab-oubli": "f-oubli" };
  Object.keys(tabs).forEach(function (id) {
    document.getElementById(id).addEventListener("click", function () {
      Object.keys(tabs).forEach(function (t) {
        document.getElementById(tabs[t]).hidden = t !== id;
        document.getElementById(t).classList.toggle("actif", t === id);
      });
      msg("", "");
    });
  });

  /* ---------- messages ---------- */
  var elMsg = document.getElementById("msg");
  function msg(texte, classe) {
    elMsg.textContent = texte;
    elMsg.className = "msg" + (classe ? " " + classe : "");
  }

  /* messages transmis par le verrou (#attente, #refuse…) */
  var h = location.hash.replace("#", "");
  if (h === "attente") msg("⏳ Votre compte attend la validation par l'administrateur.", "att");
  if (h === "refuse") msg("⛔ Accès refusé ou compte exclu. Contactez l'administrateur.", "err");
  if (h === "connexion") msg("🔒 Connexion requise pour accéder à la plateforme.", "att");
  if (h === "deconnecte") msg("Vous êtes déconnecté(e). À bientôt !", "ok");

  /* ---------- connexion ---------- */
  document.getElementById("f-connexion").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!cap1.ok(document.getElementById("c-captcha").value)) {
      msg("❌ Code captcha incorrect.", "err"); cap1.reset();
      document.getElementById("c-captcha").value = "";
      return;
    }
    var btn = e.target.querySelector(".btn"); btn.disabled = true;
    sb.auth.signInWithPassword({
      email: document.getElementById("c-email").value.trim(),
      password: document.getElementById("c-mdp").value
    }).then(function (r) {
      btn.disabled = false;
      if (r.error) { msg("❌ " + (r.error.message.indexOf("Invalid") === 0 ? "E-mail ou mot de passe incorrect." : r.error.message), "err"); return; }
      if (r.data.user.email === cfg.ADMIN) { location.href = cfg.RACINE + "admin.html"; return; }
      sb.from("profiles").select("statut").eq("id", r.data.user.id).maybeSingle().then(function (rp) {
        var st = rp.data && rp.data.statut;
        if (st === "actif") { location.href = cfg.RACINE; return; }
        if (st === "en_attente") { msg("⏳ Compte créé — en attente de validation par l'administrateur.", "att"); sb.auth.signOut(); return; }
        msg("⛔ Compte suspendu ou exclu.", "err"); sb.auth.signOut();
      });
    });
  });

  /* ---------- inscription ---------- */
  document.getElementById("f-inscription").addEventListener("submit", function (e) {
    e.preventDefault();
    var mdp = document.getElementById("i-mdp").value;
    if (mdp !== document.getElementById("i-mdp2").value) { msg("❌ Les deux mots de passe diffèrent.", "err"); return; }
    if (!cap2.ok(document.getElementById("i-captcha").value)) {
      msg("❌ Code captcha incorrect.", "err"); cap2.reset();
      document.getElementById("i-captcha").value = "";
      return;
    }
    var btn = e.target.querySelector(".btn"); btn.disabled = true;
    sb.auth.signUp({
      email: document.getElementById("i-email").value.trim(),
      password: mdp
    }).then(function (r) {
      btn.disabled = false;
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      if (r.data.session) sb.auth.signOut(); /* le compte repasse en attente ; l'admin valide */
      msg("✅ Inscription reçue ! Votre accès sera activé après validation par l'administrateur.", "ok");
      e.target.reset(); cap2.reset();
    });
  });

  /* ---------- mot de passe oublié ---------- */
  document.getElementById("f-oubli").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = e.target.querySelector(".btn"); btn.disabled = true;
    sb.auth.resetPasswordForEmail(document.getElementById("o-email").value.trim(), {
      redirectTo: cfg.RACINE + "portail.html"
    }).then(function (r) {
      btn.disabled = false;
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      msg("📧 Lien de réinitialisation envoyé (vérifiez votre boîte mail).", "ok");
    });
  });
})();
