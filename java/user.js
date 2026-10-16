// ==========================================================
// user.js — LMS Interactivo + Supabase + Global Functions
// ==========================================================

let courses = {};            // { slug: {...curso} }
let completedModules = new Set();   // ids de módulos completados
let currentUser = null;
let currentCourseId = null;
let currentModuleIndex = 0;

// Extractor seguro de ID de YouTube
function parseYouTubeId(input) {
    if (!input) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.trim().match(regExp);
    return (match && match[2].length === 11) ? match[2] : input.trim();
}

function paymentLabel(status) {
    return status === "paid" ? "Pagado" : "Pago pendiente";
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-PE", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function courseProgress(course) {
    if (!course || !course.modules || !course.modules.length) return 0;
    const done = course.modules.filter(m => completedModules.has(m.id)).length;
    return Math.round((done / course.modules.length) * 100);
}

// ---------- Carga de datos desde Supabase ----------
async function loadData() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return false;
    currentUser = session.user;

    const { data: enrollments, error } = await db
        .from("enrollments")
        .select(`
            estado_pago,
            pagado_en,
            courses (
                id, slug, titulo, categoria, precio, fill_class,
                modules (
                    id, orden, titulo, descripcion, video_url, video_id, es_local,
                    resources ( id, titulo, url )
                )
            )
        `)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        alert("No se pudieron cargar tus cursos.");
        return false;
    }

    courses = {};
    enrollments.forEach(e => {
        const c = e.courses;
        if (!c) return;
        courses[c.slug] = {
            id: c.id,
            slug: c.slug,
            title: c.titulo,
            category: c.categoria,
            fillClass: c.fill_class,
            payment: {
                status: e.estado_pago === "pagado" ? "paid" : "pending",
                price: `S/.${Number(c.precio)} PEN`,
                date: formatDate(e.pagado_en)
            },
            modules: (c.modules || []).sort((a, b) => a.orden - b.orden)
        };
    });

    const { data: prog } = await db
        .from("module_progress")
        .select("module_id")
        .eq("user_id", currentUser.id)
        .eq("completado", true);

    completedModules = new Set((prog || []).map(p => p.module_id));

    const { count: certCount } = await db
        .from("certificates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUser.id);

    renderStats(certCount || 0);
    return true;
}

function renderStats(certCount) {
    const nums = document.querySelectorAll(".stat-number");
    if (nums.length < 4) return;

    const list = Object.values(courses);
    const total = list.length;
    const avg = total
        ? Math.round(list.reduce((s, c) => s + courseProgress(c), 0) / total)
        : 0;
    const paid = list.filter(c => c.payment.status === "paid").length;

    nums[0].textContent = total;
    nums[1].textContent = `${avg}%`;
    nums[2].textContent = certCount;
    nums[3].textContent = `${paid}/${total}`;
}

function renderEnrolledCourses() {
    const grid = document.getElementById("enrolled-courses-grid");
    if (!grid) return;

    if (!Object.keys(courses).length) {
        grid.innerHTML = `<p>Aún no tienes cursos. <a href="cursos.html">Explora el catálogo</a>.</p>`;
        return;
    }

    grid.innerHTML = Object.entries(courses).map(([id, c]) => {
        const progress = courseProgress(c);
        return `
        <div class="enrolled-card">
            <div class="enrolled-card-body">
                <div class="enrolled-card-top">
                    <span class="category">${c.category}</span>
                    <span class="status-pill ${c.payment.status === 'paid' ? 'paid' : 'pending'}">
                        ${paymentLabel(c.payment.status)}
                    </span>
                </div>
                <h3>${c.title}</h3>
                <div class="progress-info">
                    <span class="course-name">Progreso</span>
                    <span class="progress-percentage">${progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${c.fillClass || ''}" style="width: ${progress}%;"></div>
                </div>
                <button class="btn-continue" onclick="openCourse('${id}')">Continuar curso</button>
            </div>
        </div>`;
    }).join("");
}

