document.addEventListener('DOMContentLoaded', () => {
    renderizarResumenCompra();

    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', procesarPago);
    }
});

function obtenerCarrito() {
    return JSON.parse(localStorage.getItem('atisj_carrito')) || [];
}

function renderizarResumenCompra() {
    const carrito = obtenerCarrito();
    const container = document.getElementById('cartItemsList');
    const totalElement = document.getElementById('grandTotal');

    if (!container || !totalElement) return;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #9ca3af; padding: 20px 0;">
                <p style="margin-bottom: 10px;">No has seleccionado ningún curso aún.</p>
                <a href="cursos.html" style="color: #38bdf8; text-decoration: none; font-weight: bold;">← Ver catálogo de cursos</a>
            </div>
        `;
        totalElement.textContent = 'S/.0.00 PEN';
        return;
    }

    let sumaTotal = 0;

    container.innerHTML = carrito.map((item, index) => {
        const precioNum = Number(item.precio) || 0;
        sumaTotal += precioNum;

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #161b22; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 10px;">
                <div>
                    <div style="color: #ffffff; font-weight: 600; font-size: 0.95rem;">${item.titulo}</div>
                    <div style="color: #38bdf8; font-weight: 700; font-size: 0.9rem;">S/.${precioNum.toFixed(2)} PEN</div>
                </div>
                <button type="button" onclick="eliminarDelCarrito(${index})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; padding: 4px 8px;" title="Quitar del carrito">✕</button>
            </div>
        `;
    }).join('');

    totalElement.textContent = `S/.${sumaTotal.toFixed(2)} PEN`;
}

function eliminarDelCarrito(index) {
    let carrito = obtenerCarrito();
    carrito.splice(index, 1);
    localStorage.setItem('atisj_carrito', JSON.stringify(carrito));
    renderizarResumenCompra();
}

function procesarPago(event) {
    event.preventDefault();
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        alert('Tu carrito está vacío. Elige al menos un curso antes de pagar.');
        return;
    }

    const nombres = document.getElementById('nombres')?.value || 'Alumno';
    const correo = document.getElementById('correo')?.value || '';

    alert(`¡Gracias por tu inscripción, ${nombres}! En breve recibirás los accesos a tus cursos en: ${correo}`);

    // Vaciar el carrito tras realizar la compra
    localStorage.removeItem('atisj_carrito');
    window.location.href = 'index.html';
}

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