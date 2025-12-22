import fs from "fs";
import fetch from "node-fetch";

// 1️⃣ chiave TMDB (la inseriremo dopo su GitHub)
const TMDB_KEY = process.env.TMDB_KEY;

// 2️⃣ percorsi file
const DB_PATH = "./database.json";
const OUT_PATH = "./trending-history.json";

async function run() {

  // 🔹 carichiamo il TUO database
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

  // 🔹 creiamo un set di titoli presenti (minuscolo)
  const titlesInDb = new Set(
    db.map(item => item.titolo.toLowerCase())
  );

  // 🔹 prendiamo i trend del giorno da TMDB
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}&language=it-IT`
  );

  const data = await response.json();

  // 🔹 data di oggi (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  // 🔹 prendiamo solo i titoli che esistono nel tuo DB
  const matchedTitles = data.results
    .map(item => item.title || item.name)
    .filter(Boolean)
    .filter(title =>
      titlesInDb.has(title.toLowerCase())
    )
    .slice(0, 16); // minimo 16

  // se non trova nulla, non scrive nulla
  if (!matchedTitles.length) return;

  // 🔹 carichiamo lo storico esistente
  let history = {};
  if (fs.existsSync(OUT_PATH)) {
    history = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
  }

  // 🔹 aggiungiamo la giornata
  history[today] = matchedTitles;

  // 🔹 salviamo lo storico
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(history, null, 2)
  );
}

run();