function renderPayments() {
    const table = document.getElementById("payments-table");
    if (!table) return;

    const rows = Object.values(courses).map(c => `
        <div class="payment-row">
            <span class="payment-course">${c.title}</span>
            <span>${c.payment.price}</span>
            <span class="status-pill ${c.payment.status === 'paid' ? 'paid' : 'pending'}">
                ${paymentLabel(c.payment.status)}
            </span>
            <span>${c.payment.date}</span>
            ${c.payment.status === 'paid'
                ? `<a class="payment-action" href="#">Ver comprobante</a>`
                : `<a class="payment-action" href="pagos.html">Completar pago</a>`}
        </div>
    `).join("");

    table.innerHTML = `
        <div class="payment-row head">
            <span>Curso</span><span>Precio</span><span>Estado</span><span>Fecha</span><span></span>
        </div>
        ${rows}
    `;
}

function updateProgressUI() {
    const course = courses[currentCourseId];
    if (!course) return;

    const progress = courseProgress(course);
    const completedCount = course.modules.filter(m => completedModules.has(m.id)).length;
    const totalCount = course.modules.length;

    const percentEl = document.getElementById("study-progress-percent");
    const fillEl = document.getElementById("study-progress-fill");
    const countText = document.getElementById("lessons-count-text");

    if (percentEl) percentEl.textContent = `${progress}%`;
    if (fillEl) fillEl.style.width = `${progress}%`;
    if (countText) countText.textContent = `${completedCount} de ${totalCount} lecciones completadas`;

    const certBtn = document.getElementById("btn-certificate");
    if (certBtn) {
        if (progress === 100 && totalCount > 0) {
            certBtn.disabled = false;
            certBtn.classList.remove("disabled");
        } else {
            certBtn.disabled = true;
            certBtn.classList.add("disabled");
        }
    }

    renderEnrolledCourses();
    renderStats(Number(document.querySelectorAll(".stat-number")[2].textContent) || 0);
}

function openCourse(id) {
    const course = courses[id];
    if (!course) return;

    if (course.payment.status !== "paid") {
        alert("Este curso tiene el pago pendiente. Completa tu pago para acceder.");
        return;
    }

    currentCourseId = id;
    currentModuleIndex = 0;

    const subEl = document.getElementById("study-path-subtitle");
    const titleEl = document.getElementById("study-course-title");

    if (subEl) subEl.textContent = `Ruta de estudio de "${course.title}"`;
    if (titleEl) titleEl.textContent = course.title;

    updateProgressUI();
    renderModuleList();
    renderModule();

    document.getElementById("study-path").scrollIntoView({ behavior: "smooth" });
}

function renderModuleList() {
    const list = document.getElementById("module-list");
    const course = courses[currentCourseId];
    if (!course || !list) return;

    list.innerHTML = course.modules.map((m, i) => {
        const isDone = completedModules.has(m.id);
        const isActive = i === currentModuleIndex;
        return `
        <li class="module-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}"
            onclick="selectModule(${i})">
            <span class="module-index">${isDone ? "✓" : i + 1}</span>
            <span>${m.titulo}</span>
        </li>`;
    }).join("");
}

function selectModule(index) {
    currentModuleIndex = index;
    renderModuleList();
    renderModule();
}

function renderModule() {
    const course = courses[currentCourseId];
    if (!course || !course.modules.length) return;

    const mod = course.modules[currentModuleIndex];
    const videoContainer = document.getElementById("video-container");

    if (videoContainer) {
        if (mod.es_local) {
            videoContainer.innerHTML = `
                <video controls autoplay key="${mod.id}" style="width: 100%; max-height: 480px; display: block;">
                    <source src="${mod.video_url}" type="video/mp4">
                    Tu navegador no soporta el formato de video.
                </video>`;
        } else {
            const cleanVideoId = parseYouTubeId(mod.video_id || mod.video_url);
            const currentOrigin = encodeURIComponent(window.location.origin);

            videoContainer.innerHTML = `
                <iframe id="module-video" 
                        src="https://www.youtube.com/embed/${cleanVideoId}?enablejsapi=1&origin=${currentOrigin}" 
                        title="Video de la lección" 
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                </iframe>`;
        }
    }

    const titleEl = document.getElementById("module-title");
    const descEl = document.getElementById("module-description");
    const checkEl = document.getElementById("module-complete");

    if (titleEl) titleEl.textContent = `${currentModuleIndex + 1}. ${mod.titulo}`;
    if (descEl) descEl.textContent = mod.descripcion || "Sin descripción disponible.";
    if (checkEl) checkEl.checked = completedModules.has(mod.id);

    const resourcesList = document.getElementById("resources-list");
    if (resourcesList) {
        const resources = mod.resources || [];
        if (resources.length > 0) {
            resourcesList.innerHTML = resources.map(r => `
                <li><a href="${r.url}" target="_blank" rel="noopener">📄 ${r.titulo}</a></li>
            `).join("");
        } else {
            resourcesList.innerHTML = `<li style="color: #64748b; font-size: 0.88rem;">No hay material adjunto para esta lección.</li>`;
        }
    }

    loadLessonNotes(mod.id);

    const btnPrev = document.getElementById("btn-prev-lesson");
    const btnNext = document.getElementById("btn-next-lesson");
    if (btnPrev) btnPrev.disabled = currentModuleIndex === 0;
    if (btnNext) btnNext.disabled = currentModuleIndex === course.modules.length - 1;
}

