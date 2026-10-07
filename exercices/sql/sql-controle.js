// ======================== DONNÉES DE LA BASE (synchronisées avec index.html) ========================
const DB = {
  ETUDIANT: [
    {
      Numetu: 1,
      Nometu: "Asma Ben Mahmoud",
      Dtnaiss: "2003-05-12",
      Cdsexe: "F",
    },
    { Numetu: 2, Nometu: "Bassem Hdhili", Dtnaiss: "2004-11-23", Cdsexe: "H" },
    { Numetu: 3, Nometu: "Souhir Korbsi", Dtnaiss: "2003-09-01", Cdsexe: "F" },
    { Numetu: 4, Nometu: "Karim Hfayedh", Dtnaiss: "2005-02-14", Cdsexe: "H" },
    { Numetu: 5, Nometu: "Wissal Wertani", Dtnaiss: "2004-07-19", Cdsexe: "F" },
  ],
  SEXE: [
    { Cdsexe: "H", Lbsexe: "Garçon" },
    { Cdsexe: "F", Lbsexe: "Fille" },
  ],
  ENSEIGNANT: [
    { Numens: 101, Nomens: "Ali Ben Salah", Grade: "Professeur", Ancien: 15 },
    { Numens: 102, Nomens: "Safia Tammar", Grade: "MCF", Ancien: 8 },
    { Numens: 103, Nomens: "Karim Foughali", Grade: "Assistant", Ancien: 3 },
  ],
  MATIERE: [
    { Numat: 10, Nomat: "Informatique", Coeff: 3, Numens: 101 },
    { Numat: 11, Nomat: "Mathématiques", Coeff: 4, Numens: 102 },
    { Numat: 12, Nomat: "Histoire", Coeff: 2, Numens: 103 },
    { Numat: 13, Nomat: "Sociologie", Coeff: 2, Numens: 101 },
  ],
  NOTES: [
    { Numetu: 1, Numat: 10, Note: 15.5 },
    { Numetu: 1, Numat: 11, Note: 12.0 },
    { Numetu: 1, Numat: 12, Note: 14.0 },
    { Numetu: 2, Numat: 10, Note: 11.0 },
    { Numetu: 2, Numat: 11, Note: 9.0 },
    { Numetu: 3, Numat: 10, Note: 18.0 },
    { Numetu: 3, Numat: 11, Note: 15.5 },
    { Numetu: 3, Numat: 12, Note: 13.5 },
    { Numetu: 3, Numat: 13, Note: 16.0 },
    { Numetu: 4, Numat: 12, Note: 10.0 },
    { Numetu: 5, Numat: 10, Note: 13.0 },
    { Numetu: 5, Numat: 12, Note: 8.0 },
  ],
};

