/* java/pagos.js — checkout de cursos y tutorías (demo, sin backend) */
(function () {
  'use strict';
  // ===== Configuración editable =====
  var USD = 3.75;                       // tipo de cambio de ejemplo
  var CUPONES = { ATISJ10: 0.10 };      // código -> % de descuento
  var PLANES = [
    { id: 'sesion', nombre: 'Sesión individual', desc: '1 sesión en vivo de 60 min', n: '1', precio: 40 },
    { id: 'pack4', nombre: 'Pack de 4 sesiones', desc: '4 sesiones 1 a 1, una por semana', n: '4', precio: 140 },
    { id: 'premium', nombre: 'Full-Stack + Mentoría', desc: 'Todo el catálogo + sesiones semanales 1 a 1', n: 'Semanal', precio: 200 }
  ];
  var MENTORES = [
    { id: 'brisseth', nombre: 'Brisseth Trejo', rol: 'Diseño', foto: 'img/teffa.jpeg' },
    { id: 'jerson', nombre: 'Jerson Ruelas', rol: 'HTML', foto: 'img/jerson.png' },
    { id: 'angela', nombre: 'Angela Ochoa', rol: 'Animación', foto: 'img/ange.jpeg' }
  ];
  var HORAS = ['09:00', '11:00', '15:00', '17:00', '19:00'];
  var INCL_CURSO = ['6 lecciones en video (≈1 h)', 'Proyecto final guiado', 'Certificado al finalizar', 'Acceso de por vida', 'Comunidad en Discord'];
  var INCL_TUT = ['Sesión en vivo 1 a 1 de 60 min', 'Revisión de tu código y diseños', 'Mentor a tu elección', 'Reprogramación con 24 h de aviso'];

  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function money(pen) { return $('moneda').value === 'USD' ? '$' + (pen / USD).toFixed(2) : 'S/.' + pen.toFixed(2); }
  function guardados() { try { return JSON.parse(localStorage.getItem('atisj_pagos')) || []; } catch (e) { return []; } }

  var curso = q.get('curso') || '';
  var tutoria = true; // esta página solo cobra tutorías
  var st = { plan: null, mentor: null, fecha: null, hora: null, metodo: 'card', dto: 0, cupon: '' };
  // Precio de los cursos: igual al catálogo (S/.5). Se ignora el parámetro ?precio= de la URL.
  var PRECIO_CURSO = 5, precioCurso = PRECIO_CURSO;

  function plan() { return PLANES.filter(function (p) { return p.id === st.plan; })[0]; }
  function mentor() { return MENTORES.filter(function (m) { return m.id === st.mentor; })[0]; }
  function subtotal() { return tutoria ? (plan() ? plan().precio : 0) : precioCurso; }
  function total() { return subtotal() * (1 - st.dto); }

  // ===== Resumen =====
  function resumen() {
    var sub = subtotal(), l = $('s-lines');
    if (tutoria) {
      var p = plan(), m = mentor();
      $('s-cat').textContent = 'Tutoría 1 a 1';
      $('s-title').textContent = p ? p.nombre : 'Elige tu plan';
      $('s-desc').textContent = p ? p.desc : '';
      l.innerHTML = ''; l.hidden = false;
      [['Mentor', m && m.nombre], ['Fecha', st.fecha && new Date(st.fecha + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })], ['Hora', st.hora]].forEach(function (r) {
        var li = el('li'); li.appendChild(el('span', '', r[0])); li.appendChild(el('span', '', r[1] || '—')); l.appendChild(li);
      });
    }
    $('r-sub').textContent = money(sub);
    $('r-dto-row').hidden = !st.dto;
    $('r-dto').textContent = '-' + money(sub * st.dto);
    $('r-total').textContent = money(total());
    $('btn-pay').textContent = 'Pagar ' + money(total()) + ' ahora';
  }

  // ===== Selector de tutoría =====
  function opciones(cont, lista, key, build) {
    cont.innerHTML = '';
    lista.forEach(function (it) {
      var b = el('button', 'opt'); b.type = 'button';
      b.setAttribute('aria-pressed', st[key] === it.id);
      build(b, it);
      b.onclick = function () { st[key] = it.id; if (key === 'mentor') st.hora = null; pintar(); };
      cont.appendChild(b);
    });
  }
  function ocupado(m, f, h) {
    var s = m + f + h, x = 0;
    for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return x % 4 === 0 || guardados().some(function (p) { return p.tipo === 'tutoria' && p.mentorId === m && p.fecha === f && p.hora === h; });
  }
  function pintar() {
    opciones($('planes'), PLANES, 'plan', function (b, p) { var d = el('div'); d.appendChild(el('strong', '', p.nombre)); d.appendChild(el('small', '', 'S/.' + p.precio)); b.appendChild(d); });
    opciones($('mentores'), MENTORES, 'mentor', function (b, m) {
      var i = el('img'); i.src = m.foto; i.alt = ''; var d = el('div'); d.appendChild(el('strong', '', m.nombre)); d.appendChild(el('small', '', m.rol)); b.appendChild(i); b.appendChild(d);
    });
    var cd = $('dias'), ch = $('horas'), d = new Date(), n = 0; cd.innerHTML = ''; ch.innerHTML = '';
    d.setHours(0, 0, 0, 0);
    while (n < 7) {
      d.setDate(d.getDate() + 1); if (d.getDay() === 0) continue; n++;
      (function (dd) {
        var f = iso(dd), b = el('button', 'dia'); b.type = 'button'; b.setAttribute('aria-pressed', st.fecha === f);
        b.appendChild(el('span', '', dd.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')));
        b.appendChild(el('b', '', String(dd.getDate())));
        b.onclick = function () { st.fecha = f; st.hora = null; pintar(); };
        cd.appendChild(b);
      })(new Date(d));
    }
    var ok = st.mentor && st.fecha;
    $('hint').textContent = ok ? 'Los horarios tachados ya están reservados.' : 'Elige mentor y día para ver los horarios.';
    if (ok) HORAS.forEach(function (h) {
      var b = el('button', 'hora', h); b.type = 'button'; b.disabled = ocupado(st.mentor, st.fecha, h);
      b.setAttribute('aria-pressed', st.hora === h); b.onclick = function () { st.hora = h; pintar(); }; ch.appendChild(b);
    });
    resumen();
  }

  // ===== Método, moneda, cupón =====
  document.querySelectorAll('.tab').forEach(function (t) {
    t.onclick = function () {
      st.metodo = t.dataset.m;
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === t); });
      ['card', 'yape'].forEach(function (m) { $('p-' + m).hidden = m !== st.metodo; });
      if (st.metodo === 'yape') $('moneda').value = 'PEN'; // Yape/Plin solo soles
      $('moneda').querySelector('[value=USD]').disabled = st.metodo === 'yape';
      resumen();
    };
  });
  $('moneda').onchange = resumen;
  $('btn-cupon').onclick = function () {
    var c = $('cupon').value.trim().toUpperCase(), m = $('cmsg');
    if (CUPONES[c]) { st.dto = CUPONES[c]; st.cupon = c; m.textContent = 'Cupón aplicado: ' + Math.round(st.dto * 100) + '% de descuento.'; m.className = 'cmsg ok'; }
    else { st.dto = 0; st.cupon = ''; m.textContent = c ? 'Cupón no válido.' : 'Escribe un cupón.'; m.className = 'cmsg bad'; }
    resumen();
  };

  // ===== Formato de campos =====
  $('card').oninput = function () { this.value = this.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); };
  $('exp').oninput = function () { var v = this.value.replace(/\D/g, '').slice(0, 4); this.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; };
  ['cvc', 'op'].forEach(function (i) { $(i).oninput = function () { this.value = this.value.replace(/\D/g, ''); }; });

  // ===== Pasos =====
  function paso(n) { document.querySelectorAll('#stepper li').forEach(function (li, i) { li.classList.toggle('on', i < n); }); }
  function datosOk() { return $('nombre').value.trim().length >= 3 && /^\S+@\S+\.\S+$/.test($('correo').value); }
  ['nombre', 'correo'].forEach(function (i) { $(i).addEventListener('input', function () { paso(datosOk() ? 2 : 1); }); });

  // ===== Validación =====
  function luhn(n) { var s = 0, a = false; for (var i = n.length - 1; i >= 0; i--) { var d = +n[i]; if (a) { d *= 2; if (d > 9) d -= 9; } s += d; a = !a; } return s % 10 === 0; }
  function e(id, inp, msg) { $('e-' + id).textContent = msg || ''; $(inp).setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg; }
  function validar() {
    var ok = true, s = $('status'); s.hidden = true;
    ok = e('nombre', 'nombre', $('nombre').value.trim().length < 3 ? 'Escribe tu nombre completo.' : '') && ok;
    ok = e('correo', 'correo', /^\S+@\S+\.\S+$/.test($('correo').value) ? '' : 'Correo no válido.') && ok;
    if (st.metodo === 'card') {
      var num = $('card').value.replace(/\s/g, ''), m = /^(\d{2})\/(\d{2})$/.exec($('exp').value);
      ok = e('titular', 'titular', $('titular').value.trim().length < 3 ? 'Nombre del titular.' : '') && ok;
      ok = e('card', 'card', /^\d{13,16}$/.test(num) && luhn(num) ? '' : 'Número de tarjeta no válido.') && ok;
      ok = e('exp', 'exp', m && +m[1] >= 1 && +m[1] <= 12 && new Date(2000 + +m[2], +m[1], 1) > new Date() ? '' : 'Fecha inválida o vencida.') && ok;
      ok = e('cvc', 'cvc', /^\d{3,4}$/.test($('cvc').value) ? '' : 'CVC inválido.') && ok;
    } else if (st.metodo === 'yape') {
      ok = e('op', 'op', /^\d{6,10}$/.test($('op').value) ? '' : 'Ingresa el código de operación.') && ok;
    }
    if (tutoria && !(st.plan && st.mentor && st.fecha && st.hora)) {
      s.textContent = 'Elige plan, mentor, día y hora de tu tutoría.'; s.hidden = false; ok = false; $('tut').scrollIntoView({ behavior: 'smooth' });
    }
    return ok;
  }

  // ===== Envío =====
  $('pay-form').onsubmit = function (ev) {
    ev.preventDefault();
    if (!validar()) return;
    var b = $('btn-pay'); b.disabled = true; b.textContent = 'Procesando…'; paso(2);
    setTimeout(function () {
      var p = plan(), m = mentor(), metodo = { card: 'Tarjeta •••• ' + $('card').value.replace(/\s/g, '').slice(-4), yape: 'Yape / Plin' }[st.metodo];
      var r = { id: 'ATIS-' + Date.now().toString(36).toUpperCase(), tipo: tutoria ? 'tutoria' : 'curso', cursoId: q.get('cursoId') || null,
        concepto: tutoria ? p.nombre : (curso || 'Curso'), comprador: $('nombre').value.trim(), correo: $('correo').value.trim(), metodo: metodo,
        total: total(), moneda: $('moneda').value, estado: 'Pagado', pagadoEn: new Date().toISOString() }; // no se guarda número de tarjeta ni CVC
      if (tutoria) { r.mentorId = m.id; r.mentor = m.nombre; r.fecha = st.fecha; r.hora = st.hora; }
      try { var l = guardados(); l.push(r); localStorage.setItem('atisj_pagos', JSON.stringify(l)); } catch (x) {}
      confirmar(r);
    }, 1200);
  };
  function confirmar(r) {
    $('co-grid').hidden = true; $('ok').hidden = false; paso(3);
    $('ok-msg').textContent = r.tipo === 'tutoria' ? 'Tu tutoría quedó reservada. Te enviaremos los detalles a ' + r.correo + '.' : 'Tu curso ya está activo. Enviamos el comprobante a ' + r.correo + '.';
    var f = [['N.º de operación', r.id], ['Concepto', r.concepto], ['Comprador', r.comprador]];
    if (r.mentor) f.push(['Mentor', r.mentor], ['Fecha y hora', r.fecha + ' · ' + r.hora]);
    f.push(['Método', r.metodo], ['Total', (r.moneda === 'USD' ? '$' + (r.total / USD).toFixed(2) : 'S/.' + r.total.toFixed(2)) + ' ' + r.moneda]);
    var dl = $('rec'); dl.innerHTML = '';
    f.forEach(function (x) { dl.appendChild(el('dt', '', x[0])); dl.appendChild(el('dd', '', x[1])); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== Inicio =====
  var incl = tutoria ? INCL_TUT : INCL_CURSO;
  incl.forEach(function (t) { $('s-incl').appendChild(el('li', '', t)); });
  if (tutoria) {
    $('tut').hidden = false;
    st.plan = q.get('plan') || (parseFloat(q.get('precio')) === 200 || /full-stack/i.test(curso) ? 'premium' : 'sesion');
    pintar();
  } else {
    $('s-title').textContent = curso || 'Curso ATIS-J';
    $('s-cat').textContent = q.get('categoria') || 'Curso';
    $('s-desc').textContent = q.get('desc') || '';
    if (q.get('img')) { var im = $('s-img'); im.src = q.get('img'); im.onerror = function () { im.onerror = null; im.src = 'img/general.png'; }; }
    resumen();
  }
})();