// Navegación entre lecciones
function nextModule() {
    const course = courses[currentCourseId];
    if (course && currentModuleIndex < course.modules.length - 1) {
        selectModule(currentModuleIndex + 1);
    }
}

function prevModule() {
    if (currentModuleIndex > 0) {
        selectModule(currentModuleIndex - 1);
    }
}

// Cambiar Pestañas
function switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add("active");

    const activeBtn = Array.from(document.querySelectorAll(".tab-btn"))
        .find(b => b.getAttribute("onclick") && b.getAttribute("onclick").includes(tabId));
    if (activeBtn) activeBtn.classList.add("active");
}

// Bloc de Notas
function saveLessonNotes() {
    const course = courses[currentCourseId];
    if (!course) return;
    const mod = course.modules[currentModuleIndex];
    const notesInput = document.getElementById("lesson-notes-input");
    if (!notesInput) return;

    const notes = notesInput.value;
    const storageKey = `notes_${currentUser.id}_${mod.id}`;
    localStorage.setItem(storageKey, notes);

    const statusMsg = document.getElementById("notes-status-msg");
    if (statusMsg) {
        statusMsg.textContent = "✓ Notas guardadas";
        setTimeout(() => { statusMsg.textContent = ""; }, 2500);
    }
}

function loadLessonNotes(moduleId) {
    const storageKey = `notes_${currentUser.id}_${moduleId}`;
    const savedNotes = localStorage.getItem(storageKey) || "";
    const input = document.getElementById("lesson-notes-input");
    if (input) input.value = savedNotes;
}

function downloadCertificate() {
    const course = courses[currentCourseId];
    if (!course) return;
    alert(`🎉 ¡Felicitaciones! Has completado el 100% de "${course.title}". Tu certificado de ATIS-J Technology está listo.`);
}

// Escuchador de Checkbox "Completada"
document.addEventListener("change", async (e) => {
    if (e.target.id !== "module-complete" || !currentCourseId) return;

    const checkbox = e.target;
    const mod = courses[currentCourseId].modules[currentModuleIndex];
    const completado = checkbox.checked;

    const { error } = await db.from("module_progress").upsert({
        user_id: currentUser.id,
        module_id: mod.id,
        completado,
        completed_at: completado ? new Date().toISOString() : null
    });

    if (error) {
        console.error(error);
        checkbox.checked = !completado;
        alert("No se pudo guardar tu progreso.");
        return;
    }

    if (completado) completedModules.add(mod.id);
    else completedModules.delete(mod.id);

    updateProgressUI();
    renderModuleList();
});

// EXPOSICIÓN GLOBAL DE FUNCIONES PARA EL HTML (Evita que el onclick falle)
window.openCourse = openCourse;
window.selectModule = selectModule;
window.prevModule = prevModule;
window.nextModule = nextModule;
window.switchTab = switchTab;
window.saveLessonNotes = saveLessonNotes;
window.downloadCertificate = downloadCertificate;

// Inicio al cargar DOM
document.addEventListener("DOMContentLoaded", async () => {
    const ok = await loadData();
    if (!ok) return;

    renderEnrolledCourses();
    renderPayments();

    const firstPaid = Object.keys(courses).find(id => courses[id].payment.status === "paid");
    if (firstPaid) openCourse(firstPaid);
});