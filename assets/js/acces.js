/* STI v2 — verrou d'accès temps réel + déconnexion instantanée (y compris depuis les boîtes/iframes) + journal des accès
   Chargé sur toutes les pages SAUF portail.html et admin.html. */
(function () {
  "use strict";
  var cfg = window.STI_AUTH;
  if (!cfg || cfg.URL.indexOf("https://") !== 0) return; /* pas encore configuré */
  var chemin = location.pathname.split("/").pop() || "index.html";
  if (chemin === "portail.html" || chemin === "admin.html") return;

  var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
  var PORTAIL = cfg.RACINE + "portail.html";
  var enSortie = false;

  /* ---------- Éjection immédiate (fenêtre principale + boîtes/iframes + purge totale) ---------- */
  function purgerStockageLocal() {
    try {
      localStorage.removeItem("sti-offline");
      localStorage.removeItem("sti-cred");
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("sb-") === 0 || k.indexOf("supabase") !== -1) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {}
    try { sessionStorage.removeItem("sti-demo"); } catch (e) {}
  }

  function redirigerTop(cible) {
    try {
      if (window.top && window.top !== window) {
        try { if (window.top.document && window.top.document.body) window.top.document.body.innerHTML = ""; } catch (e) {}
        window.top.location.replace(cible);
        return;
      }
    } catch (e) {}
    location.replace(cible);
  }

  function sortirImmediatement(hash) {
    if (enSortie) return;
    enSortie = true;
    var h = hash || "#deconnecte";
    var cible = PORTAIL + h;
    purgerStockageLocal();
    try { localStorage.setItem("sti-force-exit", h + "|" + Date.now()); } catch (e) {}
    /* Masque immédiatement le cours et les boîtes ouvertes */
    try { if (document.body) document.body.innerHTML = ""; } catch (e) {}
    try { sb.auth.signOut().catch(function () {}); } catch (e) {}
    redirigerTop(cible);
  }

  /* Si la déconnexion ou l'exclusion est déclenchée depuis une boîte (iframe) ou un autre onglet */
  window.addEventListener("storage", function (e) {
    if (!e) return;
    if (e.key === "sti-force-exit" && e.newValue) {
      var h = String(e.newValue).split("|")[0] || "#deconnecte";
      sortirImmediatement(h);
    }
  });

  sb.auth.getSession().then(function (r) {
    var session = r.data.session;
    if (!session) {
      /* hors-ligne : session locale déjà validée précédemment sur cet appareil (validité limitée à 24 h) */
      var t = parseInt(localStorage.getItem("sti-offline") || "0", 10);
      if (t && Date.now() - t < 86400000) return;
      localStorage.removeItem("sti-offline");
      redirigerTop(PORTAIL + "#connexion");
      return;
    }
    var user = session.user;
    if ((user.email || "").toLowerCase() === (cfg.ADMIN || "").toLowerCase()) {
      if (window === window.top) badgeAdmin();
      journal(user.id);
      return;
    }

    function appliquerStatut(rp) {
      if (rp.error) return true; /* erreur réseau : tolérance hors-ligne */
      /* Si le profil n'existe plus en base -> candidat supprimé par l'admin */
      if (!rp.data) {
        sortirImmediatement("#refuse");
        return false;
      }
      var st = rp.data.statut;
      if (st === "actif") return true;
      if (st === "en_attente") { sortirImmediatement("#attente"); return false; }
      if (st === "exclu") { sortirImmediatement("#exclu"); return false; }
      sortirImmediatement("#refuse");
      return false;
    }

    function entrer(profil) {
      verrouBio(user, function () {
        panneauCompte(user, profil || {});
        surveillerSessionTempsReel(user.id, appliquerStatut);
        journal(user.id);
      });
    }

    /* Vérification initiale du statut */
    sb.from("profiles").select("statut").eq("id", user.id).maybeSingle().then(function (rp) {
      if (rp.error) { entrer({}); return; }
      if (!appliquerStatut(rp)) return;
      sb.from("profiles").select("lycee,classe").eq("id", user.id).maybeSingle().then(function (rc) {
        entrer(!rc.error && rc.data ? rc.data : {});
      });
    });
  });

  /* ---------- Surveillance continue : exclusion / retrait / mise en attente en direct ---------- */
  function surveillerSessionTempsReel(uid, appliquerStatut) {
    function verifDirecte() {
      if (enSortie) return;
      sb.from("profiles").select("statut").eq("id", uid).maybeSingle().then(function (rp) {
        appliquerStatut(rp);
      });
    }

    /* 1. Vérification périodique toutes les 8 secondes */
    setInterval(verifDirecte, 8000);

    /* 2. Vérification dès que l'élève revient sur l'onglet ou interagit */
    window.addEventListener("focus", verifDirecte);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) verifDirecte();
    });

    /* 3. Écoute temps réel Supabase (changement de statut ou suppression de la ligne) */
    try {
      sb.channel("sti-user-" + uid)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: "id=eq." + uid }, function (payload) {
          if (payload.eventType === "DELETE") {
            sortirImmediatement("#refuse");
            return;
          }
          var nv = payload.new;
          if (nv && nv.statut) {
            appliquerStatut({ data: nv, error: null });
          } else {
            verifDirecte();
          }
        })
        .subscribe();
    } catch (e) {}
  }

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
    var affLogin = user.email || user.phone || "—";
    if (/@tel\.sti\.tn$/i.test(affLogin)) {
      var meta = user.user_metadata || {};
      affLogin = "📱 " + (meta.phone || ("+" + affLogin.replace(/@tel\.sti\.tn$/i, "")));
      var np = ((meta.prenom || "") + " " + (meta.nom || "")).trim();
      if (np) affLogin += " · " + np;
    }
    pan.innerHTML = "<span style='color:#7a6f5d;font-size:10.5px;text-transform:uppercase;letter-spacing:1px'>Login</span><br>" +
      "<b style='font-size:13px'>" + esc(affLogin) + "</b><br>" +
      "<span style='color:#7a6f5d'>" + esc(profil.lycee || "—") + " · " + esc(profil.classe || "—") + "</span>";
    var out = document.createElement("button");
    out.type = "button";
    out.textContent = "🚪 Déconnexion";
    out.style.cssText = "display:block;margin:10px 0 0 auto;border:2px solid #23201a;background:#fff;color:#23201a;color-scheme:light;border-radius:10px;padding:8px 12px;font-weight:800;font-size:12px;cursor:pointer;";
    out.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      sortirImmediatement("#deconnecte");
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
    if (window === window.top && !sessionStorage.getItem("sti-demo")) {
      sessionStorage.setItem("sti-demo", "1");
      setTimeout(function () {
        ouvrir();
        setTimeout(fermer, 1700);
      }, 700);
    }

    wrap.appendChild(pan);
    wrap.appendChild(porte);
    (document.body || document.documentElement).appendChild(wrap);

    ecouterMessagesClasse(user.id, profil.classe || "");
  }

  /* ---------- réception des messages groupés + signaux d'expulsion diffusés par l'admin ---------- */
  function ecouterMessagesClasse(uid, maClasse) {
    var CANAL_DIFFUSION = "sti_v2_diffusion_9482";
    var demarreA = Date.now();

    function traiterSignalStatut(ev) {
      if (!ev || ev.type !== "statut" || ev.uid !== uid) return;
      if (ev.ts && ev.ts < demarreA - 15000) return;
      if (ev.statut === "exclu") sortirImmediatement("#exclu");
      else if (ev.statut === "en_attente") sortirImmediatement("#attente");
      else if (ev.statut === "supprime" || ev.statut !== "actif") sortirImmediatement("#refuse");
    }

    function afficherAnnonce(a) {
      if (!a || !a.id || !a.texte) return;
      if (a.classe !== "*" && a.classe !== maClasse) return;
      try { if (localStorage.getItem("sti-msg-lu-" + a.id) === "1") return; } catch (e) {}
      if (document.getElementById("sti-annonce-" + a.id)) return;

      var boite = document.createElement("div");
      boite.id = "sti-annonce-" + a.id;
      boite.style.cssText = "position:fixed;left:50%;top:22px;transform:translateX(-50%);z-index:2147483647;max-width:440px;width:calc(100vw - 28px);background:#fffdf7;color:#23201a;color-scheme:light;border:2.5px solid #23201a;border-radius:18px;padding:18px 20px;box-shadow:6px 6px 0 #f4511e,0 16px 36px rgba(0,0,0,.22);font:600 13.5px/1.5 system-ui,'Segoe UI',sans-serif;";
      var libCl = a.classe === "*" ? "Toutes les classes" : a.classe;
      boite.innerHTML =
        "<div style='font-weight:900;font-size:15px;color:#f4511e;margin-bottom:6px'>📢 Message de M. Essouyah · " + esc(libCl) + "</div>" +
        "<div style='white-space:pre-wrap;color:#23201a;margin-bottom:14px'>" + esc(a.texte) + "</div>" +
        "<div style='text-align:right'><button type='button' style='border:2px solid #23201a;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border-radius:999px;padding:7px 18px;font-weight:900;font-size:12.5px;cursor:pointer;box-shadow:2px 2px 0 #23201a'>✅ J'ai lu</button></div>";
      boite.querySelector("button").addEventListener("click", function () {
        try { localStorage.setItem("sti-msg-lu-" + a.id, "1"); } catch (e) {}
        boite.remove();
        var tsNow = new Date().toISOString();
        if (uid) {
          sb.from("acces").insert({
            user_id: uid,
            page: "MSG_LU:" + a.id,
            lieu: a.classe || "*",
            fin: tsNow,
            duree_sec: 0
          }).then(function () {});
        }
        try {
          sb.channel("sti-diffusion").send({ type: "broadcast", event: "lu", payload: { msgId: a.id, uid: uid, ts: tsNow } });
        } catch (e) {}
        fetch("https://ntfy.sh/" + CANAL_DIFFUSION, {
          method: "POST",
          body: JSON.stringify({ type: "lu", msgId: a.id, uid: uid, ts: tsNow })
        }).catch(function () {});
      });
      (document.body || document.documentElement).appendChild(boite);
    }

    function verifierDiffusion() {
      if (enSortie) return;
      fetch("https://ntfy.sh/" + CANAL_DIFFUSION + "/json?poll=1&since=all")
        .then(function (r) { return r.text(); })
        .then(function (txt) {
          var lignes = (txt || "").trim().split("\n");
          var derniereAnnonce = null;
          for (var i = 0; i < lignes.length; i++) {
            if (!lignes[i]) continue;
            try {
              var evt = JSON.parse(lignes[i]);
              if (evt && evt.message) {
                var a = JSON.parse(evt.message);
                if (a && a.type === "statut" && a.uid === uid) {
                  traiterSignalStatut(a);
                } else if (a && a.id && a.texte && !a.type && (a.classe === "*" || a.classe === maClasse)) {
                  derniereAnnonce = a;
                }
              }
            } catch (e) {}
          }
          if (derniereAnnonce) afficherAnnonce(derniereAnnonce);
        })
        .catch(function () {});
    }

    verifierDiffusion();
    setInterval(verifierDiffusion, 12000);
    try {
      sb.channel("sti-diffusion")
        .on("broadcast", { event: "annonce" }, function (p) {
          if (p && p.payload) afficherAnnonce(p.payload);
        })
        .on("broadcast", { event: "statut" }, function (p) {
          if (p && p.payload) traiterSignalStatut(p.payload);
        })
        .subscribe();
    } catch (e) {}
  }

  /* ---------- badge ADMIN visible sur tout le site (droite, milieu) + compteur de demandes ---------- */
  function badgeAdmin() {
    var b = document.createElement("a");
    b.href = PORTAIL.replace("portail.html", "admin.html");
    b.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M7.5 16.5v-4.5M12 16.5V8M16.5 16.5V5.5" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg><span id="sti-adm-nb" style="display:none;margin-left:5px;background:#fff;color:#c0392b;border-radius:999px;padding:2px 6px;font-size:11px;font-weight:900;">0</span>';
    b.title = "Tableau de bord administrateur";
    b.style.cssText = "position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:2147483646;background:linear-gradient(120deg,#f4511e,#ff8a50);color:#fff;border:2px solid #23201a;border-radius:999px;padding:9px 11px;font:900 11.5px/1 system-ui,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;letter-spacing:1px;text-decoration:none;box-shadow:3px 3px 0 #23201a;";
    (document.body || document.documentElement).appendChild(b);

    function verifAttente() {
      sb.from("profiles").select("id,email,phone,nom,prenom,statut").eq("statut", "en_attente").then(function (r) {
        if (r.error || !r.data) return;
        var liste = r.data.filter(function (p) {
          return (p.email || "").toLowerCase() !== (cfg.ADMIN || "").toLowerCase();
        });
        var pastille = document.getElementById("sti-adm-nb");
        if (pastille) {
          pastille.style.display = liste.length ? "inline-block" : "none";
          pastille.textContent = "🔔 " + liste.length;
        }
        var vus = {};
        try { vus = JSON.parse(localStorage.getItem("sti-admin-vus") || "{}"); } catch (e) {}
        liste.forEach(function (p) {
          if (!vus[p.id]) {
            vus[p.id] = 1;
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification("🆕 Nouvelle demande STI V2.0", {
                  body: (p.prenom || p.nom ? (p.prenom + " " + p.nom).trim() : (p.email || p.phone || "Nouvel abonné")) + " attend votre validation."
                });
              } catch (e) {}
            }
          }
        });
        try { localStorage.setItem("sti-admin-vus", JSON.stringify(vus)); } catch (e) {}
      });
    }
    verifAttente();
    setInterval(verifAttente, 20000);
  }

  /* ---------- verrou biométrique (abonnés ayant activé l'option) ---------- */
  function verrouBio(user, suite) {
    if (window !== window.top || user.email === cfg.ADMIN || !localStorage.getItem("sti-bio")) { suite(); return; }
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

  /* ---------- journal : lieu + durée (uniquement fenêtre principale, pas les sous-iframes) ---------- */
  function journal(uid) {
    if (window !== window.top) return;
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
