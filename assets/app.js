/* global RODAMOS_CONFIG */
(function () {
  const AGENDA_KEY = "rodamos_agenda_v1";

  function qs(id) { return document.getElementById(id); }

  function setStatus(el, msg, show = true) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = show ? "block" : "none";
  }

  function parseCsv(text) {
    // Minimal CSV parser that supports quoted values and commas/newlines.
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
        if (ch === '"') { inQuotes = false; continue; }
        cur += ch;
        continue;
      }
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === ",") { row.push(cur); cur = ""; continue; }
      if (ch === "\r") { continue; }
      if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; continue; }
      cur += ch;
    }
    row.push(cur);
    rows.push(row);
    return rows;
  }

  function normalizeHeader(h) {
    return (h || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "_");
  }

  function toIsoDate(value) {
    if (!value) return "";
    const s = String(value).trim();
    // Expect YYYY-MM-DD or timestamp-like.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Try parse: DD/MM/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = String(m[1]).padStart(2, "0");
      const mm = String(m[2]).padStart(2, "0");
      return `${m[3]}-${mm}-${dd}`;
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function getAgenda() {
    try {
      const raw = localStorage.getItem(AGENDA_KEY);
      if (!raw) return [];
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  }

  function setAgenda(ids) {
    localStorage.setItem(AGENDA_KEY, JSON.stringify(ids));
  }

  function toggleAgenda(id) {
    const ids = getAgenda();
    const idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
      setAgenda(ids);
      return false;
    }
    ids.push(id);
    setAgenda(ids);
    return true;
  }

  function uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
  }

  function formatDayTitle(isoDate) {
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", weekday: "long" });
  }

  function makeEventId(e) {
    // Stable-ish ID from key fields (works across reloads)
    return [
      e.nombre_evento || e.nombre || "",
      e.fecha || "",
      e.ciudad || e.comuna || "",
      e.region || "",
      e.tipo || ""
    ].join("|").toLowerCase();
  }

  function pick(obj, keys) {
    for (const k of keys) {
      if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
    }
    return "";
  }

  function mapRowToEvent(rowObj) {
    const rawDate = pick(rowObj, ["fecha", "date", "start_date"]);
    const fecha = toIsoDate(rawDate);

    const event = {
      nombre: pick(rowObj, ["nombre_del_evento", "nombre_evento", "evento", "nombre", "title"]),
      fecha,
      region: pick(rowObj, ["region"]),
      tipo: pick(rowObj, ["tipo", "type"]),
      ciudad: pick(rowObj, ["comuna_ciudad", "comuna", "ciudad", "city"]),
      distancias: pick(rowObj, ["distancias", "distancia", "distance"]),
      hora: pick(rowObj, ["hora", "time", "start_time"]),
      precio: pick(rowObj, ["precio", "price"]),
      link: pick(rowObj, ["link_inscripcion", "inscripcion", "registration_url", "link"])
    };
    event.id = makeEventId({
      nombre_evento: event.nombre,
      fecha: event.fecha,
      ciudad: event.ciudad,
      region: event.region,
      tipo: event.tipo
    });
    return event;
  }

  async function fetchEvents(statusEl) {
    const url = (window.RODAMOS_CONFIG && window.RODAMOS_CONFIG.sheetsCsvUrl) ? window.RODAMOS_CONFIG.sheetsCsvUrl : "";
    const demo = (window.RODAMOS_CONFIG && Array.isArray(window.RODAMOS_CONFIG.demoEvents)) ? window.RODAMOS_CONFIG.demoEvents : [];
    const demoEvents = demo.map((d) => {
      const ev = {
        nombre: String(d.nombre || "").trim(),
        fecha: toIsoDate(d.fecha),
        region: String(d.region || "").trim(),
        tipo: String(d.tipo || "").trim(),
        ciudad: String(d.ciudad || "").trim(),
        distancias: String(d.distancias || "").trim(),
        hora: String(d.hora || "").trim(),
        precio: String(d.precio || "").trim(),
        link: String(d.link || "").trim()
      };
      ev.id = makeEventId({
        nombre_evento: ev.nombre,
        fecha: ev.fecha,
        ciudad: ev.ciudad,
        region: ev.region,
        tipo: ev.tipo
      });
      return ev;
    }).filter((e) => e.nombre && e.fecha);

    if (!url || url.includes("PASTE_YOUR")) {
      if (demoEvents.length) {
        setStatus(statusEl, "Mostrando eventos DEMO (falta configurar Google Sheets en assets/config.js).", true);
        return demoEvents;
      }
      setStatus(statusEl, "Falta configurar el link de Google Sheets en assets/config.js", true);
      return [];
    }

    setStatus(statusEl, "Cargando eventos…", true);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      setStatus(statusEl, "No se pudo cargar Google Sheets. Revisa que esté “Publicado en la web” como CSV.", true);
      return demoEvents;
    }
    const text = await res.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setStatus(statusEl, "La planilla no tiene datos aún. Publica tu primer evento.", true);
      return [];
    }

    const headers = rows[0].map(normalizeHeader);
    const events = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.every((x) => String(x || "").trim() === "")) continue;
      const obj = {};
      for (let c = 0; c < headers.length; c++) obj[headers[c]] = (r[c] || "").trim();
      const ev = mapRowToEvent(obj);
      if (!ev.nombre || !ev.fecha) continue;
      events.push(ev);
    }

    const merged = [...demoEvents, ...events];
    const seen = new Set();
    const unique = [];
    for (const e of merged) {
      if (!e.id) continue;
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      unique.push(e);
    }

    unique.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    setStatus(statusEl, "", false);
    return unique;
  }

  function applyFilters(events) {
    const region = (qs("filter-region")?.value || "").trim();
    const tipo = (qs("filter-type")?.value || "").trim();
    const q = (qs("filter-q")?.value || "").trim().toLowerCase();
    const from = (qs("filter-from")?.value || "").trim();
    const to = (qs("filter-to")?.value || "").trim();

    return events.filter((e) => {
      if (region && e.region !== region) return false;
      if (tipo && e.tipo !== tipo) return false;
      if (q) {
        const hay = `${e.nombre} ${e.ciudad} ${e.region} ${e.tipo} ${e.distancias}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (from && e.fecha < from) return false;
      if (to && e.fecha > to) return false;
      return true;
    });
  }

  function renderSelectOptions(selectEl, values) {
    if (!selectEl) return;
    const current = selectEl.value;
    const base = selectEl.querySelector("option[value='']") ? selectEl.querySelector("option[value='']") : null;
    selectEl.innerHTML = "";
    if (base) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = base.textContent;
      selectEl.appendChild(opt);
    } else {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Todos";
      selectEl.appendChild(opt);
    }
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
    if (current) selectEl.value = current;
  }

  function renderCalendar(el, events, showAgendaButton = true) {
    if (!el) return;
    if (!events.length) {
      el.innerHTML = `<div class="alert">No hay eventos para mostrar con estos filtros.</div>`;
      return;
    }
    const byDay = new Map();
    events.forEach((e) => {
      if (!byDay.has(e.fecha)) byDay.set(e.fecha, []);
      byDay.get(e.fecha).push(e);
    });
    const days = Array.from(byDay.keys()).sort();

    const agenda = getAgenda();
    el.innerHTML = days.map((d) => {
      const items = byDay.get(d).map((e) => {
        const inAgenda = agenda.includes(e.id);
        const actions = [];
        if (e.link) actions.push(`<a class="btn" href="${escapeHtmlAttr(e.link)}" target="_blank" rel="noopener noreferrer">Inscribirme</a>`);
        if (showAgendaButton) actions.push(`<button class="btn ${inAgenda ? "btn--ghost" : ""}" data-agenda="${escapeHtmlAttr(e.id)}">${inAgenda ? "Quitar de mi agenda" : "Agendar"}</button>`);
        return `
          <div class="event">
            <div>
              <div><strong>${escapeHtml(e.nombre)}</strong> <span class="muted">${e.tipo ? "— " + escapeHtml(e.tipo) : ""}</span></div>
              <div class="muted">${escapeHtml([e.ciudad, e.distancias].filter(Boolean).join(" · "))}</div>
            </div>
            <div class="event__meta">
              ${e.hora ? `<div class="muted">${escapeHtml(e.hora)}</div>` : ""}
              ${e.precio ? `<div class="muted">${escapeHtml(e.precio)}</div>` : ""}
              <div class="event__actions">
                <a class="btn btn--ghost" href="./index.html#event=${encodeURIComponent(e.id)}">Ver</a>
                ${actions.join("")}
              </div>
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="day">
          <div class="day__title">${escapeHtml(formatDayTitle(d))}</div>
          <div class="card">
            <div class="card__body">${items}</div>
          </div>
        </div>
      `;
    }).join("");

    el.querySelectorAll("[data-agenda]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-agenda");
        const nowIn = toggleAgenda(id);
        btn.classList.toggle("btn--ghost", nowIn);
        btn.textContent = nowIn ? "Quitar de mi agenda" : "Agendar";
      });
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  function escapeHtmlAttr(s) { return escapeHtml(s); }

  async function initIndexPage() {
    const yearEl = qs("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const statusEl = qs("status");
    const calendarEl = qs("calendar");

    const events = await fetchEvents(statusEl);

    const regions = uniq(events.map((e) => e.region));
    const tipos = uniq(events.map((e) => e.tipo));
    renderSelectOptions(qs("filter-region"), regions);
    renderSelectOptions(qs("filter-type"), tipos);

    function rerender() {
      const filtered = applyFilters(events);
      renderCalendar(calendarEl, filtered, true);
    }
    qs("btn-apply")?.addEventListener("click", rerender);
    rerender();
  }

  async function renderAgendaPage() {
    const statusEl = qs("agenda-status");
    const root = qs("agenda");
    const btnClear = qs("btn-clear");

    const ids = getAgenda();
    if (!ids.length) {
      setStatus(statusEl, "Aún no tienes eventos en tu agenda.", true);
      if (root) root.innerHTML = "";
    } else {
      const events = await fetchEvents(statusEl);
      const mine = events.filter((e) => ids.includes(e.id));
      renderCalendar(root, mine, true);
      if (!mine.length) setStatus(statusEl, "Tu agenda tiene eventos, pero no se encontraron en la planilla (quizás cambiaron los datos).", true);
    }

    btnClear?.addEventListener("click", () => {
      setAgenda([]);
      setStatus(statusEl, "Agenda vaciada.", true);
      if (root) root.innerHTML = "";
    });
  }

  window.RodamosApp = {
    initIndexPage,
    renderAgendaPage
  };

  // Auto-init for index
  if (typeof window.RODAMOS_PAGE === "undefined" && qs("calendar")) {
    initIndexPage();
  }
})();

