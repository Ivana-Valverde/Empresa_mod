// java/notas.js — Tarjetas de memoria por lección (tablero tipo Trello)
(() => {
  const ESTADOS = [
    { id: "nueva",       titulo: "Por repasar" },
    { id: "aprendiendo", titulo: "Aprendiendo" },
    { id: "dominada",    titulo: "Dominada" }
  ];

  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? "").replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toastMsg = m => alert(m);

  let cards = [];
  let scope = "leccion";
  let userId = null;
  const flipped = new Set();

  // Curso y lección actuales (variables globales de user.js)
  function getCurrent() {
    try {
      const course = courses[currentCourseId];
      const mod = course.modules[currentModuleIndex];
      return course && mod ? { course, mod } : null;
    } catch { return null; }
  }

  // ---------- Carga ----------
  async function load() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    userId = session.user.id;

    const { data, error } = await db
      .from("flashcards")
      .select("id, module_id, frente, reverso, estado, created_at")
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) { console.error(error); return; }
    cards = data || [];
    render();
  }

  // ---------- Render ----------
  function render() {
    const board = $("#cards-board");
    if (!board) return;

    const cur = getCurrent();
    $("#card-form").style.display = cur ? "" : "none";

    if (!cur) {
      board.innerHTML = `<p class="cards-empty" style="grid-column:1/-1">Selecciona un curso para ver tus tarjetas.</p>`;
      $("#cards-count").textContent = "";
      return;
    }

    const ids = new Set(scope === "leccion" ? [cur.mod.id] : cur.course.modules.map(m => m.id));
    const list = cards.filter(c => ids.has(c.module_id));
    const lessonName = id => cur.course.modules.find(m => m.id === id)?.titulo || "";

    $("#cards-count").textContent = `${list.length} tarjeta${list.length === 1 ? "" : "s"}`;

    board.innerHTML = ESTADOS.map((col, i) => {
      const mine = list.filter(c => c.estado === col.id);
      return `
        <div class="fcol" data-estado="${col.id}">
          <h4>${col.titulo} <span>${mine.length}</span></h4>
          ${mine.map(c => `
            <div class="fcard" draggable="true" data-id="${c.id}">
              ${scope === "curso" ? `<span class="f-lesson">${esc(lessonName(c.module_id))}</span>` : ""}
              <div class="f-front">${esc(c.frente)}</div>
              ${flipped.has(c.id)
                ? `<div class="f-back">${esc(c.reverso)}</div>`
                : `<span class="f-hint">Clic para ver la respuesta</span>`}
              <div class="f-actions">
                ${i > 0 ? `<button type="button" data-act="left" title="Mover atrás">←</button>` : ""}
                ${i < ESTADOS.length - 1 ? `<button type="button" data-act="right" title="Mover adelante">→</button>` : ""}
                <button type="button" data-act="edit" title="Editar">✎</button>
                <button type="button" data-act="del" class="f-del" title="Eliminar">✕</button>
              </div>
            </div>`).join("") || `<p class="cards-empty">Arrastra tarjetas aquí</p>`}
        </div>`;
    }).join("");
  }

  // ---------- Acciones ----------
  async function addCard(frente, reverso) {
    const cur = getCurrent();
    if (!cur || !userId) return false;

    const { data, error } = await db.from("flashcards").insert({
      user_id: userId,
      module_id: cur.mod.id,
      frente, reverso
    }).select("id, module_id, frente, reverso, estado, created_at").single();

    if (error) { console.error(error); toastMsg("No se pudo guardar la tarjeta."); return false; }
    cards.push(data);
    render();
    return true;
  }

  async function moveCard(id, estado) {
    const c = cards.find(x => x.id === id);
    if (!c || c.estado === estado) return;
    const prev = c.estado;
    c.estado = estado;
    render();

    const { error } = await db.from("flashcards").update({ estado }).eq("id", id);
    if (error) {
      console.error(error);
      c.estado = prev;
      render();
      toastMsg("No se pudo mover la tarjeta.");
    }
  }

  async function editCard(id) {
    const c = cards.find(x => x.id === id);
    if (!c) return;
    const frente = prompt("Frente de la tarjeta:", c.frente);
    if (frente === null) return;
    const reverso = prompt("Reverso de la tarjeta:", c.reverso);
    if (reverso === null) return;
    if (!frente.trim() || !reverso.trim()) return toastMsg("Ningún lado puede quedar vacío.");

    const { error } = await db.from("flashcards")
      .update({ frente: frente.trim().slice(0, 300), reverso: reverso.trim().slice(0, 1000) })
      .eq("id", id);
    if (error) { console.error(error); return toastMsg("No se pudo editar."); }

    c.frente = frente.trim().slice(0, 300);
    c.reverso = reverso.trim().slice(0, 1000);
    render();
  }

  async function deleteCard(id) {
    if (!confirm("¿Eliminar esta tarjeta?")) return;
    const { error } = await db.from("flashcards").delete().eq("id", id);
    if (error) { console.error(error); return toastMsg("No se pudo eliminar."); }
    cards = cards.filter(c => c.id !== id);
    render();
  }

  // ---------- Eventos ----------
  document.addEventListener("DOMContentLoaded", () => {
    const board = $("#cards-board");
    if (!board) return;

    // Pestaña propia (independiente de switchTab)
    const tabs = document.querySelectorAll(".module-details-tabs .tab-btn");
    const myBtn = $("#btn-tab-cards");
    myBtn.addEventListener("click", () => {
      document.querySelectorAll(".module-details-tabs .tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".module-details-tabs .tab-content").forEach(t => t.classList.remove("active"));
      myBtn.classList.add("active");
      $("#tab-cards").classList.add("active");
      render();
    });
    tabs.forEach(b => {
      if (b !== myBtn) b.addEventListener("click", () => {
        $("#tab-cards").classList.remove("active");
        myBtn.classList.remove("active");
      });
    });

    // Alcance: lección / todo el curso
    document.querySelectorAll(".cards-scope button").forEach(b => {
      b.addEventListener("click", () => {
        scope = b.dataset.scope;
        document.querySelectorAll(".cards-scope button").forEach(x => x.classList.toggle("active", x === b));
        render();
      });
    });

    // Formulario
    $("#card-form").addEventListener("submit", async e => {
      e.preventDefault();
      const f = $("#card-front"), r = $("#card-back");
      const frente = f.value.trim(), reverso = r.value.trim();
      if (!frente || !reverso) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      if (await addCard(frente, reverso)) { f.value = ""; r.value = ""; f.focus(); }
      btn.disabled = false;
    });

    // Clics sobre las tarjetas (voltear, mover, editar, borrar)
    board.addEventListener("click", e => {
      const el = e.target.closest(".fcard");
      if (!el) return;
      const id = el.dataset.id;
      const act = e.target.closest("[data-act]")?.dataset.act;

      if (!act) {
        flipped.has(id) ? flipped.delete(id) : flipped.add(id);
        return render();
      }
      const c = cards.find(x => x.id === id);
      const i = ESTADOS.findIndex(s => s.id === c?.estado);
      if (act === "left" && i > 0) moveCard(id, ESTADOS[i - 1].id);
      if (act === "right" && i < ESTADOS.length - 1) moveCard(id, ESTADOS[i + 1].id);
      if (act === "edit") editCard(id);
      if (act === "del") deleteCard(id);
    });

    // Arrastrar y soltar
    board.addEventListener("dragstart", e => {
      const el = e.target.closest(".fcard");
      if (!el) return;
      e.dataTransfer.setData("text/plain", el.dataset.id);
      e.dataTransfer.effectAllowed = "move";
      el.classList.add("dragging");
    });
    board.addEventListener("dragend", () => {
      board.querySelectorAll(".dragging, .over").forEach(x => x.classList.remove("dragging", "over"));
    });
    board.addEventListener("dragover", e => {
      const col = e.target.closest(".fcol");
      if (!col) return;
      e.preventDefault();
      board.querySelectorAll(".fcol.over").forEach(x => x !== col && x.classList.remove("over"));
      col.classList.add("over");
    });
    board.addEventListener("drop", e => {
      const col = e.target.closest(".fcol");
      if (!col) return;
      e.preventDefault();
      moveCard(e.dataTransfer.getData("text/plain"), col.dataset.estado);
    });

    // Al cambiar de lección o de curso, se actualiza el tablero
    const title = $("#module-title");
    if (title) {
      new MutationObserver(render).observe(title, { childList: true, characterData: true, subtree: true });
    }

    load();
  });
})();