/* STI v2 — portail d'accès : captcha, connexion, inscription (e-mail ou téléphone + code WhatsApp), mot de passe oublié */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);

  /* ---------- Utilitaires téléphone & code WhatsApp ---------- */
  function normaliserTel(brut) {
    var s = String(brut || "").replace(/[\s.\-()]/g, "");
    if (s.indexOf("00") === 0) s = "+" + s.slice(2);
    if (/^\d{8}$/.test(s)) s = "+216" + s;      /* n° tunisien 8 chiffres → +216 */
    else if (/^216\d{8}$/.test(s)) s = "+" + s;
    return /^\+\d{8,15}$/.test(s) ? s : null;
  }
  function emailDeTel(tel) {
    return String(tel || "").replace(/\D/g, "") + "@tel.sti.tn";
  }
  function estSaisieTel(s) {
    var net = String(s || "").trim();
    return net.indexOf("@") === -1 && /^[+\d][\d\s.\-()]{6,}$/.test(net);
  }
  function codeWa(tel) {
    var ch = String(tel || "").replace(/\D/g, "");
    var h = 216613;
    for (var i = 0; i < ch.length; i++) {
      h = ((h * 31) + ch.charCodeAt(i) * (i + 7)) % 900000;
    }
    return String(100000 + (h % 900000));
  }
  var NTFY_CANAL = "sti_v2_aymen_9482";
  function alerterAdminDemande(d) {
    try {
      var lignes = [];
      if (d.tel) {
        lignes.push("👤 " + d.prenom + " " + d.nom);
        lignes.push("📱 " + d.tel);
        lignes.push("🏫 " + d.lycee + " · " + d.classe);
        lignes.push("🔢 Code WhatsApp : " + d.code);
      } else {
        lignes.push("✉️ " + d.email);
        lignes.push("🏫 " + d.lycee + " · " + d.classe);
      }
      var headers = {
        "Title": d.tel ? "Nouvelle demande STI V2.0 (Telephone)" : "Nouvelle demande STI V2.0 (E-mail)",
        "Priority": "high",
        "Tags": "bell,mortar_board",
        "Click": "https://aymenessouyah.github.io/STiV2.0/admin.html"
      };
      if (d.tel) {
        var ch = d.tel.replace(/\D/g, "");
        var txtWa = "Bonjour " + d.prenom + " " + d.nom + ", voici votre code de confirmation pour la plateforme STI V2.0 : *" + d.code + "*";
        headers["Actions"] = "view, Envoyer code WhatsApp, https://wa.me/" + ch + "?text=" + encodeURIComponent(txtWa) + "; view, Tableau de bord, https://aymenessouyah.github.io/STiV2.0/admin.html";
      }
      fetch("https://ntfy.sh/" + NTFY_CANAL, {
        method: "POST",
        headers: headers,
        body: lignes.join("\n")
      }).catch(function () {});
    } catch (err) {}
  }

  /* ---------- petit captcha maison ---------- */
  function fabriqueCaptcha(canvasId, btnId) {
    var canvas = document.getElementById(canvasId);
    var ctx = canvas.getContext("2d");
    var ETATS = {};
    function nouveau() {
      var car = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      var code = "";
      for (var i = 0; i < 5; i++) code += car[Math.floor(Math.random() * car.length)];
      ETATS[canvasId] = code;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var p = 0; p < 26; p++) {
        ctx.fillStyle = "rgba(244,81,30," + (0.06 + Math.random() * 0.1) + ")";
        ctx.beginPath();
        ctx.arc(Math.random() * 150, Math.random() * 46, 1 + Math.random() * 1.6, 0, 7);
        ctx.fill();
      }
      for (var l = 0; l < 3; l++) {
        ctx.strokeStyle = "rgba(35,32,26," + (0.12 + Math.random() * 0.15) + ")";
        ctx.beginPath();
        ctx.moveTo(Math.random() * 150, Math.random() * 46);
        ctx.lineTo(Math.random() * 150, Math.random() * 46);
        ctx.stroke();
      }
      for (var c = 0; c < 5; c++) {
        ctx.save();
        ctx.translate(20 + c * 26, 25 + (Math.random() * 8 - 4));
        ctx.rotate((Math.random() * 40 - 20) * Math.PI / 180);
        ctx.font = "900 " + (19 + Math.random() * 5) + "px system-ui";
        ctx.fillStyle = c % 2 ? "#f4511e" : "#23201a";
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
  var telEnCours = null;
  Object.keys(tabs).forEach(function (id) {
    document.getElementById(id).addEventListener("click", function () {
      document.getElementById("zone-code").hidden = true;
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
  if (h === "refuse") msg("⛔ Accès refusé ou compte suspendu. Contactez l'administrateur.", "err");
  if (h === "exclu") msg("⛔ Vous êtes exclu. Contactez l'administrateur.", "err");
  if (h === "connexion") msg("🔒 Connexion requise pour accéder à la plateforme.", "att");
  if (h === "deconnecte") msg("Vous êtes déconnecté(e). À bientôt !", "ok");

  function verifierStatutEtEntrer(user) {
    sb.from("profiles").select("statut,lycee,classe,nom,prenom,phone").eq("id", user.id).maybeSingle().then(function (rp) {
      if (rp.error && estHorsLigne(rp.error)) {
        localStorage.setItem("sti-offline", String(Date.now()));
        location.href = cfg.RACINE;
        return;
      }
      var st = rp.data && rp.data.statut;
      var isG = Boolean(rp.data && /\|\s*GOLD$/i.test(rp.data.lycee || ""));
      try {
        localStorage.removeItem("sti-admin-gold");
        if (isG) localStorage.setItem("sti-gold", "1");
        else localStorage.removeItem("sti-gold");
      } catch (e) {}
      if (st === "actif") {
        try {
          localStorage.setItem("sti-offline", String(Date.now()));
          localStorage.setItem("sti-session-cache", JSON.stringify({
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata || {},
            lycee: rp.data.lycee || "—",
            classe: rp.data.classe || "—",
            statut: "actif",
            gold: isG,
            isAdmin: false,
            ts: Date.now()
          }));
        } catch (e) {}
        if (bioDispo() && !localStorage.getItem("sti-bio")) {
          if (window.confirm("Activer la connexion biométrique (empreinte / visage) sur cet appareil ?")) {
            activeBio(user.id, user.email, function () { location.href = cfg.RACINE; });
            return;
          }
        }
        location.href = cfg.RACINE; return;
      }
      if (st === "en_attente") { msg("⏳ Compte créé — en attente de validation par l'administrateur.", "att"); sb.auth.signOut(); return; }
      if (st === "exclu") { msg("⛔ Vous êtes exclu. Contactez l'administrateur.", "err"); localStorage.removeItem("sti-offline"); localStorage.removeItem("sti-session-cache"); localStorage.removeItem("sti-cred"); localStorage.removeItem("sti-gold"); sb.auth.signOut(); return; }
      msg("⛔ Compte suspendu. Contactez l'administrateur.", "err"); sb.auth.signOut();
    });
  }

  /* ---------- connexion ---------- */
  document.getElementById("f-connexion").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!cap1.ok(document.getElementById("c-captcha").value)) {
      msg("❌ Code captcha incorrect.", "err"); cap1.reset();
      document.getElementById("c-captcha").value = "";
      return;
    }
    var idConn = document.getElementById("c-email").value.trim();
    var mdp = document.getElementById("c-mdp").value;
    var emailConn = idConn;
    var telConn = null;
    if (estSaisieTel(idConn)) {
      telConn = normaliserTel(idConn);
      if (!telConn) {
        msg("❌ Numéro invalide — ex. +216 20 123 456 ou 20 123 456.", "err");
        return;
      }
      emailConn = emailDeTel(telConn);
    }
    var btn = e.target.querySelector(".btn"); btn.disabled = true;
    sb.auth.signInWithPassword({ email: emailConn, password: mdp }).then(function (r) {
      btn.disabled = false;
      if (r.error) {
        if (estHorsLigne(r.error)) {
          var cred = null;
          try { cred = JSON.parse(localStorage.getItem("sti-cred") || "null"); } catch (err) {}
          sha256(mdp).then(function (h) {
            if (cred && (cred.email === emailConn || cred.email === idConn) && cred.h === h) {
              try {
                localStorage.setItem("sti-offline", String(Date.now()));
                localStorage.setItem("sti-reauth", JSON.stringify({
                  e: emailConn,
                  p: btoa(unescape(encodeURIComponent(mdp)))
                }));
              } catch (err) {}
              location.href = cred.isAdmin ? (cfg.RACINE + "admin.html") : cfg.RACINE;
            } else {
              msg("❌ Hors-ligne : identifiants non reconnus sur cet appareil (connectez-vous une 1re fois avec Internet).", "err");
            }
          });
          return;
        }
        msg("❌ " + (r.error.message.indexOf("Invalid") === 0 ? "Identifiant ou mot de passe incorrect." : r.error.message), "err"); return;
      }
      /* login en ligne réussi : mémorise l'empreinte locale et le jeton de reconnexion pour la synchro hors-ligne */
      var isAdm = (r.data.user.email || "").toLowerCase() === (cfg.ADMIN || "").toLowerCase();
      try {
        localStorage.setItem("sti-reauth", JSON.stringify({
          e: emailConn,
          p: btoa(unescape(encodeURIComponent(mdp)))
        }));
      } catch (err) {}
      sha256(mdp).then(function (h) {
        try {
          localStorage.setItem("sti-cred", JSON.stringify({ email: emailConn, h: h, isAdmin: isAdm }));
        } catch (err) {}
      });
      if (isAdm) {
        try {
          localStorage.setItem("sti-gold", "1");
          localStorage.setItem("sti-admin-gold", "1");
          localStorage.setItem("sti-offline", String(Date.now()));
          localStorage.setItem("sti-session-cache", JSON.stringify({
            id: r.data.user.id,
            email: r.data.user.email,
            statut: "actif",
            gold: true,
            isAdmin: true,
            ts: Date.now()
          }));
        } catch (err) {}
        location.href = cfg.RACINE + "admin.html";
        return;
      }

      /* Si compte par téléphone non encore confirmé par code WhatsApp */
      var meta = (r.data.user && r.data.user.user_metadata) || {};
      if (/@tel\.sti\.tn$/i.test(r.data.user.email || "")) {
        var telUser = meta.phone || ("+" + r.data.user.email.replace(/@tel\.sti\.tn$/i, ""));
        var ch = telUser.replace(/\D/g, "");
        var dejaOk = meta.wa_confirme === true;
        try { if (localStorage.getItem("sti-wa-ok-" + ch) === "1") dejaOk = true; } catch (err) {}
        if (!dejaOk) {
          telEnCours = telUser;
          document.getElementById("f-connexion").hidden = true;
          document.getElementById("zone-code").hidden = false;
          document.getElementById("code-cible").textContent = telUser;
          viderCodeOtp(true);
          msg("📲 Saisissez le code de confirmation à 6 chiffres envoyé sur votre WhatsApp.", "att");
          return;
        }
      }
      verifierStatutEtEntrer(r.data.user);
    });
  });

  /* ---------- inscription : choix du canal e-mail / téléphone ---------- */
  var inpTel = document.getElementById("i-tel");
  function maintenirPrefixe216() {
    var v = inpTel.value || "";
    var chiffres = v.replace(/\D/g, "");
    if (chiffres.indexOf("00216") === 0) chiffres = chiffres.slice(5);
    else if (chiffres.indexOf("216") === 0) chiffres = chiffres.slice(3);
    chiffres = chiffres.slice(0, 8);
    inpTel.value = "+216 " + chiffres;
  }
  inpTel.addEventListener("focus", function () {
    if (inpTel.value.indexOf("+216") !== 0) maintenirPrefixe216();
  });
  inpTel.addEventListener("input", maintenirPrefixe216);

  /* Ajout automatique de +216 aussi dans le champ de connexion si saisie numérique */
  var inpConn = document.getElementById("c-email");
  inpConn.addEventListener("input", function () {
    var v = inpConn.value;
    if (/^\d{2,}$/.test(v.trim()) && v.indexOf("@") === -1) {
      var ch = v.replace(/\D/g, "");
      if (ch.indexOf("216") === 0 && ch.length > 8) ch = ch.slice(3);
      inpConn.value = "+216 " + ch.slice(0, 8);
    }
  });

  function choisirCanal(tel) {
    document.getElementById("zone-tel").hidden = !tel;
    document.getElementById("zone-mail").hidden = tel;
    document.getElementById("c-tel").classList.toggle("on", tel);
    document.getElementById("c-mail").classList.toggle("on", !tel);
    if (tel) {
      maintenirPrefixe216();
      inpTel.focus();
    }
  }
  document.getElementById("c-mail").addEventListener("click", function () { choisirCanal(false); });
  document.getElementById("c-tel").addEventListener("click", function () { choisirCanal(true); });

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
    var modeTel = !document.getElementById("zone-tel").hidden;

    if (modeTel) {
      /* ----- inscription par téléphone + attente du code WhatsApp ----- */
      var tel = normaliserTel(document.getElementById("i-tel").value);
      var nom = document.getElementById("i-nom").value.trim();
      var prenom = document.getElementById("i-prenom").value.trim();
      if (!tel) { btn.disabled = false; msg("❌ Numéro invalide — ex. +216 20 123 456 ou 20 123 456.", "err"); return; }
      if (!nom || !prenom) { btn.disabled = false; msg("❌ Indiquez votre nom et votre prénom.", "err"); return; }
      telEnCours = tel;
      sb.auth.signUp({
        email: emailDeTel(tel),
        password: mdp,
        options: { data: { phone: tel, nom: nom, prenom: prenom, lycee: lycee, classe: classe, wa_confirme: false } }
      }).then(function (r) {
        btn.disabled = false;
        if (r.error) {
          var m = /already registered/i.test(r.error.message) ? "Ce numéro de téléphone est déjà inscrit." : r.error.message;
          msg("❌ " + m, "err");
          return;
        }
        e.target.reset(); maintenirPrefixe216(); cap2.reset();
        alerterAdminDemande({ tel: tel, nom: nom, prenom: prenom, lycee: lycee, classe: classe, code: codeWa(tel) });
        document.getElementById("f-inscription").hidden = true;
        document.getElementById("zone-code").hidden = false;
        document.getElementById("code-cible").textContent = tel + " (" + prenom + " " + nom + ")";
        viderCodeOtp(true);
        msg("📨 Demande enregistrée ! Saisissez le code à 6 chiffres envoyé par WhatsApp.", "ok");
      });
      return;
    }

    /* ----- inscription par e-mail ----- */
    var emInsc = document.getElementById("i-email").value.trim();
    if (!emInsc) { btn.disabled = false; msg("❌ Indiquez votre adresse e-mail.", "err"); return; }
    sb.auth.signUp({
      email: emInsc,
      password: mdp,
      options: { data: { lycee: lycee, classe: classe } }
    }).then(function (r) {
      btn.disabled = false;
      if (r.error) { msg("❌ " + r.error.message, "err"); return; }
      if (r.data.session) sb.auth.signOut(); /* le compte repasse en attente ; l'admin valide */
      alerterAdminDemande({ email: emInsc, lycee: lycee, classe: classe });
      msg("✅ Inscription reçue ! Votre accès sera activé après validation par l'administrateur.", "ok");
      e.target.reset(); cap2.reset();
    });
  });

  /* ---------- 6 cases pour le code reçu par WhatsApp ---------- */
  var casesOtp = Array.prototype.slice.call(document.querySelectorAll("#otp-cases .otp-case"));
  function lireCodeOtp() {
    return casesOtp.map(function (c) { return (c.value || "").replace(/\D/g, ""); }).join("");
  }
  function viderCodeOtp(focusPremiere) {
    casesOtp.forEach(function (c) { c.value = ""; c.classList.remove("rempli"); });
    if (focusPremiere && casesOtp[0]) setTimeout(function () { casesOtp[0].focus(); }, 30);
  }
  function repartirChiffres(departIdx, chaine) {
    var ch = String(chaine || "").replace(/\D/g, "");
    for (var k = 0; k < ch.length && (departIdx + k) < casesOtp.length; k++) {
      casesOtp[departIdx + k].value = ch[k];
      casesOtp[departIdx + k].classList.add("rempli");
    }
    var suiv = Math.min(departIdx + ch.length, casesOtp.length - 1);
    if (casesOtp[suiv]) casesOtp[suiv].focus();
  }
  casesOtp.forEach(function (inp, idx) {
    inp.addEventListener("input", function () {
      var v = (inp.value || "").replace(/\D/g, "");
      if (v.length > 1) {
        repartirChiffres(idx, v);
        return;
      }
      inp.value = v;
      inp.classList.toggle("rempli", !!v);
      if (v && idx < casesOtp.length - 1) casesOtp[idx + 1].focus();
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && !inp.value && idx > 0) {
        casesOtp[idx - 1].value = "";
        casesOtp[idx - 1].classList.remove("rempli");
        casesOtp[idx - 1].focus();
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        casesOtp[idx - 1].focus();
        e.preventDefault();
      } else if (e.key === "ArrowRight" && idx < casesOtp.length - 1) {
        casesOtp[idx + 1].focus();
        e.preventDefault();
      } else if (e.key === "Enter") {
        document.getElementById("b-verif").click();
        e.preventDefault();
      }
    });
    inp.addEventListener("paste", function (e) {
      var txt = (e.clipboardData || window.clipboardData).getData("text");
      if (txt) {
        e.preventDefault();
        repartirChiffres(idx, txt);
      }
    });
    inp.addEventListener("focus", function () { inp.select(); });
  });

  document.getElementById("b-verif").addEventListener("click", function () {
    var code = lireCodeOtp();
    if (!telEnCours) return;
    if (!/^\d{6}$/.test(code)) { msg("❌ Remplissez les 6 cases avec les 6 chiffres du code.", "err"); return; }
    if (code !== codeWa(telEnCours)) {
      msg("❌ Code incorrect — vérifiez le code à 6 chiffres reçu sur WhatsApp.", "err");
      return;
    }
    var ch = telEnCours.replace(/\D/g, "");
    try { localStorage.setItem("sti-wa-ok-" + ch, "1"); } catch (err) {}
    var btn = document.getElementById("b-verif"); btn.disabled = true;
    sb.auth.updateUser({ data: { wa_confirme: true } }).catch(function () {}).then(function () {
      btn.disabled = false;
      telEnCours = null;
      viderCodeOtp(false);
      document.getElementById("zone-code").hidden = true;
      sb.auth.getSession().then(function (rs) {
        if (rs.data && rs.data.session) {
          verifierStatutEtEntrer(rs.data.session.user);
        } else {
          document.getElementById("f-connexion").hidden = false;
          document.getElementById("tab-connexion").classList.add("actif");
          document.getElementById("tab-inscription").classList.remove("actif");
          msg("✅ Code WhatsApp confirmé ! Votre accès sera activé après validation par l'administrateur.", "ok");
        }
      });
    });
  });

  document.getElementById("b-renvoi").addEventListener("click", function () {
    if (!telEnCours) return;
    msg("💬 Votre demande est visible par l'administrateur, qui vous envoie le code à 6 chiffres sur WhatsApp (" + telEnCours + ").", "att");
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
