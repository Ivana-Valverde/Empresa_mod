document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombre = document.getElementById("fullname").value.trim();
            const email = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-password").value;

            if (password.length < 6) {
                alert("La contraseña debe tener al menos 6 caracteres.");
                return;
            }

            const btn = form.querySelector(".btn-submit");
            btn.disabled = true;
            btn.textContent = "Creando cuenta...";

            const { data, error } = await db.auth.signUp({
                email,
                password,
                options: { data: { nombre } }  
            });

            btn.disabled = false;
            btn.textContent = "Crear cuenta";

            if (error) {
                alert("Error: " + error.message);
                return;
            }

            if (data.session) {
                window.location.href = "user.html";
            } else {
                alert("Revisa tu correo para confirmar tu cuenta.");
                window.location.href = "iniciar.html";
            }
        });
    }
});

// Función para Google OAuth con ruta dinámica
async function loginConGoogle() {
    // Calcula la ruta actual sin importar si estás en localhost o en un subdirectorio de GitHub Pages
    const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    const targetUrl = `${window.location.origin}${currentPath}/user.html`;

    const { data, error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: targetUrl
        }
    });

    if (error) {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo iniciar sesión con Google: " + error.message);
    }
}

// Exponer la función globalmente
window.loginConGoogle = loginConGoogle;