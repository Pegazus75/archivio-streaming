const TELEGRAM_BOT = "pega_movies_and_series_bot";
let filmData = {}, serieData = {};

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

function creaSchedaFilm(elemento) {
  const div = document.createElement('div');
  div.classList.add('scheda');
  div.innerHTML = `
    <img src="${elemento.locandina || 'img/placeholder.jpg'}" alt="${elemento.titolo || ''}">
    <h4 title="${elemento.titolo || ''}">${elemento.titolo || ''}</h4>
    <p>Anno: ${elemento.anno || elemento.anno_csv || '?'}</p>
    <p>Genere: ${(Array.isArray(elemento.generi) ? elemento.generi.join(', ') : (elemento.genere || ''))}</p>
    <p>Rating: ${elemento.rating || 'n/d'}</p>
    <p>${(elemento.trama || '').replace(/</g,'').replace(/>/g,'')}</p>
    ${
      elemento.telegram_code
      ? `<a href="https://t.me/${TELEGRAM_BOT}?start=${elemento.telegram_code}" target="_blank" class="tg-btn">Su Telegram</a>`
      : ''
    }
  `;
  return div;
}

function creaSchedaSerieCollapsed(elemento, index) {
  const div = document.createElement('div');
  div.classList.add('scheda', 'scheda-serie-collapsed');
  div.innerHTML = `
    <img src="${elemento.locandina || 'img/placeholder.jpg'}" alt="${elemento.nome_serie || elemento.titolo || ''}">
    <h4>${elemento.nome_serie || elemento.titolo || ''}</h4>
    <p>Anno: ${elemento.anno || '?'}</p>
    <p>Genere: ${(Array.isArray(elemento.generi) ? elemento.generi.join(', ') : (elemento.genere || ''))}</p>
    <p>Rating: ${elemento.rating || 'n/d'}</p>
    <p>${(elemento.trama || '').replace(/</g,'').replace(/>/g,'')}</p>
    <span style="color:#72e9ff; font-size:1em;">▶ Clicca per dettagli</span>
  `;
  div.onclick = () => mostraDettagliSerie(index, elemento);
  return div;
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

function generaEpisodiHTML(serieObj) {
  if(!serieObj.stagioni) return "";
  let html = `<div class="expanded-episode-list">`;
  Object.entries(serieObj.stagioni).forEach(([nStagione, stagione]) => {
    html += `<h5>Stagione ${nStagione}</h5><ul>`;
    for(const ep of (stagione.episodi || [])) {
      html += `<li>${ep.titolo_episodio||''} ${
        ep.telegram_code
        ? `<a href="https://t.me/${TELEGRAM_BOT}?start=${ep.telegram_code}" target="_blank" class="tg-btn">Telegram</a>` 
        : ''
      }</li>`;
    }
    html += `</ul>`;
  });
  html += "</div>";
  return html;
}

function generaListaGeneri(arr) {
  const generiSet = new Set();
  arr.forEach(e => {
    if (e.generi) e.generi.forEach(g => generiSet.add(g));
    else if (e.genere) generiSet.add(e.genere);
  });
  return Array.from(generiSet).sort();
}

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

function mostraUltimiInserimenti() {
  const tipo = document.getElementById("filtro-ultimi").value;
  let filmUltimi = Object.values(filmData).filter(f=>f.data_inserimento).sort((a,b)=>(b.data_inserimento.localeCompare(a.data_inserimento)));
  let serieUltime = Object.values(serieData).filter(s=>s.data_inserimento).sort((a,b)=>(b.data_inserimento.localeCompare(a.data_inserimento)));
  let elenco = [];
  if(tipo === "film") elenco = filmUltimi.slice(0,20).map(creaSchedaFilm);
  else if(tipo === "serie") elenco = serieUltime.slice(0,20).map(creaSchedaSerieCollapsed);
  else elenco = filmUltimi.slice(0,10).map(creaSchedaFilm).concat(serieUltime.slice(0,10).map(creaSchedaSerieCollapsed));
  const cont = document.getElementById("latest-container");
  cont.innerHTML = '';
  elenco.forEach(elem => cont.appendChild(elem));
}

async function main() {
  let filmJson = await fetch('film.json');
  let serieJson = await fetch('serie.json');
  filmData = await filmJson.json();
  serieData = await serieJson.json();

  document.getElementById("go-films").onclick = function(){ showSection("film-section"); mostraFilm(); };
  document.getElementById("go-series").onclick = function(){ showSection("serie-section"); mostraSerie(); };
  document.getElementById("go-latest").onclick = function(){ showSection("latest-section"); mostraUltimiInserimenti(); };

  // FILM filtri
  const generiF = generaListaGeneri(Object.values(filmData));
  const anniF = generaListaAnniFilm(Object.values(filmData));
  generiF.forEach(g=>{
    const o=document.createElement("option");
    o.value=g;
    o.text=g;
    document.getElementById("genere-film").appendChild(o)
  });
  anniF.forEach(a=>{
    const o=document.createElement("option");
    o.value=a;
    o.text=a;
    document.getElementById("anno-film").appendChild(o)
  });
  document.getElementById("search-btn-film").onclick = mostraFilm;
  document.getElementById("search-input-film").addEventListener("keyup", e=>{
    if(e.key==="Enter")
      mostraFilm();
  });
  document.getElementById("genere-film").onchange = mostraFilm;
  document.getElementById("anno-film").onchange = mostraFilm;

  // SERIE filtri
  const generiS = generaListaGeneri(Object.values(serieData));
  const anniS = generaListaAnniSerie(Object.values(serieData));
  generiS.forEach(g=>{
    const o=document.createElement("option");
    o.value=g;
    o.text=g;
    document.getElementById("genere-serie").appendChild(o)
  });
  anniS.forEach(a=>{
    const o=document.createElement("option");
    o.value=a;
    o.text=a;
    document.getElementById("anno-serie").appendChild(o)
  });
  document.getElementById("search-btn-serie").onclick = mostraSerie;
  document.getElementById("search-input-serie").addEventListener("keyup", e=>{
    if(e.key==="Enter")
      mostraSerie();
  });
  document.getElementById("genere-serie").onchange = mostraSerie;
  document.getElementById("anno-serie").onchange = mostraSerie;

  // ULTIMI INSERIMENTI
  document.getElementById("filtro-ultimi").onchange = mostraUltimiInserimenti;
}

main();
