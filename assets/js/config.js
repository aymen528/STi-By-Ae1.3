/* STI v2 — configuration d'accès (Supabase) */
window.STI_AUTH = {
  URL: "https://vywujxmepvcbgedgmger.supabase.co",
  CLE: "sb_publishable_FI5FimytONd5VdWK6GfXLA_I6vPTrvn",
  RACINE: (typeof location !== "undefined" && location.origin && location.origin !== "null")
    ? (location.origin + location.pathname.replace(/\/(?:cours|exercices|projets|documents|annexes|quiz|cssanimee|Positionnement-animee)(?:\/.*)?$|\/?(?:portail|admin|index|carte-visite|bac-pratique|404|series-exercices|PHP-recap)\.html.*$/i, "").replace(/\/?$/, "/"))
    : "./",
  ADMIN: "aymenessouyah@gmail.com"
};
