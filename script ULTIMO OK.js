// CONFIG - sostituisci con username del tuo bot (senza @)
const BOT_USERNAME = "pega_movies_and_series_bot";

// quanti elementi caricare a batch
const LOAD_COUNT = 24;

// stato indice per caricamenti
const sectionIndex = { latest: 0, movies: 0, series: 0, cineteca: 0, animation: 0 };
let DATA = [];

/*
  FALLBACK_POSTER: SVG minimale SENZA testo
*/
const FALLBACK_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="%23111111"/></svg>';

/* ------------------------
   Sanitizzazione titolo
   - rimuove estensioni file comuni alla fine
   - rimuove parentesi finali con anno (YYYY)
   - trim finale
   ------------------------ */
function sanitizeTitle(t){
  if(!t) return t || "";
  let s = String(t).trim();

  // 1) rimuovi extension stando alla fine (es: "Film (2006).mp4" -> removes .mp4)
  s = s.replace(/\s*[\.\-_\s]*\.(mp4|mkv|avi|mov|wmv|flv|mpg|mpeg|mp3|txt|iso)\s*$/i, '');

  // 2) rimuovi extension anche se scritta senza dot (es: "Title mp4" molto raro)
  s = s.replace(/\s+(mp4|mkv|avi|mov|wmv|flv|mpg|mpeg|mp3|txt|iso)\s*$/i, '');

  // 3) rimuovi parentesi finali con anno: " (2006)" oppure "(2006)"
  s = s.replace(/\s*\(\s*\d{4}\s*\)\s*$/i, '');

  // 4) rimuovi eventuali doppi spazi / punteggi finali residui
  s = s.replace(/[\s\.\-_,;:]+$/,'').trim();

  return s;
}

/* ------------------------
   Normalizzazione item
   mappa alias e usa sanitizeTitle per il titolo
   ------------------------ */
function normalizeItem(it){
  if(it.poster && !it.locandina) it.locandina = it.poster;
  if(it.poster_path && !it.locandina) it.locandina = it.poster_path;
  if(it.type && !it.tipo) it.tipo = it.type;
  if(it.title && !it.titolo) it.titolo = it.title;
  if(it.description && !it.trama) it.trama = it.description;
  if(it.summary && !it.trama) it.trama = it.summary;
  if(it.year && !it.anno) it.anno = it.year;
  if(it.vote_average !== undefined && (it.rating === undefined || it.rating === null)) it.rating = it.vote_average;
  if(it.rating === undefined || it.rating === null) it.rating = 0;

  // defaults e pulizia
  it.id = it.id || `auto-${Math.random().toString(36).slice(2,9)}`;
  it.tipo = it.tipo || (it.stagioni ? "serie" : "film");

  // sanitizza il titolo: rimuove .mp4 e "(anno)" finali
  const rawTitle = it.titolo || it.title || "";
  it.titolo = sanitizeTitle(rawTitle) || "Sconosciuto";

  it.locandina = it.locandina || "";
  it.trama = it.trama || "";
  it.generi = Array.isArray(it.generi) ? it.generi : (it.generi ? [it.generi] : []);
  it.anno = (it.anno !== undefined && it.anno !== null) ? String(it.anno) : "";
  it.telegram_code = it.telegram_code || it.code || "";
  it.rating = Number(it.rating) || 0;

  // categoria: cineteca se film e anno <= 1999
  if(it.tipo === "film" && it.anno){
    const y = parseInt(it.anno.slice(0,4)) || 0;
    it.categoria = (y > 0 && y <= 1999) ? "cineteca" : "film2000";
  } else {
    it.categoria = (it.generi && it.generi.includes("Animazione")) ? "animazione" : "";
  }

  return it;
}

function uniq(arr){ return Array.from(new Set(arr.filter(x=>x))); }

fetch('database.json')
  .then(r => {
    if(!r.ok) throw new Error("database.json non trovato nella stessa cartella");
    return r.json();
  })
  .then(db => {
    let raw = [];
    if(Array.isArray(db)) raw = db;
    else if(typeof db === 'object' && db !== null) raw = Object.values(db);
    else raw = [];

    DATA = raw.map(normalizeItem);

    // ordina per data_inserimento se presente (altrimenti mantiene)
    DATA.sort((a,b) => {
      const da = (a.data_inserimento || a.data || "") + "";
      const dbt = (b.data_inserimento || b.data || "") + "";
      return dbt.localeCompare(da);
    });

    buildFilters();
    injectLatestFilterControl(); // aggiunge select per ultimi inserimenti
    resetSectionIndices();
    renderAllSections();
    attachLoadMoreButtons();
    attachSearch();
    attachTabs();
  })
  .catch(err => {
    console.error(err);
    document.querySelector('main').innerHTML = `<p style="color:#f66; padding:20px">Errore: ${err.message}</p>`;
  });

