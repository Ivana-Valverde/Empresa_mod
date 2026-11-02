// java/navbar.js — navbar compartido con sesión real de Supabase
(async () => {
  try {
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

    // 1) Pestaña activa
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

    // 2) Sesión
    const box = document.querySelector(".auth-buttons");
    if (!box) return;

    const { data: { session } } = await db.auth.getSession();
    if (!session) return;

    const nombre = session.user.user_metadata?.nombre
                || session.user.email.split("@")[0];
    const iniciales = nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

    // 3) ¿Es admin? (si falla, simplemente no se muestra el link)
    let esAdmin = false;
    try {
      const { data } = await db.rpc("is_admin");
      esAdmin = data === true;
    } catch (e) { console.warn("is_admin falló", e); }

    box.innerHTML = "";

    if (esAdmin) {
      const adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.className = "btn-primary-outline";
      adminLink.textContent = "Admin";
      adminLink.style.marginRight = "10px";
      box.append(adminLink);
    }

    box.innerHTML = "";

    // Los admins no ven nada de la vista alumno
    if (esAdmin) {
      document
        .querySelectorAll('a[href="cursos2.html"], a[href="user.html"]')
        .forEach(a => a.remove());
    }

    const chip = document.createElement("a");
    chip.href = esAdmin ? "admin.html" : "user.html";
    chip.className = "nav-user-chip";
    const av = document.createElement("span");
    av.className = "nav-user-avatar";
    av.textContent = esAdmin ? "AD" : iniciales;
    const nm = document.createElement("span");
    nm.textContent = esAdmin ? nombre + " (admin)" : nombre;
    chip.append(av, nm);

    const salir = document.createElement("button");
    salir.className = "btn-primary-outline nav-logout";
    salir.textContent = "Salir";
    salir.addEventListener("click", async () => {
      await db.auth.signOut();
      window.location.href = "index.html";
    });

    box.append(chip, salir);

    db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && location.pathname.endsWith("user.html")) {
        window.location.href = "iniciar.html";
      }
    });
  } catch (err) {
    console.error("navbar.js:", err);
  }
})();