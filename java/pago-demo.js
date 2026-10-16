// ==========================================================
// pagos-demo.js — completa el resumen del checkout con el
// curso que el usuario eligió en cursos.html (pasado por la
// URL) y simula el pago, SIN backend ni validación real.
//
// Bórralo / reemplázalo cuando conectes una pasarela real.
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const curso = params.get("curso");

    // Si no llega ningún curso por la URL (por ejemplo, entraste
    // directo a pagos.html), se deja el contenido de ejemplo tal
    // cual está en el HTML.
    if (!curso) return;

    const categoria = params.get("categoria") || "Curso";
    const desc = params.get("desc") || "";
    const precio = params.get("precio") || "0";
    const img = params.get("img") || "img/general.png";

    document.getElementById("summary-category").textContent = categoria;
    document.getElementById("summary-title").textContent = curso;
    document.getElementById("summary-desc").textContent = desc;
    document.getElementById("summary-img").src = img;
    document.getElementById("summary-img").alt = curso;
    document.getElementById("summary-price").textContent = `S/. ${precio}.00`;
    document.getElementById("btn-pay").textContent = `Pagar S/.${precio}.00 PEN`;
});

// Igual que en el login: se registra en fase de captura para
// ejecutarse antes que cualquier lógica de js/pago.js y evitar
// que te devuelva al formulario en vez de "confirmar" el pago.
document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || form.id !== "payment-form") return;

    event.stopImmediatePropagation();
    event.preventDefault();

    // Aquí, en el futuro, iría la integración real con la pasarela de pago.
    window.location.href = "user.html";
}, true);