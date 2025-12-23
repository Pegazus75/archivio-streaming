(async function () {
  try {
    // aspettiamo che il database principale sia caricato
    function waitForData() {
      return new Promise(resolve => {
        const check = () => {
          if (window.DATA && Array.isArray(window.DATA) && window.DATA.length) {
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    }

    await waitForData();

    const TRENDING_URL =
      "https://raw.githubusercontent.com/Pegazus75/archivio-streaming/main/trending-history.json";

    const r = await fetch(TRENDING_URL, { cache: "no-store" });
    if (!r.ok) return;

    const history = await r.json();
    const days = Object.keys(history).sort().reverse();
    if (!days.length) return;

    const titles = history[days[0]];

    const matched = titles
      .map(t =>
        window.DATA.find(
          d => d.titolo.toLowerCase() === t.toLowerCase()
        )
      )
      .filter(Boolean)
      .slice(0, 16);

    if (!matched.length) return;

    // --- CREIAMO LA SEZIONE ---
    const rows = document.getElementById("rowsContainer");
    if (!rows) return;

    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<h3>🔥 Titoli del momento</h3>`;

    const carousel = document.createElement("div");
    carousel.className = "carousel";

    const left = document.createElement("div");
    left.className = "carousel-nav carousel-left";
    left.innerHTML = `<button>‹</button>`;

    const right = document.createElement("div");
    right.className = "carousel-nav carousel-right";
    right.innerHTML = `<button>›</button>`;

    const track = document.createElement("div");
    track.className = "carousel-track";

    matched.forEach(it => track.appendChild(window.makeCard(it)));

    left.querySelector("button").onclick = () =>
      track.scrollBy({ left: -400, behavior: "smooth" });
    right.querySelector("button").onclick = () =>
      track.scrollBy({ left: 400, behavior: "smooth" });

    carousel.append(left, track, right);
    row.appendChild(carousel);

    // la inseriamo PRIMA di "Ultimi inserimenti"
    rows.prepend(row);

  } catch (e) {
    console.warn("Trending disabilitato:", e);
  }
})();
