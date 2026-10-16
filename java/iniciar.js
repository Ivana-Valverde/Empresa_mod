const form = document.getElementById("login-form");

// Si ya tiene sesión, lo mandamos directo a su perfil
db.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = "user.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Escribe tu correo y contraseña.");
    return;
  }

  const btn = form.querySelector(".btn-submit");
  btn.disabled = true;
  btn.textContent = "Entrando...";

  const { error } = await db.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = "Entrar";

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      alert("Correo o contraseña incorrectos.");
    } else if (error.message.includes("Email not confirmed")) {
      alert("Debes confirmar tu correo antes de entrar. Revisa tu bandeja.");
    } else {
      alert("Error: " + error.message);
    }
    return;
  }

  window.location.href = "user.html";
});