function resetSectionIndices(){ Object.keys(sectionIndex).forEach(k=>sectionIndex[k]=0); }

function renderAllSections(){
  ['latest','movies','cineteca','series','animation'].forEach(s => {
    const g = document.getElementById(s); if(g) g.innerHTML = '';
    sectionIndex[s] = 0;
  });
  renderSection('latest', getLatestItemsFiltered());
  renderSection('movies', DATA.filter(x => x.tipo === 'film' && x.categoria !== 'cineteca'));
  renderSection('cineteca', DATA.filter(x => x.tipo === 'film' && x.categoria === 'cineteca'));
  renderSection('series', DATA.filter(x => x.tipo === 'serie'));
  renderSection('animation', DATA.filter(x => (x.categoria==='animazione') || (x.generi && x.generi.includes('Animazione'))));
}

// helper che restituisce gli ultimi inserimenti applicando filtro film/serie se impostato
function getLatestItemsFiltered(){
  const sel = document.getElementById('latestTypeFilter');
  let items = DATA.slice(); // copia
  // considera "ultimi" come l'ordine già presente (DATA è ordinato per data_inserimento decrescente)
  if(sel){
    const v = sel.value;
    if(v === 'film') items = items.filter(x => x.tipo === 'film');
    else if(v === 'serie') items = items.filter(x => x.tipo === 'serie');
  }
  return items;
}

// costruiamo la card usando DOM per evitare residui di stringhe
function renderSection(section, items){
  const grid = document.getElementById(section);
  if(!grid) return;
  const start = sectionIndex[section] || 0;
  const end = start + LOAD_COUNT;
  const batch = items.slice(start, end);
  sectionIndex[section] = end;

  batch.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';

    // wrapper per immagine (posizione relativo per badge)
    const imgWrap = document.createElement('div');
    imgWrap.style.position = 'relative';

    const imgEl = document.createElement('img');
    imgEl.loading = 'lazy';
    imgEl.alt = item.titolo || '';
    imgEl.src = item.locandina || FALLBACK_POSTER;
    // onerror sicuro
    imgEl.addEventListener('error', () => {
      imgEl.src = FALLBACK_POSTER;
    });

    imgWrap.appendChild(imgEl);

    // badge rating
    if(item.rating && Number(item.rating) > 0){
      const badge = document.createElement('div');
      badge.className = 'rating-badge';
      badge.textContent = Number(item.rating).toFixed(1);
      imgWrap.appendChild(badge);
    }

    // info block
    const info = document.createElement('div');
    info.className = 'info';

    const strong = document.createElement('strong');
    strong.textContent = item.titolo;
    info.appendChild(strong);

    // meta (anno · generi · rating breve)
    const metaParts = [];
    if(item.anno) metaParts.push(item.anno);
    if(item.generi && item.generi.length) metaParts.push((item.generi||[]).slice(0,2).join(', '));
    if(item.rating && Number(item.rating) > 0) metaParts.push(Number(item.rating).toFixed(1));
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = metaParts.join(' · ');
    info.appendChild(meta);

    // trama (plot)
    const plot = document.createElement('div');
    plot.className = 'plot';
    plot.id = `plot-${item.id}`;
    plot.textContent = item.trama || '';
    info.appendChild(plot);

    card.appendChild(imgWrap);
    card.appendChild(info);

    // click apre modal
    card.addEventListener('click', () => openModal(item));
    grid.appendChild(card);
  });

  if(items.length === 0 && start === 0){
    const msg = document.createElement('div');
    msg.style.color = '#bbb';
    msg.style.padding = '8px';
    msg.textContent = 'Nessun elemento in questa sezione';
    grid.appendChild(msg);
  }
}

// MODAL
const modal = document.getElementById('detailModal');
const modalClose = document.getElementById('modalClose');
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