// ======================== QUESTIONS THÉORIQUES ========================
const questionsData = [
  {
    part: 1,
    title: "Partie 1 – QCM SQL général (5 points)",
    type: "qcm",
    points: 5,
    items: [
      {
        id: "q1",
        text: "Q1. Quelle est la clé primaire de la table NOTES ?",
        options: ["A) Numetu", "B) Numat", "C) (Numetu, Numat)", "D) Note"],
        correct: "C) (Numetu, Numat)",
      },
      {
        id: "q2",
        text: "Q2. Que retourne DATEDIFF('2025-01-01', Dtnaiss) ?",
        options: ["A) Années", "B) Mois", "C) Jours", "D) Heures"],
        correct: "C) Jours",
      },
      {
        id: "q3",
        text: "Q3. HAVING COUNT(Note) = (SELECT COUNT(*) FROM MATIERE) dans requête7 permet de :",
        options: [
          "A) Filtrer notes>10",
          "B) Étudiants avec note dans toutes les matières",
          "C) Moyenne générale",
          "D) Trier",
        ],
        correct: "B) Étudiants avec note dans toutes les matières",
      },
      {
        id: "q4",
        text: "Q4. Différence IN / EXISTS ?",
        options: [
          "A) Identiques",
          "B) IN plus rapide",
          "C) IN compare valeurs, EXISTS existence",
          "D) EXISTS sans sous-requête",
        ],
        correct: "C) IN compare valeurs, EXISTS existence",
      },
      {
        id: "q5",
        text: "Q5. Pourquoi sous-requête corrélée dans requête14 (meilleure note) ?",
        options: [
          "A) Moyenne",
          "B) Meilleure note par matière",
          "C) Compter",
          "D) Trier",
        ],
        correct: "B) Meilleure note par matière",
      },
    ],
  },
  {
    part: 2,
    title: "Partie 2 – LDD (Langage de Définition des Données) (8 points)",
    type: "ldd",
    points: 8,
    items: [
      {
        id: "ldd1",
        text: "Q1. Que signifie l'acronyme LDD ?",
        expectedKeywords: [
          "Langage de Définition des Données",
          "Data Definition Language",
          "DDL",
        ],
        correct: "Langage de Définition des Données (DDL)",
      },
      {
        id: "ldd2",
        text: "Q2. Citez 3 commandes du LDD.",
        expectedKeywords: ["CREATE", "ALTER", "DROP", "TRUNCATE", "RENAME"],
        correct: "CREATE, ALTER, DROP, TRUNCATE, RENAME",
      },
      {
        id: "ldd3",
        text: "Q3. Écrire la commande SQL pour créer la table MATIERE (Numat INT, Nomat VARCHAR(50), Coeff INT, Numens INT).",
        expectedKeywords: [
          "CREATE TABLE",
          "MATIERE",
          "INT",
          "VARCHAR",
          "PRIMARY KEY",
        ],
        correct:
          "CREATE TABLE MATIERE (Numat INT PRIMARY KEY, Nomat VARCHAR(50), Coeff INT, Numens INT)",
      },
      {
        id: "ldd4",
        text: "Q4. Quelle commande permet d'ajouter une colonne 'DateEvaluation' à la table NOTES ?",
        expectedKeywords: ["ALTER TABLE", "ADD COLUMN", "DateEvaluation"],
        correct: "ALTER TABLE NOTES ADD COLUMN DateEvaluation DATE",
      },
      {
        id: "ldd5",
        text: "Q5. Quelle est la différence entre DROP et TRUNCATE ?",
        expectedKeywords: [
          "DROP supprime la table",
          "TRUNCATE vide les données",
          "structure",
          "données",
        ],
        correct:
          "DROP supprime la table et sa structure, TRUNCATE supprime uniquement les données mais conserve la structure",
      },
      {
        id: "ldd6",
        text: "Q6. Comment modifier le type de la colonne 'Note' de INT à DECIMAL(5,2) ?",
        expectedKeywords: [
          "ALTER TABLE",
          "MODIFY COLUMN",
          "CHANGE COLUMN",
          "DECIMAL",
        ],
        correct: "ALTER TABLE NOTES MODIFY COLUMN Note DECIMAL(5,2)",
      },
      {
        id: "ldd7",
        text: "Q7. Quelle commande permet de supprimer la contrainte de clé étrangère sur Numens dans MATIERE ?",
        expectedKeywords: ["ALTER TABLE", "DROP FOREIGN KEY", "contrainte"],
        correct: "ALTER TABLE MATIERE DROP FOREIGN KEY fk_matiere_enseignant",
      },
      {
        id: "ldd8",
        text: "Q8. Écrire la commande pour créer une vue 'VueMoyennes' affichant Numetu et moyenne générale.",
        expectedKeywords: ["CREATE VIEW", "VueMoyennes", "AS SELECT", "AVG"],
        correct:
          "CREATE VIEW VueMoyennes AS SELECT Numetu, AVG(Note) as Moyenne FROM NOTES GROUP BY Numetu",
      },
    ],
  },
  {
    part: 3,
    title: "Partie 3 – Compléter les requêtes SQL (5 points)",
    type: "sql_fill",
    points: 5,
    items: [
      {
        id: "sql1",
        text: "Exercice 1 : Afficher nom et date naissance des étudiants nés après 01/01/2010.",
        expected:
          "SELECT Nometu, Dtnaiss FROM ETUDIANT WHERE Dtnaiss > '2010-01-01'",
        hint: "SELECT ... WHERE ...",
      },
      {
        id: "sql2",
        text: "Exercice 2 : Nombre d'étudiants par sexe.",
        expected: "SELECT Cdsexe, COUNT(*) FROM ETUDIANT GROUP BY Cdsexe",
        hint: "GROUP BY",
      },
      {
        id: "sql3",
        text: "Exercice 3 : Étudiants avec note >15 en Mathématiques (sous-requête).",
        expected:
          "SELECT Nometu FROM ETUDIANT WHERE Numetu IN (SELECT Numetu FROM NOTES N, MATIERE M WHERE N.Numat=M.Numat AND M.Nomat='Mathématiques' AND N.Note>15)",
        hint: "IN avec sous-requête",
      },
      {
        id: "sql4",
        text: "Exercice 4 : Matières avec moyenne >=12 (AVG, HAVING).",
        expected:
          "SELECT M.Nomat, AVG(N.Note) FROM MATIERE M, NOTES N WHERE M.Numat=N.Numat GROUP BY M.Nomat HAVING AVG(N.Note)>=12",
        hint: "GROUP BY + HAVING",
      },
      {
        id: "sql5",
        text: "Exercice 5 : Enseignants qui enseignent au moins 2 matières.",
        expected:
          "SELECT E.Nomens, COUNT(M.Numat) FROM ENSEIGNANT E, MATIERE M WHERE E.Numens=M.Numens GROUP BY E.Numens, E.Nomens HAVING COUNT(M.Numat)>=2",
        hint: "HAVING COUNT >=2",
      },
    ],
  },
  {
    part: 4,
    title: "Partie 4 – Vrai / Faux (5 points)",
    type: "truefalse",
    points: 5,
    items: [
      {
        id: "vf1",
        text: "1. SELECT * FROM ETUDIANT WHERE Cdsexe='H' affiche tous les garçons.",
        correct: true,
      },
      { id: "vf2", text: "2. DISTINCT élimine les doublons.", correct: true },
      { id: "vf3", text: "3. WHERE peut contenir AVG().", correct: false },
      {
        id: "vf4",
        text: "4. Une sous-requête corrélée s'exécute pour chaque ligne principale.",
        correct: true,
      },
      {
        id: "vf5",
        text: "5. LEFT JOIN retourne uniquement les lignes correspondantes.",
        correct: false,
      },
    ],
  },
  {
    part: 5,
    title: "Partie 5 – Réflexion (7 points)",
    type: "reflexion",
    points: 7,
    items: [
      {
        id: "ref1",
        text: "1. Modifier requête 11 pour éviter les doublons (chaque couple une fois).",
        expectedKeywords: ["DISTINCT", "LEAST", "GREATEST"],
        hint: "Utiliser DISTINCT et comparer les noms",
      },
      {
        id: "ref2",
        text: "2. Que se passe-t-il requête7 si étudiant sans note ? Correction ?",
        expectedKeywords: ["aucune note", "INNER JOIN"],
        hint: "Les étudiants sans note sont exclus",
      },
      {
        id: "ref3",
        text: "3. Trouver l'étudiant avec meilleure moyenne générale.",
        expectedKeywords: ["SUM", "ORDER BY", "LIMIT"],
        hint: "Calculer moyenne puis LIMIT 1",
      },
      {
        id: "ref4",
        text: "4. Mettre à jour coefficient 'Informatique' à 4.",
        expectedKeywords: ["UPDATE", "SET", "WHERE"],
        hint: "UPDATE MATIERE SET Coeff=4 WHERE Nomat='Informatique'",
      },
      {
        id: "ref5",
        text: "5. Supprimer enseignants sans matière.",
        expectedKeywords: ["DELETE", "NOT IN"],
        hint: "DELETE FROM ENSEIGNANT WHERE Numens NOT IN (SELECT Numens FROM MATIERE)",
      },
      {
        id: "ref6",
        text: "6. Quelle commande LDD utiliserait-on pour ajouter une contrainte CHECK sur Note (entre 0 et 20) ?",
        expectedKeywords: ["ALTER TABLE", "ADD CONSTRAINT", "CHECK"],
        hint: "ALTER TABLE NOTES ADD CONSTRAINT ck_note CHECK (Note BETWEEN 0 AND 20)",
      },
      {
        id: "ref7",
        text: "7. Comment créer un index sur Nometu dans la table ETUDIANT ?",
        expectedKeywords: ["CREATE INDEX", "ON ETUDIANT"],
        hint: "CREATE INDEX idx_nometu ON ETUDIANT(Nometu)",
      },
    ],
  },
];

