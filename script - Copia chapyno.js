/* --- CONFIG --- */
const TELEGRAM_BOT = "pega_movies_and_series_bot";

/* --- NAVIGAZIONE TRA PAGINE --- */
function showHome() {
  document.getElementById("homepage").classList.remove("hidden");
  document.getElementById("film-section").classList.add("hidden");
  document.getElementById("serie-section").classList.add("hidden");
  document.getElementById("latest-section").classList.add("hidden");
}

document.getElementById("go-films").onclick = () => {
  document.getElementById("homepage").classList.add("hidden");
  document.getElementById("film-section").classList.remove("hidden");
};

document.getElementById("go-series").onclick = () => {
  document.getElementById("homepage").classList.add("hidden");
  document.getElementById("serie-section").classList.remove("hidden");
};

document.getElementById("go-latest").onclick = () => {
  document.getElementById("homepage").classList.add("hidden");
  document.getElementById("latest-section").classList.remove("hidden");
};

/* --- CREAZIONE CARD FILM --- */
function creaSchedaFilm(elemento) {
  const div = document.createElement("div");
  div.classList.add("scheda");

  const tramaCompleta = (elemento.trama || "").replace(/</g, "").replace(/>/g, "");
  const maxLen = 250;
  const tramaCorta =
    tramaCompleta.length > maxLen
      ? tramaCompleta.substring(0, maxLen) + "..."
      : tramaCompleta;

  div.innerHTML = `
    <img src="${elemento.locandina || "img/placeholder.jpg"}" alt="${elemento.titolo}">
    <h4 title="${elemento.titolo}">${elemento.titolo}</h4>
    <p>Anno: ${elemento.anno || elemento.anno_csv || "?"}</p>
    <p>Genere: ${(Array.isArray(elemento.generi) ? elemento.generi.join(", ") : elemento.genere) || ""}</p>
    <p>Rating: ${elemento.rating || "n/d"}</p>

    <p class="trama breve">${tramaCorta}</p>
    <p class="trama completa hidden">${tramaCompleta}</p>

    ${
      tramaCompleta.length > maxLen
        ? `<button class="toggle-trama">Continua a leggere</button>`
        : ""
    }

    ${
      elemento.telegram_code
        ? `<a href="https://t.me/${TELEGRAM_BOT}?start=${elemento.telegram_code}" target="_blank" class="tg-btn">Su Telegram</a>`
        : ""
    }
  `;

  const btn = div.querySelector(".toggle-trama");
  if (btn) {
    btn.addEventListener("click", () => {
      const breve = div.querySelector(".trama.breve");
      const completa = div.querySelector(".trama.completa");

      const collapsed = completa.classList.contains("hidden");

      if (collapsed) {
        breve.classList.add("hidden");
        completa.classList.remove("hidden");
        btn.textContent = "Mostra meno";
      } else {
        completa.classList.add("hidden");
        breve.classList.remove("hidden");
        btn.textContent = "Continua a leggere";
      }
    });
  }

  return div;
}

/* --- CREAZIONE CARD SERIE CON ESPANSIONE --- */
function creaSchedaSerieCollapsed(elemento, index) {
  const div = document.createElement("div");
  div.classList.add("scheda", "scheda-serie-collapsed");

  const tramaCompleta = (elemento.trama || "").replace(/</g, "").replace(/>/g, "");
  const maxLen = 250;
  const tramaCorta =
    tramaCompleta.length > maxLen
      ? tramaCompleta.substring(0, maxLen) + "..."
      : tramaCompleta;

  div.innerHTML = `
    <img src="${elemento.locandina || "img/placeholder.jpg"}" alt="${elemento.nome_serie}">
    <h4>${elemento.nome_serie}</h4>
    <p>Anno: ${elemento.anno || "?"}</p>
    <p>Genere: ${(Array.isArray(elemento.generi) ? elemento.generi.join(", ") : elemento.genere) || ""}</p>
    <p>Rating: ${elemento.rating || "n/d"}</p>

    <p class="trama breve">${tramaCorta}</p>
    <p class="trama completa hidden">${tramaCompleta}</p>

    ${
      tramaCompleta.length > maxLen
        ? `<button class="toggle-trama">Continua a leggere</button>`
        : ""
    }

    <span style="color:#72e9ff;">▶ Clicca per dettagli</span>
  `;

  const btn = div.querySelector(".toggle-trama");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const breve = div.querySelector(".trama.breve");
      const completa = div.querySelector(".trama.completa");

      const collapsed = completa.classList.contains("hidden");

      if (collapsed) {
        breve.classList.add("hidden");
        completa.classList.remove("hidden");
        btn.textContent = "Mostra meno";
      } else {
        completa.classList.add("hidden");
        breve.classList.remove("hidden");
        btn.textContent = "Continua a leggere";
      }
    });
  }

  div.onclick = () => mostraDettagliSerie(index, elemento);

  return div;
}

/* --- QUI CONTINUANO I TUOI ALTRI CODICI DI CARICAMENTO DATI --- */
/* (caricamento film, serie, ultimi inserimenti, filtri, ecc.)
   Non li sovrascrivo perché già funzionano; si appendono qui sotto.
*/
