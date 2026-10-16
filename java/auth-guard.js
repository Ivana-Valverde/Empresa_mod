(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = "iniciar.html";
    return;
  }
  window.currentUser = session.user;

  const { data: perfil } = await db
    .from("profiles")
    .select("nombre, created_at")
    .eq("id", session.user.id)
    .single();

  const nombre = perfil?.nombre || session.user.email.split("@")[0];
  const iniciales = nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  document.querySelector(".profile-avatar").textContent = iniciales;
  document.querySelector(".profile-info h1").textContent = nombre;
  document.querySelector(".profile-email").textContent = session.user.email;

  if (perfil?.created_at) {
    const fecha = new Date(perfil.created_at).toLocaleDateString("es-PE", { month: "long", year: "numeric" });
    document.querySelector(".profile-since").textContent = "Miembro desde " + fecha;
  }
})();