function openModal(item){
  document.getElementById('modalPoster').src = item.locandina || FALLBACK_POSTER;
  document.getElementById('modalTitle').textContent = item.titolo;
  const meta = `${item.anno ? item.anno + " · " : ""}${(item.generi || []).join(", ")}${item.rating ? " · " + Number(item.rating).toFixed(1) : ""}`;
  document.getElementById('modalMeta').textContent = meta;
  document.getElementById('modalPlot').textContent = item.trama || "";

  const episodesDiv = document.getElementById('modalEpisodes');
  episodesDiv.innerHTML = "";

  // seasonTabs: creiamo nuovo elemento sempre (evitiamo residui)
  const existingTabs = document.getElementById('seasonTabs');
  if(existingTabs) existingTabs.remove();

  const seasonTabs = document.createElement('div');
  seasonTabs.id = 'seasonTabs';
  seasonTabs.style.display = 'flex';
  seasonTabs.style.gap = '8px';
  seasonTabs.style.flexWrap = 'wrap';
  seasonTabs.style.margin = '8px 0';
  document.getElementById('modalPlot').after(seasonTabs);

  if(item.tipo === 'serie' && item.stagioni){
    const seasonKeys = Object.keys(item.stagioni).sort();
    seasonKeys.forEach((sk) => {
      // create tab button
      const tab = document.createElement('button');
      tab.className = 'season-tab';
      tab.textContent = `Stagione ${sk}`;
      tab.dataset.season = sk;
      tab.addEventListener('click', () => {
        const panel = document.getElementById(`season-panel-${sk}`);
        if(panel){
          const epsList = panel.querySelector('.season-episodes');
          if(epsList) epsList.style.display = 'block';
          panel.scrollIntoView({behavior:'smooth', block:'center'});
        }
      });
      seasonTabs.appendChild(tab);

      // create collapsible panel
      const panel = document.createElement('div');
      panel.className = 'season-panel';
      panel.id = `season-panel-${sk}`;
      panel.style.marginTop = '12px';
      const header = document.createElement('div');
      header.className = 'season-header';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.cursor = 'pointer';
      header.style.padding = '8px';
      header.style.background = '#0b0b0b';
      header.style.borderRadius = '6px';
      header.innerHTML = `<strong>Stagione ${sk}</strong><span style="color:#bbb">${(item.stagioni[sk].episodi||[]).length} episodi</span>`;

      const epsList = document.createElement('div');
      epsList.className = 'season-episodes';
      epsList.style.display = 'none';
      epsList.style.marginTop = '8px';

      (item.stagioni[sk].episodi || []).forEach(ep => {
        const eDiv = document.createElement('div'); eDiv.className = 'episode';
        const left = document.createElement('div'); left.className = 'ep-left';
        const titleEp = ep.titolo_episodio || ep.titolo || '';
        left.innerHTML = `<strong>${escapeHtml(titleEp)}</strong><div style="color:#bbb;font-size:13px">Episodio ${escapeHtml(ep.episodio || "")}</div>`;
        const right = document.createElement('div'); right.className = 'ep-right';
        const code = ep.telegram_code || ep.telegram || "";
        const a = document.createElement('a');
        if(code){
          a.href = makeTelegramLink(code);
          a.textContent = "Apri";
          a.target = "_blank"; a.rel="noopener";
        } else {
          a.href = "javascript:void(0)";
          a.textContent = "Nessun codice";
          a.style.opacity = '0.6';
        }
        right.appendChild(a);
        eDiv.appendChild(left); eDiv.appendChild(right);
        epsList.appendChild(eDiv);
      });

      header.addEventListener('click', () => {
        epsList.style.display = epsList.style.display === 'block' ? 'none' : 'block';
      });

      panel.appendChild(header);
      panel.appendChild(epsList);
      episodesDiv.appendChild(panel);
    });

    document.getElementById('modalTelegram').style.display = 'none';
  } else {
    // film
    const tgBtn = document.getElementById('modalTelegram');
    const mainCode = item.telegram_code || "";
    if(mainCode){
      tgBtn.href = makeTelegramLink(mainCode);
      tgBtn.textContent = "Apri su Telegram";
      tgBtn.style.display = 'inline-block';
    } else {
      tgBtn.style.display = 'none';
    }
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.querySelector('.modal-content').scrollTop = 0;
}

function closeModal(){
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
}

// Load more buttons
function attachLoadMoreButtons(){
  document.querySelectorAll('.load-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if(section === 'latest') renderSection('latest', getLatestItemsFiltered());
      if(section === 'movies') renderSection('movies', DATA.filter(x => x.tipo === 'film' && x.categoria !== 'cineteca'));
      if(section === 'cineteca') renderSection('cineteca', DATA.filter(x => x.tipo === 'film' && x.categoria === 'cineteca'));
      if(section === 'series') renderSection('series', DATA.filter(x => x.tipo === 'serie'));
      if(section === 'animation') renderSection('animation', DATA.filter(x => (x.categoria==='animazione') || (x.generi && x.generi.includes('Animazione'))));
    });
  });
}

// FILTRI e RICERCA
function buildFilters(){
  const allGenres = [].concat(...DATA.map(d => d.generi || []));
  const genres = uniq(allGenres).sort();
  const genreSelect = document.getElementById('genreFilter');
  genres.forEach(g => { const o=document.createElement('option'); o.value=g; o.textContent=g; genreSelect.appendChild(o); });

  const years = uniq(DATA.map(d => d.anno)).filter(x=>x).sort((a,b)=> b - a);
  const yearSelect = document.getElementById('yearFilter');
  years.forEach(y => { const o = document.createElement('option'); o.value=y; o.textContent=y; yearSelect.appendChild(o); });

  genreSelect.addEventListener('change', applyFilters);
  yearSelect.addEventListener('change', applyFilters);
}

