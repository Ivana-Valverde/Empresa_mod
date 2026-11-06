// Cargar el carrito guardado previamente en el navegador
let carrito = JSON.parse(localStorage.getItem('atisj_carrito')) || [];

// Actualizar la cifra en el botón del Navbar
function actualizarBadgeCarrito() {
  const btnCart = document.getElementById("cartBtn");
  if (btnCart) {
    btnCart.textContent = `🛒 Carrito (${carrito.length})`;
  }
}

// Ejecutar apenas cargue el DOM
document.addEventListener('DOMContentLoaded', actualizarBadgeCarrito);

// Función global asignada a los botones de cada tarjeta
window.agregarAlCarrito = function(event, titulo, precio) {
  if (event) event.preventDefault();

  // Guardar el curso seleccionado
  carrito.push({
    titulo: String(titulo),
    precio: Number(precio)
  });

  // Guardar en localStorage
  localStorage.setItem('atisj_carrito', JSON.stringify(carrito));

  // Actualizar contador visual
  actualizarBadgeCarrito();

  // Animación rápida al pulsar
  const btnCart = document.getElementById("cartBtn");
  if (btnCart) {
    btnCart.style.transition = "transform 0.1s ease";
    btnCart.style.transform = "scale(1.15)";
    setTimeout(() => btnCart.style.transform = "scale(1)", 150);
  }
};

(async () => {
  const grid = document.getElementById("courses-grid");
  const counter = document.getElementById("course-count");
  if (!grid) return;

  const esc = t => String(t ?? "").replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
    const tituloLimpio = esc(c.titulo);

    return `
      <div class="course-card">
        <div class="card-preview">
          <img src="${esc(safeImg(c.imagen))}" alt="${tituloLimpio}" class="course-img">
        </div>
        <div class="card-content">
          <span class="category">${esc(c.categoria || "Curso")}</span>
          <h3>${tituloLimpio}</h3>
          <p>${esc(c.descripcion || "")}</p>
          <div class="course-meta">${lecciones} lecciones · ${esc(c.duracion || "—")} · ${esc(c.nivel || "Básico")}</div>
          <div class="price-row">
            <span class="price">S/.${precio % 1 ? precio.toFixed(2) : precio} <small>PEN</small></span>
          </div>
          <button type="button" onclick="agregarAlCarrito(event, '${tituloLimpio}', ${precio})" class="btn-login-main" style="cursor: pointer; border: none; width: 100%; margin-top: 10px;">🛒 Añadir al carrito</button>
        </div>
      </div>`;
  }).join("");
})();