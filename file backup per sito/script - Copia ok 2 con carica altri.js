const TELEGRAM_BOT = "pega_movies_and_series_bot";
let filmData = {}, serieData = {};

// ================= Utility =================

function showSection(sezId) {
  document.getElementById("homepage").classList.add("hidden");
  ["film-section","serie-section","latest-section"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(sezId).classList.remove("hidden");
}

function showHome() {
  ["film-section","serie-section","latest-section"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById("homepage").classList.remove("hidden");
}
window.showHome = showHome;

function generaListaAnniFilm(arr) {
  const anniSet = new Set();
  arr.forEach(e => {
    let val = e.anno || e.anno_csv;
    if (!val) return;
    val = val.toString();
    if (/^\d{4}$/.test(val)) anniSet.add(val);
  });
  return Array.from(anniSet).sort().reverse();
}

function generaListaAnniSerie(arr) {
  const anniSet = new Set();
  arr.forEach(e => {
    let val = (e.anno || "").toString();
    const match = val.match(/^(\d{4})/);
    if (match) anniSet.add(match[1]);
  });
  return Array.from(anniSet).sort().reverse();
}

function generaListaGeneri(arr) {
  const generiSet = new Set();
  arr.forEach(e => {
    if (e.generi) e.generi.forEach(g => generiSet.add(g));
    else if (e.genere) generiSet.add(e.genere);
  });
  return Array.from(generiSet).sort();
}

// ================ Schede con espansione trama ================

function creaSchedaFilm(elemento) {
  const div = document.createElement('div');
  div.classList.add('scheda');

  // safety & prepare trama
  const tramaCompleta = (elemento.trama || '').replace(/</g,'').replace(/>/g,'').trim();
  const maxLen = 300; // numero di caratteri visibili nella versione breve
  const tramaCorta = tramaCompleta.length > maxLen ? tramaCompleta.substring(0, maxLen) + "..." : tramaCompleta;

  div.innerHTML = `
    <img src="${elemento.locandina || 'img/placeholder.jpg'}" alt="${elemento.titolo || ''}">
    <h4 title="${elemento.titolo || ''}">${elemento.titolo || ''}</h4>
    <p>Anno: ${elemento.anno || elemento.anno_csv || '?'}</p>
    <p>Genere: ${(Array.isArray(elemento.generi) ? elemento.generi.join(', ') : (elemento.genere || ''))}</p>
    <p>Rating: ${elemento.rating || 'n/d'}</p>

    <div class="trama-wrapper">
      <p class="trama breve">${tramaCorta}</p>
      <p class="trama completa hidden">${tramaCompleta}</p>
      ${tramaCompleta.length > maxLen ? '<div class="trama-fade"></div>' : ''}
      ${tramaCompleta.length > maxLen ? '<button class="toggle-trama">Continua a leggere</button>' : ''}
    </div>

    ${ elemento.telegram_code ? `<a href="https://t.me/${TELEGRAM_BOT}?start=${elemento.telegram_code}" target="_blank" class="tg-btn">Su Telegram</a>` : '' }
  `;

  // attach toggle handler (natural expansion)
  const btn = div.querySelector('.toggle-trama');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const breve = div.querySelector('.trama.breve');
      const completa = div.querySelector('.trama.completa');
      const fade = div.querySelector('.trama-fade');

      if (completa.classList.contains('hidden')) {
        // espandi: mostra completa, nascondi breve e fade
        breve.classList.add('hidden');
        completa.classList.remove('hidden');
        if (fade) fade.style.display = 'none';
        btn.textContent = 'Mostra meno';
      } else {
        // richiudi
        completa.classList.add('hidden');
        breve.classList.remove('hidden');
        if (fade) fade.style.display = 'block';
        btn.textContent = 'Continua a leggere';
        // scroll to card top to keep UX consistent
        div.scrollIntoView({behavior:'smooth', block:'nearest'});
      }
    });
  }

  return div;
}

