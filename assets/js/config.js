/* STI v2 — configuration d'accès (Supabase) */
window.STI_AUTH = {
  URL: "https://vywujxmepvcbgedgmger.supabase.co",
  CLE: "sb_publishable_FI5FimytONd5VdWK6GfXLA_I6vPTrvn",
  RACINE: (typeof location !== "undefined" && location.origin && location.origin !== "null")
    ? (location.origin + location.pathname.replace(/(?:portail|admin|index|carte-visite|bac-pratique|404)\.html.*$|\/(?:cours|exercices|projets|annexes)\/.*$/, "").replace(/\/?$/, "/"))
    : "./",
  ADMIN: "aymenessouyah@gmail.com"
};