function applyFilters(){
  ['latest','movies','cineteca','series','animation'].forEach(s => { sectionIndex[s]=0; const g=document.getElementById(s); if(g) g.innerHTML=''; });

  const genre = document.getElementById('genreFilter').value;
  const year = document.getElementById('yearFilter').value;
  const q = document.getElementById('searchBox').value.trim().toLowerCase();

  const filtered = DATA.filter(it => {
    if(genre && !(it.generi || []).includes(genre)) return false;
    if(year && String(it.anno) !== String(year)) return false;
    if(q && !String(it.titolo || "").toLowerCase().includes(q) && !String(it.trama || "").toLowerCase().includes(q)) return false;
    return true;
  });

  renderSection('latest', filtered);
  renderSection('movies', filtered.filter(x=>x.tipo==='film' && x.categoria!=='cineteca'));
  renderSection('cineteca', filtered.filter(x=>x.tipo==='film' && x.categoria==='cineteca'));
  renderSection('series', filtered.filter(x=>x.tipo==='serie'));
  renderSection('animation', filtered.filter(x=> (x.categoria==='animazione') || (x.generi && x.generi.includes('Animazione'))));
}

function attachSearch(){
  const sb = document.getElementById('searchBox');
  sb.addEventListener('input', () => {
    if(window._filtsel_timeout) clearTimeout(window._filtsel_timeout);
    window._filtsel_timeout = setTimeout(()=> applyFilters(), 250);
  });
}

// TABS
function attachTabs(){
  document.querySelectorAll('.top-tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.top-tabs .tab').forEach(t=>t.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      if(view === 'all'){
        document.querySelector('main').scrollIntoView({behavior:'smooth'});
        showSection('section-latest'); showSection('section-movies'); showSection('section-cineteca'); showSection('section-series'); showSection('section-animation');
      } else if(view === 'films'){
        showSection('section-movies'); hideSection('section-latest'); hideSection('section-cineteca'); hideSection('section-series'); hideSection('section-animation');
        document.getElementById('section-movies').scrollIntoView({behavior:'smooth'});
      } else if(view === 'cineteca'){
        showSection('section-cineteca'); hideSection('section-latest'); hideSection('section-movies'); hideSection('section-series'); hideSection('section-animation');
        document.getElementById('section-cineteca').scrollIntoView({behavior:'smooth'});
      } else if(view === 'series'){
        showSection('section-series'); hideSection('section-latest'); hideSection('section-movies'); hideSection('section-cineteca'); hideSection('section-animation');
        document.getElementById('section-series').scrollIntoView({behavior:'smooth'});
      } else if(view === 'animation'){
        showSection('section-animation'); hideSection('section-latest'); hideSection('section-movies'); hideSection('section-cineteca'); hideSection('section-series');
        document.getElementById('section-animation').scrollIntoView({behavior:'smooth'});
      }
    });
  });
}
function showSection(id){ const el=document.getElementById(id); if(el) el.style.display='block'; }
function hideSection(id){ const el=document.getElementById(id); if(el) el.style.display='none'; }

// Inietta controllo per filtrare "Ultimi Inserimenti"
function injectLatestFilterControl(){
  const latestSection = document.getElementById('section-latest');
  if(!latestSection) return;
  // crea div controllo solo se non esistente
  if(document.getElementById('latestFilterWrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'latestFilterWrap';
  wrap.style.margin = '8px 0 12px';
  wrap.innerHTML = `<label style="color:#ccc;margin-right:8px">Mostra:</label>`;
  const sel = document.createElement('select');
  sel.id = 'latestTypeFilter';
  sel.innerHTML = `<option value="all">Tutti</option><option value="film">Film</option><option value="serie">Serie TV</option>`;
  sel.style.padding = '6px'; sel.style.borderRadius = '6px'; sel.style.background = '#101010'; sel.style.color = '#eee'; sel.style.border = '1px solid #222';
  sel.addEventListener('change', () => {
    // reset e reload latest
    sectionIndex.latest = 0;
    const grid = document.getElementById('latest'); if(grid) grid.innerHTML = '';
    renderSection('latest', getLatestItemsFiltered());
  });
  wrap.appendChild(sel);
  // inserisce subito dopo il titolo H2
  const h2 = latestSection.querySelector('h2');
  if(h2) h2.after(wrap); else latestSection.prepend(wrap);
}

// HELPERS
function escapeHtml(s){ if(!s) return ""; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
function makeTelegramLink(code){ if(!code) return "javascript:void(0)"; if(!BOT_USERNAME || BOT_USERNAME === "YOUR_BOT_USERNAME") return `https://t.me/${encodeURIComponent(code)}`; return `https://t.me/${encodeURIComponent(BOT_USERNAME)}?start=${encodeURIComponent(code)}`; }
