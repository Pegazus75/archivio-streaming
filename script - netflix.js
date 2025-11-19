// CONFIG
const BOT_USERNAME = "pega_movies_and_series_bot"; // sostituisci se vuoi
const HERO_COUNT = 6;
const ROW_LOAD = 18;
const CAT_BATCH = 24;
const CAROUSEL_STEP = 400;
const FALLBACK_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="%23111111"/></svg>';

// helper
function sanitizeTitle(t){ if(!t) return ""; let s=String(t).trim(); s=s.replace(/\s*[\.\-_\s]*\.(mp4|mkv|avi|mov|wmv|flv|mpg|mpeg|mp3|txt|iso)\s*$/i,''); s=s.replace(/\s+(mp4|mkv|avi|mov|wmv|flv|mpg|mpeg|mp3|txt|iso)\s*$/i,''); s=s.replace(/\s*\(\s*\d{4}\s*\)\s*$/i,''); s=s.replace(/[\s\.\-_,;:]+$/,'').trim(); return s; }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
function escapeUrl(u){ try{return encodeURI(u);}catch(e){return u||FALLBACK_POSTER;} }
function makeTelegramLink(code){ if(!code) return 'javascript:void(0)'; if(!BOT_USERNAME || BOT_USERNAME==='YOUR_BOT_USERNAME') return `https://t.me/${encodeURIComponent(code)}`; return `https://t.me/${encodeURIComponent(BOT_USERNAME)}?start=${encodeURIComponent(code)}`; }
function uniq(arr){ return Array.from(new Set((arr||[]).filter(x=>x))); }

// normalize item
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

  it.id = it.id || `auto-${Math.random().toString(36).slice(2,9)}`;
  it.tipo = it.tipo || (it.stagioni ? "serie" : "film");
  const rawTitle = it.titolo || it.title || "";
  it.titolo = sanitizeTitle(rawTitle) || "Sconosciuto";
  it.locandina = it.locandina || "";
  it.trama = it.trama || "";
  it.generi = Array.isArray(it.generi) ? it.generi : (it.generi ? [it.generi] : []);
  it.anno = (it.anno !== undefined && it.anno !== null) ? String(it.anno) : "";
  it.telegram_code = it.telegram_code || it.code || "";
  it.rating = Number(it.rating) || 0;

  const joinedGenres = (it.generi||[]).join(' ').toLowerCase();
  const isAnimation = joinedGenres.includes('anime') || joinedGenres.includes('animation') || joinedGenres.includes('animazione');
  if(it.tipo === "film" && it.anno){
    const y = parseInt(it.anno.slice(0,4)) || 0;
    it.categoria = (y > 0 && y <= 1999) ? "cineteca" : "film2000";
  } else {
    it.categoria = "";
  }
  if(isAnimation) it.categoria = 'animazione';
  return it;
}

/* ---------- fetch DB ---------- */
let DATA = [];
let CURRENT_FILTERED = null;
let categoryState = {}; 

async function loadDatabase(){
  try{
    const r = await fetch('database.json', {cache:"no-store"});
    if(!r.ok) throw new Error(`Fetch fallito ${r.status}`);
    const db = await r.json();
    const raw = Array.isArray(db) ? db : (typeof db === 'object' && db !== null ? Object.values(db) : []);
    DATA = raw.map(normalizeItem);
    DATA.sort((a,b) => ((b.data_inserimento||b.data||"")+"").localeCompare((a.data_inserimento||a.data||"")+""));
    initUI();
  } catch(err){
    console.error('Errore caricamento database.json', err);
    DATA = [];
    initUI();
  }
}

