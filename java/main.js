document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('mainVideo');

    if (video) {
        // Intenta reproducir al hacer el primer clic en la página
        const startAudioVideo = () => {
            video.muted = false; // Asegura que el audio esté activado
            video.play().catch(error => {
                console.log("Esperando interacción del usuario para reproducir audio:", error);
            });
            document.removeEventListener('click', startAudioVideo);
        };

        document.addEventListener('click', startAudioVideo, { once: true });
    }
});
function openModal() {
  const modal = document.getElementById('courseModal');
  const container = document.getElementById('modalContainer');
  
  modal.classList.remove('hidden');
  setTimeout(() => {
    container.classList.remove('scale-95', 'opacity-0');
    container.classList.add('scale-100', 'opacity-100');
  }, 10);
}

function closeModal() {
  const modal = document.getElementById('courseModal');
  const container = document.getElementById('modalContainer');
  
  container.classList.remove('scale-100', 'opacity-100');
  container.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

// Cerrar si se hace clic fuera del contenido
document.getElementById('courseModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
function openModal() {
  document.getElementById('courseModal').classList.add('active');
}

function closeModal() {
  document.getElementById('courseModal').classList.remove('active');
}

// Cerrar si se da clic fuera de la caja
document.getElementById('courseModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeModal();
  }
});