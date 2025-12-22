import fs from "fs";

// ==============================
// CONFIG
// ==============================
const TMDB_KEY = process.env.TMDB_KEY;
const DB_PATH = "./database.json";
const OUT_PATH = "./trending-history.json";

// ==============================
// CHECK CHIAVE
// ==============================
if (!TMDB_KEY) {
  console.error("❌ ERRORE: TMDB_KEY mancante");
  process.exit(1);
}

// ==============================
// MAIN
// ==============================
async function run() {
  console.log("▶ Avvio aggiornamento titoli del momento");

  // 🔹 carica il TUO database
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

  // 🔹 set titoli presenti nel DB
  const titlesInDb = new Set(
    db
      .map(item => item.titolo)
      .filter(Boolean)
      .map(t => t.toLowerCase())
  );

  console.log(`📚 Titoli nel DB: ${titlesInDb.size}`);

  // 🔹 chiamata TMDB
  const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}&language=it-IT`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB errore HTTP ${response.status}`);
  }

  const data = await response.json();

  // 🔹 data di oggi
  const today = new Date().toISOString().slice(0, 10);

  // 🔹 filtra solo titoli presenti nel DB
  const matchedTitles = data.results
    .map(item => item.title || item.name)
    .filter(Boolean)
    .filter(title => titlesInDb.has(title.toLowerCase()))
    .slice(0, 16);

  console.log(`🔥 Titoli trovati oggi: ${matchedTitles.length}`);

  if (!matchedTitles.length) {
    console.log("⚠ Nessun titolo trovato, esco");
    return;
  }

  // 🔹 carica storico
  let history = {};
  if (fs.existsSync(OUT_PATH)) {
    history = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
  }

  // 🔹 aggiunge la giornata
  history[today] = matchedTitles;

  // 🔹 salva file
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(history, null, 2)
  );

  console.log("✅ trending-history.json aggiornato");
}

run().catch(err => {
  console.error("❌ ERRORE:", err.message);
  process.exit(1);
});