/* ---------- UI / Routing ---------- */
const ROW_CONFIG = [
  {id:'latest', title:'Ultimi inserimenti', items: (f)=> (f||DATA)},
  {id:'pop', title:'Consigliati', items: (f)=> (f||DATA).filter(x=>x.rating>6)},
  {id:'films', title:'Film (2000+)', items: (f)=> (f||DATA).filter(x=> x.tipo==='film' && x.categoria!=='cineteca')},
  {id:'series', title:'Serie TV', items: (f)=> (f||DATA).filter(x=> x.tipo==='serie')},
  {id:'cineteca', title:'Cineteca (≤1999)', items: (f)=> (f||DATA).filter(x=> x.tipo==='film' && x.categoria==='cineteca')},
  {id:'animation', title:'Animazione', items: (f)=> (f||DATA).filter(x => x.categoria==='animazione' || (x.generi||[]).join(' ').toLowerCase().includes('anime'))}
];

function initUI(){
  buildHero();
  buildRows();
  buildFilters();
  attachSearch();
  attachTabClicks();
  setupHeroAuto();
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

/* HERO */
function buildHero(){
  const heroEl = document.getElementById('hero-slider');
  if(!heroEl) return;
  heroEl.innerHTML = '';
  const candidates = DATA.filter(d=>d.locandina).slice(0, HERO_COUNT);
  if(candidates.length === 0){
    heroEl.innerHTML = `<div class="hero-card" style="display:flex;align-items:center;justify-content:center;background:#070707;color:#888"><div style="max-width:900px;padding:20px;text-align:center"><h2>Nessun contenuto disponibile</h2></div></div>`;
    return;
  }
  candidates.forEach(it => {
    const card = document.createElement('div'); card.className = 'hero-card';
    card.style.backgroundImage = `linear-gradient(180deg, rgba(6,6,6,0.0) 0%, rgba(6,6,6,0.85) 60%), url('${escapeUrl(it.locandina)}')`;
    card.style.backgroundPosition = 'center 45%'; // leggermente più basso
    const info = document.createElement('div'); info.className = 'hero-info';
    info.innerHTML = `<h2>${escapeHtml(it.titolo)}</h2><p>${escapeHtml((it.trama||'').slice(0,280))}</p>`;
    const openBtn = document.createElement('a'); openBtn.className='btn'; openBtn.textContent='Apri';
    if(it.telegram_code) openBtn.href = makeTelegramLink(it.telegram_code); else openBtn.href='javascript:void(0)';
    openBtn.target='_blank'; openBtn.rel='noopener';
    info.appendChild(openBtn);
    card.appendChild(info);
    card.addEventListener('click', ()=> openModal(it));
    heroEl.appendChild(card);
  });
}
let heroIndex=0, heroTimer=null;
function shiftHero(dir){ const slider=document.getElementById('hero-slider'); if(!slider||slider.children.length===0) return; const count=slider.children.length; heroIndex=(heroIndex+dir+count)%count; slider.style.transform=`translateX(-${heroIndex*100}%)`; }
function setupHeroAuto(){ if(heroTimer) clearInterval(heroTimer); heroTimer=setInterval(()=> shiftHero(1),6000); document.getElementById('hero')?.addEventListener('mouseenter', ()=> clearInterval(heroTimer)); document.getElementById('hero')?.addEventListener('mouseleave', ()=> setupHeroAuto()); }

/* Home rows (orizzontali) */
function buildRows(){
  const container = document.getElementById('rowsContainer');
  if(!container) return;
  container.innerHTML = '';
  ROW_CONFIG.forEach(cfg => {
    const row = document.createElement('div'); row.className='row'; row.id = `row-${cfg.id}`;
    row.innerHTML = `<h3>${cfg.title}</h3>`;
    const carousel = document.createElement('div'); carousel.className='carousel';
    const leftNavWrap = document.createElement('div'); leftNavWrap.className='carousel-nav carousel-left';
    const leftBtn = document.createElement('button'); leftBtn.textContent = '‹'; leftNavWrap.appendChild(leftBtn);
    const rightNavWrap = document.createElement('div'); rightNavWrap.className='carousel-nav carousel-right';
    const rightBtn = document.createElement('button'); rightBtn.textContent = '›'; rightNavWrap.appendChild(rightBtn);
    const track = document.createElement('div'); track.className='carousel-track';
    const items = cfg.items();
    if(items.length === 0) track.innerHTML = `<div style="color:#bbb;padding:8px">Nessun elemento</div>`;
    else items.slice(0, ROW_LOAD).forEach(it => track.appendChild(makeCard(it)));
    leftBtn.addEventListener('click', ()=> track.scrollBy({left:-CAROUSEL_STEP, behavior:'smooth'}));
    rightBtn.addEventListener('click', ()=> track.scrollBy({left:CAROUSEL_STEP, behavior:'smooth'}));
    carousel.appendChild(leftNavWrap); carousel.appendChild(track); carousel.appendChild(rightNavWrap);
    row.appendChild(carousel);
    container.appendChild(row);
  });
  document.getElementById('hero-prev')?.addEventListener('click', ()=> shiftHero(-1));
  document.getElementById('hero-next')?.addEventListener('click', ()=> shiftHero(1));
}

/* ---------- Category page (griglia compatta) ---------- */
function renderCategoryPage(catId){
  const app = document.getElementById('main-content');
  app.innerHTML = `
    <section class="section category-page" id="category-${catId}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h2>${ROW_CONFIG.find(r=>r.id===catId)?.title || 'Sezione'}</h2>
        <div class="controls-inline">
          <select id="catTypeFilter" style="display:none"><option value="all">Tutti</option><option value="film">Film</option><option value="serie">Serie</option></select>
          <select id="catGenreFilter"><option value="">Tutti i generi</option></select>
          <select id="catYearFilter"><option value="">Tutti gli anni</option></select>
          <input id="catSearchBox" placeholder="Cerca..." style="padding:8px;border-radius:6px;background:#0f0f10;color:#eee;border:1px solid #222">
        </div>
      </div>
      <div id="catGrid" class="grid category-grid"></div>
      <div style="text-align:center;margin-top:14px;"><button id="catLoadMore" class="load-more">Carica altri</button></div>
    </section>
  `;
  const allGenres = uniq([].concat(...DATA.map(d=>d.generi||[]))).sort();
  const genreSel = document.getElementById('catGenreFilter');
  allGenres.forEach(g=>{ const o=document.createElement('option'); o.value=g; o.textContent=g; genreSel.appendChild(o); });
  const years = uniq(DATA.map(d=>d.anno)).filter(x=>x).sort((a,b)=> b - a);
  const yearSel = document.getElementById('catYearFilter');
  years.forEach(y=>{ const o=document.createElement('option'); o.value=y; o.textContent=y; yearSel.appendChild(o); });

  const typeFilter = document.getElementById('catTypeFilter');
  if(catId === 'animation' || catId === 'latest'){ typeFilter.style.display = 'inline-block'; } else { typeFilter.style.display = 'none'; }

  const cfg = ROW_CONFIG.find(r=>r.id===catId);
  const itemsAll = cfg ? cfg.items() : [];
  CURRENT_FILTERED = itemsAll;
  categoryState[catId] = 0;

  document.getElementById('catTypeFilter').addEventListener('change', ()=> applyCatFilters(catId));
  genreSel.addEventListener('change', ()=> applyCatFilters(catId));
  yearSel.addEventListener('change', ()=> applyCatFilters(catId));
  document.getElementById('catSearchBox').addEventListener('input', ()=> { if(window._deb) clearTimeout(window._deb); window._deb = setTimeout(()=> applyCatFilters(catId), 250); });
  document.getElementById('catLoadMore').addEventListener('click', ()=> { categoryState[catId] = (categoryState[catId] || 0) + CAT_BATCH; renderCatBatch(catId); });

  applyCatFilters(catId);
}

function applyCatFilters(catId){
  const type = document.getElementById('catTypeFilter')?.value || 'all';
  const genre = document.getElementById('catGenreFilter')?.value || '';
  const year = document.getElementById('catYearFilter')?.value || '';
  const q = (document.getElementById('catSearchBox')?.value || '').trim().toLowerCase();

  const cfg = ROW_CONFIG.find(r=>r.id===catId);
  const baseItems = cfg ? cfg.items() : [];
  let filtered = baseItems.filter(it => {
    if(type === 'film' && it.tipo !== 'film') return false;
    if(type === 'serie' && it.tipo !== 'serie') return false;
    if(genre){
      const lg = genre.toLowerCase();
      if(['anime','animation','animazione'].includes(lg)){
        const joined = (it.generi||[]).join(' ').toLowerCase();
        if(!(joined.includes('anime') || joined.includes('anim') || it.categoria === 'animazione')) return false;
      } else {
        if(!((it.generi||[]).map(g=>g.toLowerCase()).includes(lg))) return false;
      }
    }
    if(year && String(it.anno) !== String(year)) return false;
    if(q && !String(it.titolo||'').toLowerCase().includes(q) && !String(it.trama||'').toLowerCase().includes(q)) return false;
    return true;
  });

  CURRENT_FILTERED = filtered;
  categoryState[catId] = 0;
  const grid = document.getElementById('catGrid');
  if(!grid) return;
  grid.innerHTML = '';
  renderCatBatch(catId);
}

function renderCatBatch(catId){
  const grid = document.getElementById('catGrid');
  if(!grid) return;
  const offset = categoryState[catId] || 0;
  const batch = (CURRENT_FILTERED || []).slice(offset, offset + CAT_BATCH);
  if(batch.length === 0 && offset === 0){
    grid.innerHTML = '<div style="color:#bbb;padding:16px">Nessun elemento</div>';
    return;
  }
  batch.forEach(it => {
    const card = document.createElement('div'); card.className='card cat-card';
    card.style.cursor='pointer';
    const img = document.createElement('img'); img.loading='lazy'; img.src = it.locandina || FALLBACK_POSTER; img.alt = it.titolo || '';
    img.addEventListener('error', ()=> img.src = FALLBACK_POSTER);
    const info = document.createElement('div'); info.className='info';
    const strong = document.createElement('strong'); strong.textContent = it.titolo;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${it.anno ? it.anno + ' · ' : ''}${(it.generi||[]).slice(0,3).join(', ')}${it.rating ? ' · ' + Number(it.rating).toFixed(1) : ''}`;
    const plot = document.createElement('div'); plot.className='plot'; plot.textContent = it.trama || '';
    info.appendChild(strong); info.appendChild(meta); info.appendChild(plot);
    card.appendChild(img); card.appendChild(info);
    card.addEventListener('click', ()=> openModal(it));
    grid.appendChild(card);
  });

  const loadBtn = document.getElementById('catLoadMore');
  const total = (CURRENT_FILTERED || []).length;
  if(offset + CAT_BATCH >= total) loadBtn.style.display = 'none'; else loadBtn.style.display = 'inline-block';
}

/* make card for home */
function makeCard(item){
  const card = document.createElement('div'); card.className='card';
  const imgWrap = document.createElement('div'); imgWrap.style.position='relative';
  const img = document.createElement('img'); img.loading='lazy'; img.alt = item.titolo || ''; img.src = item.locandina || FALLBACK_POSTER;
  img.addEventListener('error', ()=> img.src = FALLBACK_POSTER);
  imgWrap.appendChild(img);
  if(item.rating && Number(item.rating)>0){
    const b = document.createElement('div'); b.className='rating-badge'; b.textContent = Number(item.rating).toFixed(1); imgWrap.appendChild(b);
  }
  const info = document.createElement('div'); info.className='info';
  const st = document.createElement('strong'); st.textContent = item.titolo; info.appendChild(st);
  const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${item.anno ? item.anno + ' · ' : ''}${(item.generi||[]).slice(0,2).join(', ')}${item.rating ? ' · ' + Number(item.rating).toFixed(1) : ''}`; info.appendChild(meta);
  const plot = document.createElement('div'); plot.className='plot'; plot.textContent = item.trama || ''; info.appendChild(plot);
  card.appendChild(imgWrap); card.appendChild(info);
  card.addEventListener('click', ()=> openModal(item));
  return card;
}

/* modal */
const modal = document.getElementById('detailModal');
document.getElementById('modalClose')?.addEventListener('click', ()=> { closeModal(); });
modal?.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });

function openModal(item){
  try{
    document.getElementById('modalPoster').src = item.locandina || FALLBACK_POSTER;
    document.getElementById('modalTitle').textContent = item.titolo;
    const meta = `${item.anno ? item.anno + " · " : ""}${(item.generi || []).join(", ")}${item.rating ? " · " + Number(item.rating).toFixed(1) : ""}`;
    document.getElementById('modalMeta').textContent = meta;
    document.getElementById('modalPlot').textContent = item.trama || "";

    const epDiv = document.getElementById('modalEpisodes'); if(epDiv) epDiv.innerHTML = '';
    const existingTabs = document.getElementById('seasonTabs'); if(existingTabs) existingTabs.remove();
    const seasonTabs = document.createElement('div'); seasonTabs.id='seasonTabs'; seasonTabs.style.display='flex'; seasonTabs.style.gap='8px'; seasonTabs.style.flexWrap='wrap'; seasonTabs.style.margin='8px 0';
    document.getElementById('modalPlot')?.after(seasonTabs);

    if(item.tipo === 'serie' && item.stagioni){
      const seasonKeys = Object.keys(item.stagioni).sort();
      seasonKeys.forEach(sk => {
        const tab = document.createElement('button'); tab.className='season-tab'; tab.textContent = `Stagione ${sk}`; tab.addEventListener('click', ()=>{
          const panel = document.getElementById(`season-panel-${sk}`); if(panel){ const eps = panel.querySelector('.season-episodes'); if(eps) eps.style.display='block'; panel.scrollIntoView({behavior:'smooth', block:'center'}); }
        });
        seasonTabs.appendChild(tab);

        const panel = document.createElement('div'); panel.className='season-panel'; panel.id=`season-panel-${sk}`; panel.style.marginTop='12px';
        const header = document.createElement('div'); header.className='season-header'; header.style.padding='8px'; header.style.background='#0b0b0b'; header.style.borderRadius='6px'; header.style.display='flex'; header.style.justifyContent='space-between'; header.style.cursor='pointer';
        header.innerHTML = `<strong>Stagione ${sk}</strong><span style="color:#bbb">${(item.stagioni[sk].episodi||[]).length} episodi</span>`;
        const epsList = document.createElement('div'); epsList.className='season-episodes'; epsList.style.display='none'; epsList.style.marginTop='8px';
        (item.stagioni[sk].episodi||[]).forEach(ep => {
          const eDiv = document.createElement('div'); eDiv.className='episode';
          const left = document.createElement('div'); left.className='ep-left'; left.innerHTML = `<strong>${escapeHtml(ep.titolo_episodio || ep.titolo || '')}</strong><div style="color:#bbb;font-size:13px">Episodio ${escapeHtml(ep.episodio || '')}</div>`;
          const right = document.createElement('div'); right.className='ep-right'; const a = document.createElement('a'); const code = ep.telegram_code || ep.telegram || '';
          if(code){ a.href = makeTelegramLink(code); a.textContent='Apri'; a.target='_blank'; a.rel='noopener'; } else { a.href='javascript:void(0)'; a.textContent='Nessun codice'; a.style.opacity='0.6'; }
          right.appendChild(a); eDiv.appendChild(left); eDiv.appendChild(right); epsList.appendChild(eDiv);
        });
        header.addEventListener('click', ()=> { epsList.style.display = epsList.style.display === 'block' ? 'none' : 'block'; } );
        panel.appendChild(header); panel.appendChild(epsList); epDiv.appendChild(panel);
      });
      document.getElementById('modalTelegram').style.display='none';
    } else {
      const tbtn = document.getElementById('modalTelegram'); const code = item.telegram_code || '';
      if(code){ tbtn.href = makeTelegramLink(code); tbtn.textContent='Apri su Telegram'; tbtn.style.display='inline-block'; } else { tbtn.style.display = 'none'; }
    }

    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.querySelector('.modal-content')?.scrollTo(0,0);
  }catch(e){ console.error('openModal error', e, item); }
}
function closeModal(){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }

/* filters home */
function buildFilters(){
  const allGenres = uniq([].concat(...DATA.map(d=>d.generi||[]))).sort((a,b)=>a.localeCompare(b));
  const genreSelect = document.getElementById('genreFilter');
  if(genreSelect){
    genreSelect.innerHTML = `<option value="">Tutti i generi</option>`;
    ['Anime','Animation','Animazione'].forEach(s => { const o=document.createElement('option'); o.value=s; o.textContent=s; genreSelect.appendChild(o); });
    allGenres.forEach(g => { const o=document.createElement('option'); o.value=g; o.textContent=g; genreSelect.appendChild(o); });
    genreSelect.addEventListener('change', applyAllFilters);
  }
  const yearSelect = document.getElementById('yearFilter');
  if(yearSelect){
    const years = uniq(DATA.map(d=>d.anno)).filter(x=>x).sort((a,b)=>b-a);
    yearSelect.innerHTML = `<option value="">Tutti gli anni</option>`;
    years.forEach(y => { const o=document.createElement('option'); o.value=y; o.textContent=y; yearSelect.appendChild(o); });
    yearSelect.addEventListener('change', applyAllFilters);
  }
}
function attachSearch(){ const sb=document.getElementById('searchBox'); if(sb) sb.addEventListener('input', ()=> { if(window._deb) clearTimeout(window._deb); window._deb = setTimeout(applyAllFilters, 250); }); }

function applyAllFilters(){
  const genre = document.getElementById('genreFilter')?.value || '';
  const year = document.getElementById('yearFilter')?.value || '';
  const q = (document.getElementById('searchBox')?.value || '').trim().toLowerCase();
  ROW_CONFIG.forEach(cfg => {
    const row = document.getElementById(`row-${cfg.id}`);
    if(!row) return;
    const track = row.querySelector('.carousel-track');
    if(!track) return;
    track.innerHTML = '';
    const items = cfg.items();
    const filtered = items.filter(it => {
      if(genre){
        const lg = genre.toLowerCase();
        if(['anime','animation','animazione'].includes(lg)){
          const joined = (it.generi||[]).join(' ').toLowerCase();
          if(!(joined.includes('anime') || joined.includes('anim') || it.categoria === 'animazione')) return false;
        } else {
          if(!((it.generi||[]).map(g=>g.toLowerCase()).includes(lg))) return false;
        }
      }
      if(year && String(it.anno) !== String(year)) return false;
      if(q && !String(it.titolo||'').toLowerCase().includes(q) && !String(it.trama||'').toLowerCase().includes(q)) return false;
      return true;
    });
    filtered.slice(0, ROW_LOAD).forEach(it => track.appendChild(makeCard(it)));
  });
}

/* tabs -> hash (corretta) */
function attachTabClicks(){
  document.querySelectorAll('.top-tabs .tab').forEach(btn=>{
    btn.addEventListener('click', ()=> { 
      const view = btn.dataset.view;
      if (view === 'all' || view === 'home') {
        location.hash = '#/';          // HOME
        return;
      }
      location.hash = `#/category/${view}`;
    });
  });
}

/* routing */
function handleHashChange(){
  const hash = location.hash || '#/';
  if(hash === '#/' || hash === '' || hash === '#/home' || hash === '#/all'){
    document.getElementById('main-content').innerHTML = `
      <section id="hero" class="hero"><div id="hero-slider" class="hero-slider"></div><button id="hero-prev" class="hero-nav">‹</button><button id="hero-next" class="hero-nav">›</button></section>
      <section class="rows" id="rowsContainer"></section>
    `;
    buildHero(); buildRows(); setupHeroAuto();
    document.querySelectorAll('.top-tabs .tab').forEach(t=> t.classList.toggle('active', (t.dataset.view==='all')));
    return;
  }
  const match = hash.match(/^#\/category\/([a-zA-Z0-9_-]+)(?:\?(.+))?/);
  if(match){
    const catId = match[1];
    document.querySelectorAll('.top-tabs .tab').forEach(t=> t.classList.toggle('active', (t.dataset.view===catId)));
    renderCategoryPage(catId);
    return;
  }
  location.hash = '#/';
}

/* start */
loadDatabase();