let theoryAnswers = {};

// ======================== NORMALISATION SQL INTELLIGENTE ========================
function normalizeSql(sql) {
  if (!sql) return "";

  let normalized = sql.toLowerCase().trim();

  // 1. Supprimer les alias de colonne : SELECT colonne AS alias -> SELECT colonne
  normalized = normalized.replace(/\s+as\s+[\w_]+/gi, " ");

  // 2. Supprimer les alias de table : FROM table AS alias -> FROM table
  normalized = normalized.replace(
    /\s+as\s+([a-z_][a-z0-9_]*)(?=\s|,|$|\))/gi,
    " "
  );
  normalized = normalized.replace(
    /\s+([a-z_][a-z0-9_]*)\s+([a-z_][a-z0-9_]*)(?=\s|,|$|\)|join)/gi,
    (match, table, alias) => {
      const sqlKeywords = [
        "select",
        "from",
        "where",
        "group",
        "order",
        "having",
        "limit",
        "join",
        "inner",
        "left",
        "right",
        "on",
        "and",
        "or",
        "not",
        "in",
        "exists",
        "between",
        "like",
      ];
      if (sqlKeywords.includes(alias)) return match;
      return ` ${table} `;
    }
  );

  // 3. Supprimer les mots-clés optionnels des jointures
  normalized = normalized.replace(
    /\b(inner|outer|left|right|full|cross)\s+join\b/gi,
    "join"
  );

  // 4. Supprimer ASC/DESC par défaut
  normalized = normalized.replace(/\b(asc|desc)\b/gi, "");

  // 5. Supprimer les alias après COUNT, SUM, AVG
  normalized = normalized.replace(
    /(count|sum|avg|min|max)\(\*?\)\s+as\s+[\w_]+/gi,
    "$1(*)"
  );

  // 6. Standardiser les guillemets
  normalized = normalized.replace(/"/g, "'");

  // 7. Nettoyer les espaces multiples
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

function checkSqlAnswer(user, expected) {
  if (!user && !expected) return true;
  if (!user || !expected) return false;
  return normalizeSql(user) === normalizeSql(expected);
}

function evaluateItem(item, ans, type) {
  if (type === "qcm") return ans === item.correct;
  if (type === "truefalse")
    return (ans === true || ans === "true") === item.correct;
  if (type === "sql_fill") return checkSqlAnswer(ans, item.expected);
  if (type === "ldd") {
    if (!ans) return false;
    let low = ans.toLowerCase();
    if (item.expectedKeywords) {
      return item.expectedKeywords.some((k) => low.includes(k.toLowerCase()));
    }
    return low.includes((item.correct || "").toLowerCase().substring(0, 20));
  }
  if (type === "reflexion") {
    let low = (ans || "").toLowerCase();
    return item.expectedKeywords.some((k) => low.includes(k.toLowerCase()));
  }
  return false;
}

// ======================== AFFICHAGE THÉORIQUE ========================
function renderTheory() {
  const container = document.getElementById("questionsContainer");
  if (!container) return;
  container.innerHTML = "";
  questionsData.forEach((part) => {
    const partDiv = document.createElement("div");
    partDiv.className = "part-card";
    partDiv.innerHTML = `<div class="part-title">${part.title} <small>(${part.points} pts)</small></div>`;
    const listDiv = document.createElement("div");
    listDiv.className = "questions-list";
    part.items.forEach((item) => {
      const itemId = `${part.part}_${item.id}`;
      let inputHtml = "";
      if (part.type === "qcm") {
        inputHtml = `<div class="q-options">${item.options
          .map(
            (opt) =>
              `<label class="option"><input type="radio" name="${itemId}" value="${opt}"> ${opt}</label>`
          )
          .join("")}</div>`;
      } else if (part.type === "truefalse") {
        inputHtml = `<div class="truefalse"><label><input type="radio" name="${itemId}" value="true"> Vrai</label><label><input type="radio" name="${itemId}" value="false"> Faux</label></div>`;
      } else {
        inputHtml = `<textarea rows="3" id="ta_${itemId}" placeholder="Écrivez votre réponse SQL / texte..."></textarea><div><small>💡 ${
          item.hint || ""
        }</small></div>`;
      }
      const qDiv = document.createElement("div");
      qDiv.className = "question-item";
      qDiv.innerHTML = `<div class="q-text">${item.text}</div>${inputHtml}<div><button class="check-theory" data-id="${itemId}" data-type="${part.type}">🔍 Vérifier</button></div><div id="fb_${itemId}" class="feedback"></div>`;
      listDiv.appendChild(qDiv);
      if (theoryAnswers[itemId]) {
        if (part.type === "qcm") {
          let radio = qDiv.querySelector(
            `input[value="${theoryAnswers[itemId]}"]`
          );
          if (radio) radio.checked = true;
        } else if (part.type === "truefalse") {
          let val = theoryAnswers[itemId] === true ? "true" : "false";
          let r = qDiv.querySelector(`input[value="${val}"]`);
          if (r) r.checked = true;
        } else {
          let ta = qDiv.querySelector("textarea");
          if (ta) ta.value = theoryAnswers[itemId];
        }
      }
    });
    partDiv.appendChild(listDiv);
    container.appendChild(partDiv);
  });

  document.querySelectorAll(".check-theory").forEach((btn) => {
    btn.removeEventListener("click", handleTheoryCheck);
    btn.addEventListener("click", handleTheoryCheck);
  });
}

function handleTheoryCheck(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const type = btn.dataset.type;
  const qDiv = btn.closest(".question-item");
  let userAnswer = null;
  if (type === "qcm") {
    let sel = qDiv.querySelector(`input[name="${id}"]:checked`);
    userAnswer = sel ? sel.value : null;
  } else if (type === "truefalse") {
    let sel = qDiv.querySelector(`input[name="${id}"]:checked`);
    userAnswer = sel ? sel.value === "true" : null;
  } else {
    userAnswer = qDiv.querySelector("textarea")?.value || "";
  }

  let foundItem = null,
    foundType = null;
  for (let p of questionsData) {
    let it = p.items.find((i) => `${p.part}_${i.id}` === id);
    if (it) {
      foundItem = it;
      foundType = p.type;
      break;
    }
  }
  if (foundItem) {
    const isCorr = evaluateItem(foundItem, userAnswer, foundType);
    const fb = document.getElementById(`fb_${id}`);
    if (isCorr) {
      fb.innerHTML = "✅ Correct";
      fb.className = "feedback correct-feedback";
    } else {
      let msg = "❌ Incorrect. ";
      if (foundType === "sql_fill")
        msg += `Attendu: ${foundItem.expected.substring(0, 80)}...`;
      else if (foundType === "qcm") msg += `Correct: ${foundItem.correct}`;
      else if (foundType === "truefalse")
        msg += `Attendu: ${foundItem.correct ? "Vrai" : "Faux"}`;
      else if (foundType === "ldd")
        msg += `Conseil: ${
          foundItem.expectedKeywords
            ? foundItem.expectedKeywords.join(", ")
            : foundItem.correct
        }`;
      else msg += `Conseil: ${foundItem.expectedKeywords.join(", ")}`;

      if (foundType === "sql_fill" && userAnswer) {
        msg += `<br><small>🔍 Votre requête normalisée: "${normalizeSql(
          userAnswer
        )}"</small>`;
      }
      fb.innerHTML = msg;
      fb.className = "feedback wrong-feedback";
    }
    theoryAnswers[id] = userAnswer;
    updateTheoryScore();
  }
}

function updateTheoryScore() {
  let total = 0,
    obtained = 0;
  for (let p of questionsData) {
    let ptsPer = p.points / p.items.length;
    for (let item of p.items) {
      let id = `${p.part}_${item.id}`;
      let ans = theoryAnswers[id];
      total += ptsPer;
      if (ans !== undefined && evaluateItem(item, ans, p.type))
        obtained += ptsPer;
    }
  }
  const scoreSpan = document.getElementById("totalScoreSpan");
  if (scoreSpan) scoreSpan.innerText = Math.round(obtained);
}

function globalCorrectionTheory() {
  for (let p of questionsData) {
    for (let item of p.items) {
      let id = `${p.part}_${item.id}`;
      let qDiv = document.querySelector(
        `.question-item:has([name="${id}"], #ta_${id})`
      );
      if (!qDiv) continue;
      let userAnswer = null;
      if (p.type === "qcm") {
        let sel = qDiv.querySelector(`input[name="${id}"]:checked`);
        userAnswer = sel ? sel.value : null;
      } else if (p.type === "truefalse") {
        let sel = qDiv.querySelector(`input[name="${id}"]:checked`);
        userAnswer = sel ? sel.value === "true" : null;
      } else {
        userAnswer = qDiv.querySelector("textarea")?.value || "";
      }
      theoryAnswers[id] = userAnswer;
      let isCorr = evaluateItem(item, userAnswer, p.type);
      let fb = document.getElementById(`fb_${id}`);
      if (fb) {
        if (isCorr) {
          fb.innerHTML = "✅ Correct";
          fb.className = "feedback correct-feedback";
        } else {
          let msg = "❌ Incorrect. ";
          if (p.type === "sql_fill")
            msg += `Correction: ${item.expected.substring(0, 80)}...`;
          else if (p.type === "qcm") msg += `Réponse: ${item.correct}`;
          else if (p.type === "truefalse")
            msg += `Attendu: ${item.correct ? "Vrai" : "Faux"}`;
          else if (p.type === "ldd")
            msg += `Éléments attendus: ${
              item.expectedKeywords
                ? item.expectedKeywords.join(", ")
                : item.correct
            }`;
          else msg += `Éléments attendus: ${item.expectedKeywords.join(", ")}`;

          if (p.type === "sql_fill" && userAnswer) {
            msg += `<br><small>🔍 Votre requête normalisée: "${normalizeSql(
              userAnswer
            )}"</small>`;
          }
          fb.innerHTML = msg;
          fb.className = "feedback wrong-feedback";
        }
      }
    }
  }
  updateTheoryScore();
  alert(
    `Correction terminée ! Score théorie : ${Math.round(
      parseFloat(document.getElementById("totalScoreSpan").innerText)
    )}/30`
  );
}

// ======================== EXÉCUTEUR SQL PRATIQUE ========================
function executeSQL(sql) {
  try {
    let lower = sql.toLowerCase().trim();
    if (!lower.startsWith("select"))
      return { error: "Seul SELECT est supporté pour l'exécution pratique." };
    let fromMatch = lower.match(
      /from\s+([\w\s,]+)(?: where | group by | order by |$)/
    );
    if (!fromMatch) return { error: "FROM introuvable" };
    let tablesRaw = fromMatch[1].split(",").map((t) => t.trim());
    let whereClause = "";
    let groupByCol = null;
    if (lower.includes(" where ")) {
      let wherePart = lower.split(" where ")[1];
      if (lower.includes(" group by "))
        whereClause = wherePart.split(" group by ")[0];
      else if (lower.includes(" order by "))
        whereClause = wherePart.split(" order by ")[0];
      else whereClause = wherePart;
    }
    if (lower.includes(" group by "))
      groupByCol = lower.split(" group by ")[1].split(" ")[0].trim();
    let tableRefs = tablesRaw.map((t) => DB[t.toUpperCase()]);
    if (tableRefs.some((t) => !t)) return { error: "Table inconnue" };
    let dataRows = [];
    function cartesian(arr, idx, current) {
      if (idx === arr.length) {
        dataRows.push({ ...current });
        return;
      }
      for (let row of arr[idx]) cartesian(arr, idx + 1, { ...current, ...row });
    }
    cartesian(tableRefs, 0, {});
    if (whereClause && whereClause.length > 0)
      dataRows = dataRows.filter((row) => evalWhereSimple(row, whereClause));
    if (groupByCol) {
      let groups = new Map();
      for (let row of dataRows) {
        let key = row[groupByCol];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }
      let selectCols = sql.match(/select\s+(.*?)\s+from/i)[1];
      let aggRes = [];
      for (let [key, rowsG] of groups.entries()) {
        let newRow = { [groupByCol]: key };
        let avgMatch = selectCols.match(/avg\(([^)]+)\)/i);
        if (avgMatch) {
          let col = avgMatch[1].trim();
          let vals = rowsG.map((r) => r[col]).filter((v) => !isNaN(v));
          let avgV = vals.length
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : 0;
          newRow[`AVG(${col})`] = Math.round(avgV * 100) / 100;
        }
        let cntMatch = selectCols.match(/count\(([^)]+)\)/i);
        if (cntMatch) newRow[`COUNT(${cntMatch[1]})`] = rowsG.length;
        let sumMatch = selectCols.match(/sum\(([^)]+)\)/i);
        if (sumMatch) {
          let col = sumMatch[1].trim();
          let total = rowsG.reduce((a, b) => a + (b[col] || 0), 0);
          newRow[`SUM(${col})`] = total;
        }
        aggRes.push(newRow);
      }
      dataRows = aggRes;
    }
    return { rows: dataRows.slice(0, 100) };
  } catch (e) {
    return { error: e.message };
  }
}

