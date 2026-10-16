// java/navbar.js — navbar compartido con sesión real de Supabase
(async () => {
  // Estilos del chip (así funciona en todas las páginas, sin depender de user.css)
  const style = document.createElement("style");
  style.textContent = `
    .nav-user-chip{display:inline-flex;align-items:center;gap:8px;padding:5px 14px 5px 5px;
      border:1px solid rgba(255,255,255,.2);border-radius:999px;color:inherit;text-decoration:none;font-size:.9rem}
    .nav-user-chip:hover{border-color:rgba(255,255,255,.5)}
    .nav-user-avatar{width:28px;height:28px;border-radius:50%;background:#3b82f6;color:#fff;
      display:grid;place-items:center;font-size:.75rem;font-weight:700}
    .nav-logout{margin-left:10px;cursor:pointer;background:none;font:inherit}
    .auth-buttons{display:flex;align-items:center}
  `;
  document.head.appendChild(style);

  // 1) Marcar la pestaña activa según la página
  const page = location.pathname.split("/").pop() || "index.html";
  const equivalencias = {
    "user.html": "cursos2.html",
    "pagos.html": "cursos.html",
    "pagosTutorias.html": "cursos.html"
  };
  const destino = equivalencias[page] || page;
  document.querySelectorAll(".nav-links a").forEach(a => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === destino || (href === "#" && destino === "index.html"));
  });

  // 2) Botones de sesión
  const box = document.querySelector(".auth-buttons");
  if (!box) return;

  const { data: { session } } = await db.auth.getSession();
  if (!session) return;   // sin sesión se queda "Crear cuenta"

  const nombre = session.user.user_metadata?.nombre
              || session.user.email.split("@")[0];
  const iniciales = nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  box.innerHTML = "";

  const chip = document.createElement("a");
  chip.href = "user.html";
  chip.className = "nav-user-chip";
  const av = document.createElement("span");
  av.className = "nav-user-avatar";
  av.textContent = iniciales;
  const nm = document.createElement("span");
  nm.textContent = nombre;
  chip.append(av, nm);

  const salir = document.createElement("button");
  salir.className = "btn-primary-outline nav-logout";
  salir.textContent = "Salir";
  salir.addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "index.html";
  });

  box.append(chip, salir);
})();

// Si cierra sesión en otra pestaña, se actualiza
db.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT" && location.pathname.endsWith("user.html")) {
    window.location.href = "iniciar.html";
  }
});