import { escapeHtml } from "../app/utils.js";
import {
  compareProjectsForPortfolio,
  getProjectCuration,
  getProjectSummary,
  projectCatalog,
  projectCategories,
  projectCurationLanes
} from "../data/projectCatalog.js";
import { renderBadge, renderStatCard } from "./widgetView.js";

const AVAILABILITY_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "demo", label: "Con demo" },
  { id: "case", label: "Con caso" },
  { id: "documented", label: "Documentados" },
  { id: "needs-work", label: "Entorno propio" }
];

const CURATION_FILTERS = [
  { id: "all", label: "Todos" },
  ...projectCurationLanes.map((lane) => ({ id: lane.id, label: lane.label }))
];

const CATEGORY_COPY = {
  "Columna vertebral": "Sistemas que explican la identidad del laboratorio y su capacidad de integracion.",
  "Juegos y experiencias": "Prototipos jugables, experiencias con assets propios y proyectos preservados por valor visual o sistemico.",
  "Simuladores tecnicos": "Herramientas aplicadas donde la interaccion muestra una decision tecnica o de producto.",
  "Ciencia solar y clima": "Modelos, dashboards y documentos reproducibles que requieren entorno cientifico o Python.",
  "Producto y negocio": "MVPs, investigacion de producto, backend y casos con lectura de negocio.",
  "Movil y backend": "Casos Android o integraciones con servicios que conviene evaluar por arquitectura y build.",
  "Exploracion tecnica": "Material que necesita cierre editorial antes de subir de jerarquia."
};

