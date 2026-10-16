document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener datos pasados por la URL
    const params = new URLSearchParams(window.location.search);
    
    const titulo = params.get('titulo') || 'HTML y CSS Pro';
    const categoria = params.get('categoria') || 'Diseño web';
    const desc = params.get('desc') || 'Maquetación responsiva y accesible.';
    const precio = params.get('precio') || '200';
    const moneda = params.get('moneda') || 'PEN';
    const img = params.get('img') || 'img/html.png';

    // 2. Reemplazar valores en el HTML
    document.getElementById('course-title').textContent = titulo;
    document.getElementById('course-category').textContent = categoria;
    document.getElementById('course-desc').textContent = desc;
    document.getElementById('course-price').textContent = `${moneda === 'PEN' ? 'S/.' : '$'}${precio}`;
    document.getElementById('course-currency').textContent = moneda;
    document.getElementById('course-img').src = img;
    document.getElementById('btn-pay').textContent = `Pagar ${moneda === 'PEN' ? 'S/.' : '$'}${precio} ${moneda}`;

    // 3. Formato del formulario de tarjeta
    const cardNumberInput = document.getElementById('card-number');
    const cardExpiryInput = document.getElementById('card-expiry');
    const paymentForm = document.getElementById('payment-form');

    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = value.substring(0, 19);
        });
    }

    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value.substring(0, 5);
        });
    }

    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert(`¡Pago procesado con éxito para el curso "${titulo}"!`);
            window.location.href = 'cursos2.html';
        });
    }
});