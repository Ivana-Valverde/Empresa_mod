(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  const { data: esAdmin } = await db.rpc("is_admin");
  window.location.replace(esAdmin ? "admin.html" : "user.html");
})();