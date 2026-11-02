const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = iso => iso ? new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const money = n => "S/." + Number(n || 0).toFixed(2);

let D = { profiles: [], courses: [], modules: [], enrollments: [], progress: [], certs: [] };
let pagoFiltro = "todos";

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ---------- Guard + carga ----------
async function loadAll() {
  const q = [
    db.from("profiles").select("id, nombre, email, created_at").order("created_at", { ascending: false }),
    db.from("courses").select("*").order("orden").order("created_at"),
    db.from("modules").select("id, course_id, orden, titulo, descripcion, video_id").order("orden"),
    db.from("enrollments").select("id, user_id, course_id, estado_pago, created_at, pagado_en").order("created_at", { ascending: false }),
    db.from("module_progress").select("user_id, module_id").eq("completado", true),
    db.from("certificates").select("id, user_id, course_id, emitido_en").order("emitido_en", { ascending: false })
  ];
  const r = await Promise.all(q);
  const err = r.find(x => x.error);
  if (err) { console.error(err.error); toast("Error al cargar datos"); return false; }
  [D.profiles, D.courses, D.modules, D.enrollments, D.progress, D.certs] = r.map(x => x.data || []);
  return true;
}

async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return (location.href = "iniciar.html");

  const { data: esAdmin } = await db.rpc("is_admin");
  if (!esAdmin) {
    alert("No tienes acceso a esta página.");
    return (location.href = "index.html");
  }

  $("#admin-app").hidden = false;
  if (await loadAll()) renderAll();
}

// ---------- Helpers de datos ----------
const user = id => D.profiles.find(p => p.id === id);
const course = id => D.courses.find(c => c.id === id);
const modulesOf = cid => D.modules.filter(m => m.course_id === cid);

function pct(userId, courseId) {
  const mods = modulesOf(courseId);
  if (!mods.length) return 0;
  const done = mods.filter(m => D.progress.some(p => p.user_id === userId && p.module_id === m.id)).length;
  return Math.round(done / mods.length * 100);
}

// ---------- Render ----------
function renderAll() {
  renderResumen(); renderPagos(); renderUsuarios(); renderCursos(); renderCerts();
}

function renderResumen() {
  const pagadas = D.enrollments.filter(e => e.estado_pago === "pagado");
  const ingresos = pagadas.reduce((s, e) => s + Number(course(e.course_id)?.precio || 0), 0);
  const pendientes = D.enrollments.length - pagadas.length;

  const top = D.courses.map(c => ({
    t: c.titulo,
    n: D.enrollments.filter(e => e.course_id === c.id).length
  })).sort((a, b) => b.n - a.n);

  $("#tab-resumen").innerHTML = `
    <div class="cards">
      <div class="card-stat"><b>${D.profiles.length}</b><span>Alumnos registrados</span></div>
      <div class="card-stat"><b>${D.enrollments.length}</b><span>Inscripciones</span></div>
      <div class="card-stat"><b>${pendientes}</b><span>Pagos pendientes</span></div>
      <div class="card-stat"><b>${money(ingresos)}</b><span>Ingresos confirmados</span></div>
      <div class="card-stat"><b>${D.certs.length}</b><span>Certificados emitidos</span></div>
    </div>
    <h2>Cursos más inscritos</h2>
    <table class="adm"><tr><th>Curso</th><th>Inscritos</th></tr>
      ${top.map(t => `<tr><td>${esc(t.t)}</td><td>${t.n}</td></tr>`).join("")}
    </table>`;
}

function renderPagos() {
  const list = D.enrollments.filter(e => pagoFiltro === "todos" || e.estado_pago === pagoFiltro);
  $("#tab-pagos").innerHTML = `
    <h2>Pagos e inscripciones</h2>
    <div class="filters">
      ${["todos", "pendiente", "pagado"].map(f =>
        `<button class="btn-a ${pagoFiltro === f ? "" : "ghost"}" data-action="filtro" data-f="${f}">${f}</button>`).join("")}
    </div>
    <div class="table-scroll"><table class="adm">
      <tr><th>Alumno</th><th>Curso</th><th>Precio</th><th>Estado</th><th>Inscrito</th><th>Pagado</th><th></th></tr>
      ${list.map(e => {
        const u = user(e.user_id), c = course(e.course_id);
        const pagado = e.estado_pago === "pagado";
        return `<tr>
          <td>${esc(u?.nombre || "—")}<br><span class="muted">${esc(u?.email || "")}</span></td>
          <td>${esc(c?.titulo)}</td><td>${money(c?.precio)}</td>
          <td><span class="pill ${e.estado_pago}">${e.estado_pago}</span></td>
          <td>${fmt(e.created_at)}</td><td>${fmt(e.pagado_en)}</td>
          <td>
            <button class="btn-a ${pagado ? "ghost" : ""}" data-action="pago" data-id="${e.id}" data-to="${pagado ? "pendiente" : "pagado"}">
              ${pagado ? "Marcar pendiente" : "Marcar pagado"}</button>
            <button class="btn-a danger" data-action="del-enr" data-id="${e.id}">✕</button>
          </td></tr>`;
      }).join("") || `<tr><td colspan="7" class="muted">Sin resultados.</td></tr>`}
    </table></div>`;
}