function creaSchedaSerieCollapsed(elemento, index) {
  const div = document.createElement('div');
  div.classList.add('scheda', 'scheda-serie-collapsed');

  const tramaCompleta = (elemento.trama || '').replace(/</g,'').replace(/>/g,'').trim();
  const maxLen = 300;
  const tramaCorta = tramaCompleta.length > maxLen ? tramaCompleta.substring(0, maxLen) + "..." : tramaCompleta;

  div.innerHTML = `
    <img src="${elemento.locandina || 'img/placeholder.jpg'}" alt="${elemento.nome_serie || elemento.titolo || ''}">
    <h4>${elemento.nome_serie || elemento.titolo || ''}</h4>
    <p>Anno: ${elemento.anno || '?'}</p>
    <p>Genere: ${(Array.isArray(elemento.generi) ? elemento.generi.join(', ') : (elemento.genere || ''))}</p>
    <p>Rating: ${elemento.rating || 'n/d'}</p>

    <div class="trama-wrapper">
      <p class="trama breve">${tramaCorta}</p>
      <p class="trama completa hidden">${tramaCompleta}</p>
      ${tramaCompleta.length > maxLen ? '<div class="trama-fade"></div>' : ''}
      ${tramaCompleta.length > maxLen ? '<button class="toggle-trama">Continua a leggere</button>' : ''}
    </div>

    <span style="color:#72e9ff; font-size:1em;">▶ Clicca per dettagli</span>
  `;

  // prevent detail opening when clicking toggle
  const btn = div.querySelector('.toggle-trama');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const breve = div.querySelector('.trama.breve');
      const completa = div.querySelector('.trama.completa');
      const fade = div.querySelector('.trama-fade');

      if (completa.classList.contains('hidden')) {
        breve.classList.add('hidden');
        completa.classList.remove('hidden');
        if (fade) fade.style.display = 'none';
        btn.textContent = 'Mostra meno';
      } else {
        completa.classList.add('hidden');
        breve.classList.remove('hidden');
        if (fade) fade.style.display = 'block';
        btn.textContent = 'Continua a leggere';
        div.scrollIntoView({behavior:'smooth', block:'nearest'});
      }
    });
  }

  div.onclick = () => mostraDettagliSerie(index, elemento);

  return div;
}

// ============= Filtri e funzioni di ricerca =============

function filtraCineteca(arr, g, a, t) {
  return arr.filter(f =>
    f.anno_csv && +f.anno_csv < 2000
    && (!g || (f.generi || []).includes(g))
    && (!a || (f.anno_csv === a || f.anno === a))
    && (!t || (f.titolo || '').toLowerCase().includes(t))
    && !((f.generi || []).includes('Animazione')));
}

function filtraAnimazione(arr, g, a, t) {
  return arr.filter(f =>
    (f.generi || []).includes('Animazione')
    && (!g || (f.generi || []).includes(g))
    && (!a || (f.anno_csv === a || f.anno === a))
    && (!t || (f.titolo || '').toLowerCase().includes(t)));
}

function filtraFilm2000(arr, g, a, t) {
  return arr.filter(f =>
    f.anno_csv && +f.anno_csv >= 2000
    && (!g || (f.generi || []).includes(g))
    && (!a || (f.anno_csv === a || f.anno === a))
    && (!t || (f.titolo || '').toLowerCase().includes(t))
    && !((f.generi || []).includes('Animazione')));
}

// ============= Paginate render functions =============

function mostraListaFilmPaginata(lista, containerId, btnId, step=12) {
  const container = document.getElementById(containerId);
  const btn = document.getElementById(btnId);
  container.innerHTML = '';
  let offset = 0;
  btn.textContent = 'Carica altri';
  btn.classList.remove('show');
  function renderChunk() {
    const chunk = lista.slice(offset, offset+step);
    chunk.forEach(elem => container.appendChild(creaSchedaFilm(elem)));
    offset += step;
    if (offset < lista.length) btn.classList.add('show');
    else btn.classList.remove('show');
  }
  btn.onclick = renderChunk;
  renderChunk();
}

