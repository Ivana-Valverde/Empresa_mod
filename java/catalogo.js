(async () => {
  const grid = document.getElementById("courses-grid");
  const counter = document.getElementById("course-count");
  if (!grid) return;

  const esc = t => String(t ?? "").replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Solo se aceptan imágenes locales o de nuestro Storage
  const safeImg = url =>
    url && (url.startsWith("img/") || url.startsWith("https://")) ? url : "img/general.png";

  const { data, error } = await db
    .from("courses")
    .select("id, slug, titulo, descripcion, categoria, precio, imagen, duracion, nivel, modules(count)")
    .eq("publicado", true)
    .order("orden")
    .order("created_at");

  if (error) {
    console.error(error);
    grid.innerHTML = `<p>No se pudieron cargar los cursos. Inténtalo más tarde.</p>`;
    return;
  }

  if (counter) counter.textContent = `${data.length} curso${data.length === 1 ? "" : "s"}`;

  if (!data.length) {
    grid.innerHTML = `<p>Pronto habrá nuevos cursos.</p>`;
    return;
  }

  grid.innerHTML = data.map(c => {
    const lecciones = c.modules?.[0]?.count ?? 0;
    const precio = Number(c.precio);
    return `
      <div class="course-card">
        <div class="card-preview">
          <img src="${esc(safeImg(c.imagen))}" alt="${esc(c.titulo)}" class="course-img">
        </div>
        <div class="card-content">
          <span class="category">${esc(c.categoria || "Curso")}</span>
          <h3>${esc(c.titulo)}</h3>
          <p>${esc(c.descripcion || "")}</p>
          <div class="course-meta">${lecciones} lecciones · ${esc(c.duracion || "—")} · ${esc(c.nivel || "Básico")}</div>
          <div class="price-row">
            <span class="price">S/.${precio % 1 ? precio.toFixed(2) : precio} <small>PEN</small></span>
          </div>
          <a href="pagos.html?slug=${encodeURIComponent(c.slug)}" class="btn-login-main">Inscribirse</a>
        </div>
      </div>`;
  }).join("");
})();