function renderUsuarios() {
  $("#tab-usuarios").innerHTML = `
    <h2>Usuarios</h2>
    <div class="table-scroll"><table class="adm">
      <tr><th>Alumno</th><th>Registro</th><th>Cursos y progreso</th><th>Inscribir manualmente</th></tr>
      ${D.profiles.map(u => {
        const mine = D.enrollments.filter(e => e.user_id === u.id);
        const libres = D.courses.filter(c => !mine.some(e => e.course_id === c.id));
        return `<tr>
          <td>${esc(u.nombre || "—")}<br><span class="muted">${esc(u.email || "")}</span></td>
          <td>${fmt(u.created_at)}</td>
          <td>${mine.map(e => `${esc(course(e.course_id)?.titulo)}: <b>${pct(u.id, e.course_id)}%</b>`).join("<br>") || '<span class="muted">Sin cursos</span>'}</td>
          <td>${libres.length ? `
            <select id="sel-${u.id}">${libres.map(c => `<option value="${c.id}">${esc(c.titulo)}</option>`).join("")}</select>
            <button class="btn-a" data-action="enroll" data-user="${u.id}">Inscribir</button>` : '<span class="muted">Tiene todos</span>'}
          </td></tr>`;
      }).join("")}
    </table></div>`;
}

function renderCursos() {
  $("#tab-cursos").innerHTML = `
    <h2>Nuevo curso (tarjeta del catálogo)</h2>
    <form id="form-curso" class="adm-form">
      <input name="slug" placeholder="slug (ej: python)" required>
      <input name="titulo" placeholder="Título" required>
      <input name="categoria" placeholder="Categoría">
      <input name="precio" type="number" step="0.01" min="0" placeholder="Precio S/." required>
      <input name="duracion" placeholder="Duración (ej: 2 h)" value="1 h">
      <select name="nivel">
        <option>Básico</option><option>Intermedio</option><option>Avanzado</option>
      </select>
      <select name="fill_class">
        <option value="fill-blue">Azul</option><option value="fill-purple">Morado</option>
        <option value="fill-green">Verde</option><option value="fill-amber">Ámbar</option>
      </select>
      <input name="descripcion" placeholder="Descripción corta" style="flex:1 1 100%">
      <label class="muted">Imagen (máx. 2 MB):
        <input name="imagen_file" type="file" accept="image/*">
      </label>
      <label class="muted"><input name="publicado" type="checkbox" checked> Publicar ahora</label>
      <button class="btn-a">Crear curso</button>
    </form>

    <h2>Nuevo módulo</h2>
    <form id="form-modulo" class="adm-form">
      <select name="course_id">${D.courses.map(c => `<option value="${c.id}">${esc(c.titulo)}</option>`).join("")}</select>
      <input name="orden" type="number" min="1" placeholder="Orden" required style="width:90px">
      <input name="titulo" placeholder="Título del módulo" required>
      <input name="video_id" placeholder="ID de YouTube">
      <input name="descripcion" placeholder="Descripción">
      <button class="btn-a">Agregar módulo</button>
    </form>

    ${D.courses.map(c => `
      <div class="course-box">
        <h3>${esc(c.titulo)} <span class="muted">· ${esc(c.slug)} · ${money(c.precio)}</span>
          ${c.publicado ? "" : '<span class="pill pendiente">Oculto</span>'}</h3>
        <button class="btn-a ghost" data-action="precio" data-id="${c.id}">Cambiar precio</button>
        <button class="btn-a ghost" data-action="publicar" data-id="${c.id}" data-to="${!c.publicado}">
          ${c.publicado ? "Ocultar del catálogo" : "Publicar"}</button>
        <button class="btn-a danger" data-action="del-curso" data-id="${c.id}">Eliminar curso</button>
        <table class="adm">
          ${modulesOf(c.id).map(m => `<tr>
            <td style="width:40px">${m.orden}</td><td>${esc(m.titulo)}</td>
            <td class="muted">${esc(m.video_id || "video local")}</td>
            <td><button class="btn-a danger" data-action="del-mod" data-id="${m.id}">✕</button></td></tr>`).join("")
            || `<tr><td class="muted">Sin módulos.</td></tr>`}
        </table>
      </div>`).join("")}`;
}