let serieFiltrataUltima = [];
function mostraListaSeriePaginata(lista, containerId, btnId, step=12) {
  serieFiltrataUltima = lista;
  const container = document.getElementById(containerId);
  const btn = document.getElementById(btnId);
  container.innerHTML = '';
  let offset = 0;
  btn.textContent = 'Carica altri';
  btn.classList.remove('show');
  function renderChunk() {
    const chunk = lista.slice(offset, offset+step);
    chunk.forEach((elem, i) =>
      container.appendChild(creaSchedaSerieCollapsed(elem, offset+i))
    );
    offset += step;
    if (offset < lista.length) btn.classList.add('show');
    else btn.classList.remove('show');
  }
  btn.onclick = renderChunk;
  renderChunk();
}

function mostraListaUltimiPaginata(lista, containerId, btnId, step = 12) {
  const container = document.getElementById(containerId);
  const btn = document.getElementById(btnId);

  container.innerHTML = '';
  let offset = 0;
  btn.textContent = "Carica altri";
  btn.classList.remove('show');

  function renderChunk() {
    const chunk = lista.slice(offset, offset + step);

    chunk.forEach(elem => {
      if (elem.tipo === "film") container.appendChild(creaSchedaFilm(elem));
      else container.appendChild(creaSchedaSerieCollapsed(elem, offset));
    });

    offset += step;

    if (offset < lista.length) btn.classList.add("show");
    else btn.classList.remove("show");
  }

  btn.onclick = renderChunk;
  renderChunk();
}

// ============= Mostra Film/Serie/Ultimi =============

function mostraFilm() {
  const tutte = Object.values(filmData);
  const filtroTesto = document.getElementById("search-input-film").value.trim().toLowerCase();
  const genere = document.getElementById("genere-film").value;
  const anno = document.getElementById("anno-film").value;
  mostraListaFilmPaginata(filtraCineteca(tutte, genere, anno, filtroTesto), "cineteca-container", "carica-cineteca");
  mostraListaFilmPaginata(filtraFilm2000(tutte, genere, anno, filtroTesto), "film2000-container", "carica-film2000");
  mostraListaFilmPaginata(filtraAnimazione(tutte, genere, anno, filtroTesto), "animazioni-container", "carica-animazione");
}

function mostraSerie() {
  const tutte = Object.values(serieData);
  const filtroTesto = document.getElementById("search-input-serie").value.trim().toLowerCase();
  const genere = document.getElementById("genere-serie").value;
  const anno = document.getElementById("anno-serie").value;
  const filtrate = tutte.filter(e =>
    (!genere || (e.generi || []).includes(genere)) &&
    (!anno || (e.anno && e.anno.toString().startsWith(anno))) &&
    (!filtroTesto || (e.nome_serie || '').toLowerCase().includes(filtroTesto))
  );
  mostraListaSeriePaginata(filtrate, "serie-container", "carica-serie");
}

function mostraDettagliSerie(index, serieObj) {
  const grid = document.getElementById("serie-container");
  const expandedDiv = document.createElement('div');
  expandedDiv.classList.add("scheda","scheda-serie-expanded");
  expandedDiv.innerHTML = `
    <img src="${serieObj.locandina || 'img/placeholder.jpg'}" style="max-width:210px">
    <h4>${serieObj.nome_serie || serieObj.titolo || ''}</h4>
    <p>Anno: ${serieObj.anno || '?'}</p>
    <p>Genere: ${(Array.isArray(serieObj.generi) ? serieObj.generi.join(', ') : (serieObj.genere || ''))}</p>
    <p>Rating: ${serieObj.rating || 'n/d'}</p>
    <p style="white-space:normal;">${serieObj.trama || ''}</p>
    ${generaEpisodiHTML(serieObj)}
    <button class="menu-btn" onclick="chiudiDettagliSerie(${index})">Chiudi</button>
  `;
  grid.replaceChild(expandedDiv, grid.children[index]);
  window.chiudiDettagliSerie = (idx) => {
    mostraListaSeriePaginata(serieFiltrataUltima, "serie-container", "carica-serie");
  }
}

