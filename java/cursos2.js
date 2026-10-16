(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) window.location.replace("user.html");
})();