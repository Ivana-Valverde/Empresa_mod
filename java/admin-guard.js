(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return (window.location.href = "iniciar.html");

  const { data: esAdmin } = await db.rpc("is_admin");
  if (!esAdmin) {
    alert("No tienes acceso a esta página.");
    window.location.href = "index.html";
  }
})();