function mostraUltimiInserimenti() {
  const tipo = document.getElementById("filtro-ultimi").value;
  let filmUltimi = Object.values(filmData).filter(f=>f.data_inserimento).sort((a,b)=>(b.data_inserimento.localeCompare(a.data_inserimento)));
  let serieUltime = Object.values(serieData).filter(s=>s.data_inserimento).sort((a,b)=>(b.data_inserimento.localeCompare(a.data_inserimento)));
  let elenco = [];

  if (tipo === "film") elenco = filmUltimi.map(f => ({...f, tipo: 'film'}));
  else if (tipo === "serie") elenco = serieUltime.map(s => ({...s, tipo: 'serie'}));
  else elenco = filmUltimi.map(f => ({...f, tipo: 'film'})).concat(serieUltime.map(s => ({...s, tipo: 'serie'})))
    .sort((a,b) => b.data_inserimento.localeCompare(a.data_inserimento));

  mostraListaUltimiPaginata(elenco, "latest-container", "carica-latest");
}

// ============= Caricamento dati e init =============

async function main() {
  try {
    let filmJson = await fetch('film.json');
    let serieJson = await fetch('serie.json');
    filmData = await filmJson.json();
    serieData = await serieJson.json();
  } catch (e) {
    console.error("Errore caricamento JSON:", e);
    return;
  }

  // collegamenti menu
  document.getElementById("go-films").onclick = function(){ showSection("film-section"); mostraFilm(); };
  document.getElementById("go-series").onclick = function(){ showSection("serie-section"); mostraSerie(); };
  document.getElementById("go-latest").onclick = function(){ showSection("latest-section"); mostraUltimiInserimenti(); };

  // FILM filtri
  const generiF = generaListaGeneri(Object.values(filmData));
  const anniF = generaListaAnniFilm(Object.values(filmData));
  const genereFilmSelect = document.getElementById("genere-film");
  const annoFilmSelect = document.getElementById("anno-film");
  generiF.forEach(g=>{
    const o=document.createElement("option");
    o.value=g; o.text=g;
    genereFilmSelect.appendChild(o);
  });
  anniF.forEach(a=>{
    const o=document.createElement("option");
    o.value=a; o.text=a;
    annoFilmSelect.appendChild(o);
  });
  document.getElementById("search-btn-film").onclick = mostraFilm;
  document.getElementById("search-input-film").addEventListener("keyup", e=>{
    if(e.key==="Enter") mostraFilm();
  });
  document.getElementById("genere-film").onchange = mostraFilm;
  document.getElementById("anno-film").onchange = mostraFilm;

  // SERIE filtri
  const generiS = generaListaGeneri(Object.values(serieData));
  const anniS = generaListaAnniSerie(Object.values(serieData));
  const genereSerieSelect = document.getElementById("genere-serie");
  const annoSerieSelect = document.getElementById("anno-serie");
  generiS.forEach(g=>{
    const o=document.createElement("option");
    o.value=g; o.text=g;
    genereSerieSelect.appendChild(o);
  });
  anniS.forEach(a=>{
    const o=document.createElement("option");
    o.value=a; o.text=a;
    annoSerieSelect.appendChild(o);
  });
  document.getElementById("search-btn-serie").onclick = mostraSerie;
  document.getElementById("search-input-serie").addEventListener("keyup", e=>{
    if(e.key==="Enter") mostraSerie();
  });
  document.getElementById("genere-serie").onchange = mostraSerie;
  document.getElementById("anno-serie").onchange = mostraSerie;

  // ultimi inserimenti filtro
  document.getElementById("filtro-ultimi").onchange = mostraUltimiInserimenti;

  // iniziale: mostra home
  showHome();
}

main();
