const form = document.getElementById("login-form");

// Decide a dónde mandar al usuario: admin → panel, alumno → perfil
async function irAlInicio() {
  const { data: esAdmin } = await db.rpc("is_admin");
  window.location.href = esAdmin ? "admin.html" : "user.html";
}

// Si ya tiene sesión, lo mandamos directo a su página
db.auth.getSession().then(({ data }) => {
  if (data.session) irAlInicio();
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

  if (error) {
    btn.disabled = false;
    btn.textContent = "Entrar";

    if (error.message.includes("Invalid login credentials")) {
      alert("Correo o contraseña incorrectos.");
    } else if (error.message.includes("Email not confirmed")) {
      alert("Debes confirmar tu correo antes de entrar. Revisa tu bandeja.");
    } else {
      alert("Error: " + error.message);
    }
    return;
  }

  await irAlInicio();
});