function renderCerts() {
  const elegibles = D.enrollments.filter(e =>
    e.estado_pago === "pagado" &&
    modulesOf(e.course_id).length > 0 &&
    pct(e.user_id, e.course_id) === 100 &&
    !D.certs.some(c => c.user_id === e.user_id && c.course_id === e.course_id));

  $("#tab-certificados").innerHTML = `
    <h2>Listos para certificar (100% y pagado)</h2>
    <table class="adm">
      ${elegibles.map(e => `<tr>
        <td>${esc(user(e.user_id)?.nombre)}</td><td>${esc(course(e.course_id)?.titulo)}</td>
        <td><button class="btn-a" data-action="emitir" data-user="${e.user_id}" data-course="${e.course_id}">Emitir certificado</button></td>
      </tr>`).join("") || `<tr><td class="muted">Nadie pendiente.</td></tr>`}
    </table>
    <h2 style="margin-top:22px">Certificados emitidos</h2>
    <table class="adm">
      <tr><th>Alumno</th><th>Curso</th><th>Fecha</th><th></th></tr>
      ${D.certs.map(c => `<tr>
        <td>${esc(user(c.user_id)?.nombre)}</td><td>${esc(course(c.course_id)?.titulo)}</td><td>${fmt(c.emitido_en)}</td>
        <td><button class="btn-a danger" data-action="del-cert" data-id="${c.id}">Revocar</button></td></tr>`).join("")
        || `<tr><td class="muted" colspan="4">Aún no hay certificados.</td></tr>`}
    </table>`;
}

// ---------- Acciones ----------
async function run(promise, okMsg) {
  const { error } = await promise;
  if (error) { console.error(error); toast("Error: " + error.message); return false; }
  toast(okMsg);
  if (await loadAll()) renderAll();
  return true;
}

document.addEventListener("click", async e => {
  const tab = e.target.closest(".tab");
  if (tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".panel").forEach(p => p.hidden = p.id !== "tab-" + tab.dataset.tab);
    return;
  }

  const b = e.target.closest("[data-action]");
  if (!b) return;
  const d = b.dataset;

  switch (d.action) {
    case "filtro": pagoFiltro = d.f; renderPagos(); break;

    case "pago":
      await run(db.from("enrollments").update({
        estado_pago: d.to,
        pagado_en: d.to === "pagado" ? new Date().toISOString() : null
      }).eq("id", d.id), "Pago actualizado");
      break;

    case "del-enr":
      if (confirm("¿Eliminar esta inscripción?"))
        await run(db.from("enrollments").delete().eq("id", d.id), "Inscripción eliminada");
      break;

    case "enroll": {
      const cid = $("#sel-" + d.user).value;
      await run(db.from("enrollments").insert({ user_id: d.user, course_id: cid, estado_pago: "pendiente" }),
        "Inscrito (pendiente de pago)");
      break;
    }

    case "precio": {
      const v = prompt("Nuevo precio en S/.:");
      if (v === null || isNaN(Number(v)) || Number(v) < 0) break;
      await run(db.from("courses").update({ precio: Number(v) }).eq("id", d.id), "Precio actualizado");
      break;
    }

    case "publicar":
      await run(db.from("courses").update({ publicado: d.to === "true" }).eq("id", d.id),
        d.to === "true" ? "Curso publicado" : "Curso oculto");
      break;

    case "del-curso":
      if (confirm("Se borrarán también sus módulos, inscripciones y certificados. ¿Seguro?"))
        await run(db.from("courses").delete().eq("id", d.id), "Curso eliminado");
      break;

    case "del-mod":
      if (confirm("¿Eliminar este módulo?"))
        await run(db.from("modules").delete().eq("id", d.id), "Módulo eliminado");
      break;

    case "emitir":
      await run(db.from("certificates").insert({ user_id: d.user, course_id: d.course }), "Certificado emitido");
      break;

    case "del-cert":
      if (confirm("¿Revocar este certificado?"))
        await run(db.from("certificates").delete().eq("id", d.id), "Certificado revocado");
      break;
  }
});

document.addEventListener("submit", async e => {
  if (e.target.id === "form-curso") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const slug = String(fd.get("slug")).trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) return toast("Slug inválido");

    // Subir imagen (opcional)
    let imagen = null;
    const file = fd.get("imagen_file");
    if (file && file.size) {
      if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
        return toast("La imagen debe pesar menos de 2 MB");
      }
      const ext = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${slug}-${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from("course-images").upload(path, file);
      if (upErr) { console.error(upErr); return toast("No se pudo subir la imagen"); }
      imagen = db.storage.from("course-images").getPublicUrl(path).data.publicUrl;
    }

    await run(db.from("courses").insert({
      slug,
      titulo: fd.get("titulo").trim(),
      categoria: fd.get("categoria").trim() || null,
      descripcion: fd.get("descripcion").trim() || null,
      precio: Number(fd.get("precio")),
      duracion: fd.get("duracion").trim() || null,
      nivel: fd.get("nivel"),
      fill_class: fd.get("fill_class"),
      publicado: fd.get("publicado") === "on",
      imagen
    }), "Curso creado");
  }

  if (e.target.id === "form-modulo") {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    f.orden = Number(f.orden);
    f.video_id = f.video_id.trim() || null;
    f.es_local = false;
    await run(db.from("modules").insert(f), "Módulo agregado");
  }
});

init();