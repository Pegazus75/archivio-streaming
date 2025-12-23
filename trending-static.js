console.log("TRENDING STATIC JS CARICATO");

document.addEventListener("DOMContentLoaded", () => {
  const s = document.getElementById("trending-static");
  if (!s) return;

  s.style.display = "block";

  const t = s.querySelector(".carousel-track");
  t.innerHTML = `
    <div class="card"><div class="info"><strong>TEST A</strong></div></div>
    <div class="card"><div class="info"><strong>TEST B</strong></div></div>
  `;
});