function evalWhereSimple(row, cond) {
  let c = cond;
  for (let [k, v] of Object.entries(row)) {
    let regex = new RegExp(`\\b${k}\\b`, "gi");
    let repl = typeof v === "string" ? `'${v}'` : v;
    c = c.replace(regex, repl);
  }
  c = c.replace(/AND/gi, "&&").replace(/OR/gi, "||").replace(/=/g, "===");
  try {
    return Function('"use strict";return (' + c + ")")();
  } catch (e) {
    return false;
  }
}

// ======================== AFFICHAGE PRATIQUE ========================
const pratiqueQuestions = [
  "Âge moyen des garçons et des filles au 1er janvier 2025",
  "Nom et grade des enseignants d'Histoire",
  "Étudiants (nom, numéro) sans note en Sociologie",
  "Nom et coefficient des matières enseignées par MCF ou Assistant",
  "Pour chaque étudiant, moyenne par matière, ordre alphabétique",
  "Étudiants avec note Informatique > moyenne générale en Informatique",
  "Étudiants ayant une note dans chaque matière : moyenne diplôme avec coefficients",
  "Enseignants (nom, grade, ancienneté) qui enseignent dans plus d'une matière",
  "Nombre de garçons et filles ayant réussi (moyenne générale >= 10)",
  "Étudiants avec note Informatique supérieure à leur note en Maths",
  "Couples (garçon, fille) dont la différence d'âge ≤ 180 jours",
  "Étudiants n'ayant pas de note dans une matière (afficher nom, numéro, matière)",
  "Matières avec moyenne des notes < 10 et nom de l'enseignant",
  "Pour chaque matière : meilleure note et étudiant qui l'a obtenue",
  "Moyenne des notes dans la matière enseignée par 'Ali Ben Salah' par sexe",
];

