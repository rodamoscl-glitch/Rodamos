// Configuración del sitio (cambia SOLO estos links)
window.RODAMOS_CONFIG = {
  // URL del CSV "publicado" de Google Sheets (File → Share → Publish to web → CSV)
  // Debe incluir el parámetro: output=csv
  sheetsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5nnSuKrJMhs1T9T8OzPDF5VdbYvVwxScDnBlFS42SOPqU3qehu4g36UDb0GBBptyH8U_WtiS7x4jg/pub?gid=386233126&single=true&output=csv",

  // Link del Google Form para “Publica eventos”
  formUrl: "https://docs.google.com/forms/d/1I7krSrJiyV47Bm2sKVIkaTgi0Sd_jzyOjBXVC-p17Yw/edit",

  // 5 eventos DEMO (se muestran además de lo que venga en Google Sheets)
  demoEvents: [
    { nombre: "DEMO — Gran Fondo Rodamos Santiago", fecha: "2026-04-12", region: "Metropolitana", tipo: "Ruta", ciudad: "Santiago", distancias: "60k, 100k", hora: "08:00", precio: "$20.000", link: "https://rodamos.cl" },
    { nombre: "DEMO — MTB XCO Bosque Peñalolén", fecha: "2026-04-19", region: "Metropolitana", tipo: "MTB / XCO", ciudad: "Santiago, Peñalolén", distancias: "XCO 25k", hora: "09:30", precio: "Gratis", link: "https://rodamos.cl" },
    { nombre: "DEMO — Gravel Costa Valparaíso", fecha: "2026-05-03", region: "Valparaíso", tipo: "Gravel", ciudad: "Valparaíso", distancias: "40k, 80k", hora: "07:45", precio: "Desde $15.000", link: "https://rodamos.cl" },
    { nombre: "DEMO — Enduro Cerro La Gruta", fecha: "2026-05-17", region: "O'Higgins", tipo: "Downhill / Enduro", ciudad: "Quinta de Tilcoco", distancias: "3 especiales", hora: "10:00", precio: "$18.000", link: "https://rodamos.cl" },
    { nombre: "DEMO — Crit Pista / Calle Nocturno", fecha: "2026-05-31", region: "Biobío", tipo: "Pista", ciudad: "Concepción", distancias: "45 min", hora: "20:30", precio: "$10.000", link: "https://rodamos.cl" }
  ]
};

