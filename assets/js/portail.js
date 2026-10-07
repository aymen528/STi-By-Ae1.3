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
      ctx.fillStyle = "rgba(8,12,26,.85)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var p = 0; p < 26; p++) {
        ctx.fillStyle = "rgba(212,169,78," + (0.08 + Math.random() * 0.14) + ")";
        ctx.beginPath();
        ctx.arc(Math.random() * 150, Math.random() * 46, 1 + Math.random() * 1.6, 0, 7);
        ctx.fill();
      }
      for (var l = 0; l < 3; l++) {
        ctx.strokeStyle = "rgba(240,207,126," + (0.14 + Math.random() * 0.18) + ")";
        ctx.beginPath();
        ctx.moveTo(Math.random() * 150, Math.random() * 46);
        ctx.lineTo(Math.random() * 150, Math.random() * 46);
        ctx.stroke();
      }
      for (var c = 0; c < 5; c++) {
        ctx.save();
        ctx.translate(20 + c * 26, 25 + (Math.random() * 8 - 4));
        ctx.rotate((Math.random() * 40 - 20) * Math.PI / 180);
        ctx.font = "900 " + (19 + Math.random() * 5) + "px Georgia, serif";
        ctx.fillStyle = c % 2 ? "#f0cf7e" : "#f2ead8";
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

  /* ---------- connexion hors-ligne (PC) : empreinte locale du 1er login ---------- */
  function sha256(t) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }
  function estHorsLigne(err) {
    return !!err && /fetch|network|load|timeout/i.test(err.message || "");
  }

  /* ---------- champs « autre » ---------- */
  function gereAutre(selId, inputId) {
    var sel = document.getElementById(selId), inp = document.getElementById(inputId);
    sel.addEventListener("change", function () {
      inp.hidden = sel.value !== "__autre";
      if (!inp.hidden) inp.focus();
    });
  }
  gereAutre("i-lycee", "i-lycee-autre");
  gereAutre("i-classe", "i-classe-autre");
  function valeur(selId, inputId) {
    var sel = document.getElementById(selId);
    return sel.value === "__autre" ? document.getElementById(inputId).value.trim() || "—" : sel.value;
  }

  /* ---------- biométrie (WebAuthn, empreinte / visage) ---------- */
  function bioDispo() {
    return !!(navigator.credentials && window.PublicKeyCredential && window.isSecureContext);
  }
  function activeBio(uid, email, suite) {
    var challenge = crypto.getRandomValues(new Uint8Array(32));
    navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: "STI V2.0", id: location.hostname },
        user: { id: new TextEncoder().encode(uid), name: email, displayName: email },
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        timeout: 60000
      }
    }).then(function () {
      localStorage.setItem("sti-bio", "1");
      suite(true);
    }).catch(function () { suite(false); });
  }

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
      var email = document.getElementById("c-email").value.trim();
      var mdp = document.getElementById("c-mdp").value;
      if (r.error) {
        if (estHorsLigne(r.error)) {
          var cred = null;
          try { cred = JSON.parse(localStorage.getItem("sti-cred") || "null"); } catch (e) {}
          sha256(mdp).then(function (h) {
            if (cred && cred.email === email && cred.h === h) {
              localStorage.setItem("sti-offline", "1");
              location.href = cfg.RACINE;
            } else {
              msg("❌ Hors-ligne : identifiants non reconnus sur cet appareil.", "err");
            }
          });
          return;
        }
        msg("❌ " + (r.error.message.indexOf("Invalid") === 0 ? "E-mail ou mot de passe incorrect." : r.error.message), "err"); return;
      }
      /* login en ligne réussi : mémorise l'empreinte locale pour le mode hors-ligne */
      localStorage.removeItem("sti-offline");
      if (r.data.user.email !== cfg.ADMIN) {
        sha256(mdp).then(function (h) {
          localStorage.setItem("sti-cred", JSON.stringify({ email: r.data.user.email, h: h }));
        });
      }
      if (r.data.user.email === cfg.ADMIN) { location.href = cfg.RACINE + "admin.html"; return; }
      sb.from("profiles").select("statut").eq("id", r.data.user.id).maybeSingle().then(function (rp) {
        var st = rp.data && rp.data.statut;
        if (st === "actif") {
          if (bioDispo() && !localStorage.getItem("sti-bio")) {
            if (window.confirm("Activer la connexion biométrique (empreinte / visage) sur cet appareil ?")) {
              activeBio(r.data.user.id, r.data.user.email, function () { location.href = cfg.RACINE; });
              return;
            }
          }
          location.href = cfg.RACINE; return;
        }
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
    var lycee = valeur("i-lycee", "i-lycee-autre");
    var classe = valeur("i-classe", "i-classe-autre");
    if (document.getElementById("i-lycee").value === "__autre" && lycee === "—") { msg("❌ Indiquez le nom de votre lycée.", "err"); return; }
    if (document.getElementById("i-classe").value === "__autre" && classe === "—") { msg("❌ Indiquez votre classe.", "err"); return; }
    var btn = e.target.querySelector(".btn"); btn.disabled = true;
    sb.auth.signUp({
      email: document.getElementById("i-email").value.trim(),
      password: mdp,
      options: { data: { lycee: lycee, classe: classe } }
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