function renderTechList(tech = []) {
  if (!tech.length) {
    return "";
  }

  return `
    <div class="project-tech-list">
      ${tech.map((item) => `<span class="project-tech">${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function renderProjectMedia(project) {
  if (!project.screenshotPath) {
    return "";
  }

  return `
    <div class="project-card__media">
      <img src="${escapeHtml(project.screenshotPath)}" alt="Captura de ${escapeHtml(project.title)}" loading="lazy" />
    </div>
  `;
}

function getPublicationProfile() {
  return typeof window !== "undefined" && window.__MEGAZZONIA_PUBLICATION_PROFILE__ === "hosting"
    ? "hosting"
    : "complete";
}

function isEntryVisibleInCurrentProfile(project) {
  return Boolean(project.entryPath) && !(getPublicationProfile() === "hosting" && project.hosting?.hideEntry);
}

function renderPublicationNotice(project) {
  if (!project.hosting?.hideEntry) {
    return "";
  }

  const isHosting = getPublicationProfile() === "hosting";
  const label = isHosting ? project.hosting.label : "Demo pesada";
  const note = isHosting
    ? project.hosting.note
    : "Incluida en el paquete completo. En la publicacion liviana se muestra como ficha/captura para mantener una carga rapida.";

  return `
    <div class="project-card__publication">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(note)}</span>
    </div>
  `;
}

function renderProjectActions(project) {
  const actions = [];

  if (project.casePath) {
    actions.push(`
      <a class="retro-button is-primary" href="${escapeHtml(project.casePath)}" target="_blank" rel="noopener noreferrer">
        Ver caso
      </a>
    `);
  }

  if (isEntryVisibleInCurrentProfile(project)) {
    actions.push(`
      <a class="retro-button ${project.casePath ? "" : "is-primary"}" href="${escapeHtml(project.entryPath)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(project.actionLabel || "Abrir demo")}
      </a>
    `);
  }

  if (project.readmePath) {
    actions.push(`
      <a class="retro-button" href="${escapeHtml(project.readmePath)}" target="_blank" rel="noopener noreferrer">
        Leer README
      </a>
    `);
  }

  if (!actions.length) {
    return "";
  }

  return `
    <div class="project-card__actions">
      ${actions.join("")}
    </div>
  `;
}

function getFilterState(state = {}) {
  return {
    query: state.projectFilters?.query || "",
    category: state.projectFilters?.category || "all",
    stack: state.projectFilters?.stack || "all",
    availability: state.projectFilters?.availability || "all",
    curation: state.projectFilters?.curation || "all"
  };
}

function getTechOptions() {
  const techSet = new Set();
  projectCatalog.forEach((project) => {
    (project.tech || []).forEach((tech) => techSet.add(tech));
  });
  return [...techSet].sort((a, b) => a.localeCompare(b));
}

function projectMatchesFilters(project, filters) {
  const query = filters.query.trim().toLowerCase();
  const curation = getProjectCuration(project);
  const haystack = [
    project.title,
    project.category,
    project.kind,
    project.status,
    project.description,
    curation.label,
    ...(project.tech || [])
  ].join(" ").toLowerCase();

  const matchesQuery = !query || haystack.includes(query);
  const matchesCategory = filters.category === "all" || project.category === filters.category;
  const matchesStack = filters.stack === "all" || (project.tech || []).includes(filters.stack);
  const matchesCuration = filters.curation === "all" || curation.id === filters.curation;
  const matchesAvailability = filters.availability === "all"
    || (filters.availability === "demo" && isEntryVisibleInCurrentProfile(project))
    || (filters.availability === "case" && Boolean(project.casePath))
    || (filters.availability === "documented" && Boolean(project.readmePath))
    || (filters.availability === "needs-work" && (project.statusTone === "warning" || project.statusTone === "neutral"));

  return matchesQuery && matchesCategory && matchesStack && matchesCuration && matchesAvailability;
}

function renderProjectFilters(filters, visibleCount) {
  const techOptions = getTechOptions();

  return `
    <section class="project-controls" aria-label="Filtros de proyectos">
      <label class="project-control project-control--search">
        <span>Buscar</span>
        <input class="project-search" type="search" value="${escapeHtml(filters.query)}" placeholder="Nombre, tecnologia o tipo" data-project-filter="query" autocomplete="off" />
      </label>
      <label class="project-control">
        <span>Categoria</span>
        <select class="project-select" data-project-filter="category">
          <option value="all" ${filters.category === "all" ? "selected" : ""}>Todas</option>
          ${projectCategories.map((category) => `<option value="${escapeHtml(category)}" ${filters.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
        </select>
      </label>
      <label class="project-control">
        <span>Tecnologia</span>
        <select class="project-select" data-project-filter="stack">
          <option value="all" ${filters.stack === "all" ? "selected" : ""}>Todas</option>
          ${techOptions.map((tech) => `<option value="${escapeHtml(tech)}" ${filters.stack === tech ? "selected" : ""}>${escapeHtml(tech)}</option>`).join("")}
        </select>
      </label>
      <label class="project-control">
        <span>Estado</span>
        <select class="project-select" data-project-filter="availability">
          ${AVAILABILITY_FILTERS.map((filter) => `<option value="${escapeHtml(filter.id)}" ${filters.availability === filter.id ? "selected" : ""}>${escapeHtml(filter.label)}</option>`).join("")}
        </select>
      </label>
      <label class="project-control">
        <span>Madurez</span>
        <select class="project-select" data-project-filter="curation">
          ${CURATION_FILTERS.map((filter) => `<option value="${escapeHtml(filter.id)}" ${filters.curation === filter.id ? "selected" : ""}>${escapeHtml(filter.label)}</option>`).join("")}
        </select>
      </label>
      <div class="project-filter-count">
        <strong>${visibleCount}</strong>
        <span>resultados</span>
      </div>
    </section>
  `;
}

function renderProjectCard(project) {
  const curation = getProjectCuration(project);
  return `
    <article class="project-card project-card--${escapeHtml(curation.id)}">
      ${renderProjectMedia(project)}
      <div class="project-card__head">
        <div>
          <div class="project-card__kind">${escapeHtml(project.kind)}</div>
          <h3>${escapeHtml(project.title)}</h3>
        </div>
        ${renderBadge(project.status, project.statusTone || "neutral")}
      </div>
      <div class="project-card__meta-row">
        ${renderBadge(curation.label, curation.tone)}
        <span>${escapeHtml(project.category)}</span>
      </div>
      <p>${escapeHtml(project.description)}</p>
      ${renderPublicationNotice(project)}
      ${renderTechList(project.tech)}
      ${project.command ? `<div class="project-card__command"><span>Modo:</span><code>${escapeHtml(project.command)}</code></div>` : ""}
      ${renderProjectActions(project)}
    </article>
  `;
}

function renderCategorySection(category, projects) {
  if (!projects.length) {
    return "";
  }

  const sortedProjects = [...projects].sort(compareProjectsForPortfolio);

  return `
    <section class="project-category">
      <div class="project-category__head">
        <div>
          <h2>${escapeHtml(category)}</h2>
          <p>${escapeHtml(CATEGORY_COPY[category] || "Casos, demos y piezas tecnicas agrupadas por especialidad.")}</p>
        </div>
        <div class="project-category__meta">
          ${renderBadge(`${projects.length} proyectos`, "info")}
          ${renderBadge("Curado", "neutral")}
        </div>
      </div>
      <div class="project-grid">
        ${sortedProjects.map(renderProjectCard).join("")}
      </div>
    </section>
  `;
}

function renderEmptyProjectsState() {
  return `
    <section class="panel-card project-empty">
      <div class="panel-card__title">Sin resultados</div>
      <div class="panel-card__body">
        <p>No hay proyectos que coincidan con esos filtros. Cambia la busqueda o vuelve a mostrar todos.</p>
        <button class="retro-button is-primary" data-action="reset-project-filters">Mostrar todos</button>
      </div>
    </section>
  `;
}

export function renderProjectsView(state = {}) {
  const summary = getProjectSummary();
  const filters = getFilterState(state);
  const visibleProjects = projectCatalog
    .filter((project) => projectMatchesFilters(project, filters))
    .sort(compareProjectsForPortfolio);
  const publicationProfile = getPublicationProfile();
  const directDemoCount = projectCatalog.filter(isEntryVisibleInCurrentProfile).length;
  const localOnlyCount = projectCatalog.filter((project) => publicationProfile === "hosting" && project.hosting?.hideEntry).length;

  return `
    <section class="view view-projects">
      <div class="view-head project-view-head">
        <div>
          <div class="eyebrow">Laboratorio Megazzonia</div>
          <h2>Proyectos del laboratorio</h2>
          <p>Catalogo curado por madurez: insignias para primera lectura, demos navegables, casos tecnicos, articulos reproducibles y exploraciones con entorno propio.</p>
        </div>
        <div class="view-head__meta">
          ${renderBadge(`${summary.spotlight} insignias`, "success")}
          ${renderBadge("Estados visibles", "info")}
        </div>
      </div>

      ${renderProjectFilters(filters, visibleProjects.length)}

      <div class="card-grid project-summary-grid">
        ${renderStatCard({ label: "Insignias", value: summary.spotlight, note: "Primera lectura recomendada", tone: "success" })}
        ${renderStatCard({ label: "Demos directas", value: directDemoCount, note: publicationProfile === "hosting" ? "Disponibles en esta version" : "Con enlace navegable", tone: "success" })}
        ${renderStatCard({ label: "Casos", value: summary.caseStudies, note: "Fichas con problema y decisiones", tone: "info" })}
        ${renderStatCard({ label: publicationProfile === "hosting" ? "Preservadas" : "Entorno propio", value: publicationProfile === "hosting" ? localOnlyCount : summary.needsWork, note: publicationProfile === "hosting" ? "Demos completas fuera del hosting" : "Backend, Python, Android o empaquetado", tone: "warning" })}
      </div>

      <section class="panel-card project-note">
        <div class="panel-card__title">Criterio de lectura</div>
        <div class="panel-card__body">
          <p>La jerarquia visible evita poner todos los proyectos al mismo nivel: las insignias muestran la capacidad principal del laboratorio, los casos explican decisiones tecnicas y las exploraciones quedan marcadas hasta tener cierre editorial.</p>
        </div>
      </section>

      ${visibleProjects.length
        ? projectCategories.map((category) => renderCategorySection(
          category,
          visibleProjects.filter((project) => project.category === category)
        )).join("")
        : renderEmptyProjectsState()}
    </section>
  `;
}
