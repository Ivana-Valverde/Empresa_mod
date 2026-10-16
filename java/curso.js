document.addEventListener('DOMContentLoaded', () => {
    // Confirmación interactiva al hacer clic en inscribirse
    const enrollButtons = document.querySelectorAll('.btn-card, .btn-tutoring');
    
    enrollButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const cardTitle = e.target.closest('.card-content, .plan-info').querySelector('h3').textContent;
            alert(`¡Excelente elección! Te estás inscribiendo en: ${cardTitle}`);
        });
    });
});