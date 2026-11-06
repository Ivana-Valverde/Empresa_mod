// Cargar los productos acumulados desde localStorage al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    renderizarCarrito();

    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', procesarPago);
    }
});

function obtenerCarrito() {
    return JSON.parse(localStorage.getItem('atisj_carrito')) || [];
}

function renderizarCarrito() {
    const carrito = obtenerCarrito();
    const container = document.getElementById('cartItemsList');
    const totalElement = document.getElementById('grandTotal');

    if (!container || !totalElement) return;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #9ca3af; padding: 20px 0;">
                <p>No tienes cursos en tu carrito todavía.</p>
                <a href="cursos.html" style="color: #38bdf8; text-decoration: none; font-size: 0.85rem; margin-top: 8px; display: inline-block;">← Ver cursos disponibles</a>
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
            <div class="cart-summary-item">
                <div class="cart-item-info">
                    <span class="cart-item-title">${item.titulo}</span>
                    <span class="cart-item-price">S/.${precioNum.toFixed(2)} PEN</span>
                </div>
                <button type="button" class="btn-remove-item" onclick="eliminarDelCarrito(${index})" title="Eliminar curso">✕</button>
            </div>
        `;
    }).join('');

    totalElement.textContent = `S/.${sumaTotal.toFixed(2)} PEN`;
}

function eliminarDelCarrito(index) {
    let carrito = obtenerCarrito();
    carrito.splice(index, 1);
    localStorage.setItem('atisj_carrito', JSON.stringify(carrito));
    renderizarCarrito();
}

function procesarPago(event) {
    event.preventDefault();
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        alert('Tu carrito está vacío. Agrega al menos un curso antes de continuar.');
        return;
    }

    const nombres = document.getElementById('nombres').value;
    const correo = document.getElementById('correo').value;

    alert(`¡Gracias por tu compra, ${nombres}! Se enviará la confirmación y tus accesos al correo: ${correo}`);

    // Limpiar carrito tras completar el pago
    localStorage.removeItem('atisj_carrito');
    window.location.href = 'index.html';
}