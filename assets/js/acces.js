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
    sb.from("profiles").select("statut,lycee,classe").eq("id", user.id).maybeSingle().then(function (rp) {
      /* réseau absent mais session valide : on laisse passer (mode hors-ligne) */
      if (rp.error) { verrouBio(user, function () { panneauCompte(user, {}); journal(user.id); }); return; }
      var st = rp.data && rp.data.statut;
      if (st === "actif") { verrouBio(user, function () { panneauCompte(user, rp.data || {}); journal(user.id); }); return; }
      if (st === "en_attente") { sb.auth.signOut(); location.replace(PORTAIL + "#attente"); return; }
      sb.auth.signOut(); location.replace(PORTAIL + "#refuse");
    });
  });

  function esc(t) { var d = document.createElement("i"); d.textContent = t || ""; return d.innerHTML; }

  /* ---------- roue « mon compte » chic : tourne, glisse à gauche pour ouvrir ---------- */
  function panneauCompte(user, profil) {
    var st = document.createElement("style");
    st.textContent =
      ".sti-roue{transition:transform 1.15s cubic-bezier(.34,1.2,.4,1),box-shadow .3s}" +
      ".sti-roue:hover{box-shadow:0 0 0 6px rgba(244,81,30,.18),3px 3px 0 #23201a}" +
      ".sti-wrap{transition:transform 1.15s cubic-bezier(.34,1.2,.4,1)}" +
      ".sti-pan{opacity:0;transform:translateX(26px) scale(.96);pointer-events:none;transition:opacity .8s ease,transform .8s ease}" +
      ".sti-pan.ouvert{opacity:1;transform:translateX(0) scale(1);pointer-events:auto}";
    document.head.appendChild(st);

    var wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:2147483646;display:flex;align-items:center;";

    var pan = document.createElement("div");
    pan.className = "sti-pan";
    pan.style.cssText = "position:absolute;right:0;background:#fffdf7;border:2px solid #23201a;border-radius:16px;padding:14px 16px;box-shadow:5px 5px 0 rgba(244,81,30,.5);font:600 12.5px/1.6 system-ui,'Segoe UI',sans-serif;color:#23201a;width:225px;text-align:right;color-scheme:light;";
    pan.innerHTML = "<span style='color:#7a6f5d;font-size:10.5px;text-transform:uppercase;letter-spacing:1px'>Login</span><br>" +
      "<b style='font-size:13px'>" + esc(user.email) + "</b><br>" +
      "<span style='color:#7a6f5d'>" + esc(profil.lycee || "—") + " · " + esc(profil.classe || "—") + "</span>";
    var out = document.createElement("button");
    out.type = "button";
    out.textContent = "🚪 Déconnexion";
    out.style.cssText = "display:block;margin:10px 0 0 auto;border:2px solid #23201a;background:#fff;color:#23201a;color-scheme:light;border-radius:10px;padding:8px 12px;font-weight:800;font-size:12px;cursor:pointer;";
    out.addEventListener("click", function () {
      sb.auth.signOut().then(function () {
        localStorage.removeItem("sti-offline");
        sessionStorage.removeItem("sti-demo");
        location.replace(PORTAIL + "#deconnecte");
      });
    });
    pan.appendChild(out);

    var porte = document.createElement("div");
    porte.className = "sti-wrap";
    porte.style.cssText = "position:relative;z-index:2;";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sti-roue";
    btn.textContent = "⚙️";
    btn.title = "Mon compte";
    btn.style.cssText = "display:block;width:48px;height:48px;border-radius:50%;border:2px solid #23201a;background:radial-gradient(circle at 32% 30%,#ffb27a,#f4511e 68%);font-size:22px;line-height:1;cursor:pointer;box-shadow:3px 3px 0 #23201a,0 8px 20px -8px rgba(244,81,30,.7);";
    porte.appendChild(btn);

    var ouvert = false;
    function ouvrir() {
      ouvert = true;
      pan.classList.add("ouvert");
      porte.style.transform = "translateX(-" + (pan.offsetWidth + 14) + "px)";
      btn.style.transform = "rotate(720deg)";
    }
    function fermer() {
      ouvert = false;
      pan.classList.remove("ouvert");
      porte.style.transform = "translateX(0)";
      btn.style.transform = "rotate(0deg)";
    }
    btn.addEventListener("click", function () { ouvert ? fermer() : ouvrir(); });

    /* à l'entrée, après confirmation : le ruban s'ouvre seul puis se referme pour attirer l'attention */
    if (!sessionStorage.getItem("sti-demo")) {
      sessionStorage.setItem("sti-demo", "1");
      setTimeout(function () {
        ouvrir();
        setTimeout(fermer, 1700);
      }, 700);
    }

    wrap.appendChild(pan);
    wrap.appendChild(porte);
    document.documentElement.appendChild(wrap);
  }

  /* ---------- badge ADMIN visible sur tout le site (droite, milieu) ---------- */
  function badgeAdmin() {
    var b = document.createElement("a");
    b.href = PORTAIL.replace("portail.html", "admin.html");
    b.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M7.5 16.5v-4.5M12 16.5V8M16.5 16.5V5.5" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>';
    b.title = "Tableau de bord administrateur";
    b.style.cssText = "position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:2147483646;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border:2px solid #23201a;border-radius:999px;padding:9px 11px;font:900 11.5px/1 system-ui;display:flex;align-items:center;justify-content:center;,'Segoe UI',sans-serif;letter-spacing:1px;text-decoration:none;box-shadow:3px 3px 0 #23201a;";
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