function renderPractice() {
  const container = document.getElementById("practiceContainer");
  if (!container) return;
  container.innerHTML = "";
  pratiqueQuestions.forEach((text, idx) => {
    const num = idx + 1;
    const card = document.createElement("div");
    card.className = "part-card";
    card.innerHTML = `
      <div class="part-title">Requête ${num} <small>${text.substring(
      0,
      60
    )}...</small></div>
      <div class="questions-list">
        <div class="question-item">
          <div class="q-text">${text}</div>
          <textarea class="sql-query" rows="4" placeholder="Écrivez votre requête SELECT ici..."></textarea>
          <div>
            <button class="run-sql" data-num="${num}">▶️ Exécuter</button>
            <button class="reset-sql" data-num="${num}">🗑️ Effacer</button>
          </div>
          <div class="result-area" id="result-${num}">💡 Cliquez sur Exécuter pour afficher le résultat.</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  document.querySelectorAll(".run-sql").forEach((btn) => {
    btn.removeEventListener("click", handleRunSql);
    btn.addEventListener("click", handleRunSql);
  });
  document.querySelectorAll(".reset-sql").forEach((btn) => {
    btn.removeEventListener("click", handleResetSql);
    btn.addEventListener("click", handleResetSql);
  });
}

function handleRunSql(e) {
  const btn = e.currentTarget;
  const num = btn.dataset.num;
  const card = btn.closest(".part-card");
  const textarea = card.querySelector(".sql-query");
  const resultDiv = document.getElementById(`result-${num}`);
  const sql = textarea.value;
  if (!sql.trim()) {
    resultDiv.innerHTML = "⚠️ Veuillez saisir une requête SQL.";
    return;
  }
  const result = executeSQL(sql);
  if (result.error) {
    resultDiv.innerHTML = `❌ Erreur: ${result.error}`;
    return;
  }
  if (!result.rows || result.rows.length === 0) {
    resultDiv.innerHTML = "✅ Résultat: Aucune ligne trouvée.";
    return;
  }
  let html = '<table class="result-table"><thead><tr>';
  const cols = Object.keys(result.rows[0]);
  cols.forEach((col) => (html += `<th>${col}</th>`));
  html += "</thead><tbody>";
  result.rows.forEach((row) => {
    html += "<tr>";
    cols.forEach(
      (col) => (html += `<td>${row[col] !== undefined ? row[col] : ""}</td>`)
    );
    html += "</tr>";
  });
  html += "</tbody></table>";
  resultDiv.innerHTML = html;
}

function handleResetSql(e) {
  const btn = e.currentTarget;
  const num = btn.dataset.num;
  const card = btn.closest(".part-card");
  const textarea = card.querySelector(".sql-query");
  const resultDiv = document.getElementById(`result-${num}`);
  textarea.value = "";
  resultDiv.innerHTML = "🔁 Requête effacée.";
}

// ======================== GESTION DES ONGLETS ========================
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));
      if (tabId === "theory") {
        document.getElementById("theoryTab").classList.add("active");
      } else if (tabId === "practice") {
        document.getElementById("practiceTab").classList.add("active");
        renderPractice();
      }
    });
  });
}

// ======================== INITIALISATION ========================
document.addEventListener("DOMContentLoaded", () => {
  renderTheory();
  renderPractice();
  initTabs();
  const submitBtn = document.getElementById("submitAllBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", globalCorrectionTheory);
  }
});
