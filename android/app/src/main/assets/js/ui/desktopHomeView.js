import { escapeHtml } from "../app/utils.js";
import { getProjectCuration, getProjectSummary, projectCatalog, projectCurationLanes } from "../data/projectCatalog.js";
import { renderBadge, renderStatCard } from "./widgetView.js";

const FEATURED_PROJECT_IDS = [
  "data-analyst-career-simulator",
  "drone-factory",
  "motorcraft-codex-2",
  "flight-simulator",
  "heat-sink",
  "analisis-estructural",
  "roi-analytics-android"
];

const CAPABILITIES = [
  {
    title: "Simuladores aplicados",
    body: "Herramientas interactivas para datos, energia, estructuras, calor, vuelo y sistemas tecnicos.",
    tags: ["React/Vite", "Three.js", "Canvas", "SQL"]
  },
  {
    title: "Producto y evidencia",
    body: "Cada pieza fuerte prioriza problema, decision, resultado verificable y forma clara de reproduccion.",
    tags: ["Casos", "QA", "Capturas", "README"]
  },
  {
    title: "Datos y backend",
    body: "SQL en navegador, Streamlit, modelos solares, analisis de producto, APIs y pipelines reproducibles.",
    tags: ["Python", "FastAPI", "SQL", "Streamlit"]
  },
  {
    title: "Juegos y experiencias",
    body: "Prototipos jugables con loops propios, assets, audio, progresion y empaquetado para revision local.",
    tags: ["Game loops", "Sprites", "Audio", "Procedural"]
  }
];

const PLATFORM_UPGRADES = [
  {
    title: "Jerarquia editorial",
    body: "Los proyectos insignia abren la lectura; los experimentos y piezas de entorno propio quedan en segundo plano."
  },
  {
    title: "Estados honestos",
    body: "Cada tarjeta distingue demo web, caso tecnico, articulo, demo local o exploracion sin prometer mas madurez."
  },
  {
    title: "Evidencia antes que volumen",
    body: "Las capturas y fichas de los proyectos fuertes pesan mas que publicar todos los prototipos con igual jerarquia."
  },
  {
    title: "Hosting liviano",
    body: "La version publica conserva carga rapida; las demos pesadas quedan preservadas en el paquete completo local."
  }
];

const DELIVERY_FLOW = [
  "Curaduria",
  "Evidencia",
  "Demo",
  "Caso",
  "QA"
];

function getFeaturedProjects() {
  return FEATURED_PROJECT_IDS
    .map((projectId) => projectCatalog.find((project) => project.id === projectId))
    .filter(Boolean);
}

function renderTagList(tags = []) {
  return `
    <div class="portfolio-tags">
      ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function renderProjectMedia(project) {
  if (!project.screenshotPath) {
    return "";
  }

  return `
    <div class="portfolio-project__media">
      <img src="${escapeHtml(project.screenshotPath)}" alt="Captura de ${escapeHtml(project.title)}" loading="lazy" />
    </div>
  `;
}

function renderCurationLane(lane) {
  return `
    <article class="portfolio-lane-card">
      <div class="portfolio-lane-card__head">
        ${renderBadge(lane.label, lane.tone)}
        <strong>${escapeHtml(lane.title)}</strong>
      </div>
      <p>${escapeHtml(lane.body)}</p>
    </article>
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
  return `
    <div class="portfolio-project__publication">
      <strong>${escapeHtml(isHosting ? "Demo completa local" : "Demo pesada")}</strong>
      <span>${escapeHtml(isHosting
        ? "Esta publicacion muestra el caso y captura; la experiencia interactiva se conserva en el paquete completo."
        : "En la publicacion liviana se presenta como ficha/captura para mantener la carga rapida.")}</span>
    </div>
  `;
}

function renderFeaturedProject(project) {
  const lane = getProjectCuration(project);
  return `
    <article class="portfolio-project portfolio-project--${escapeHtml(lane.id)}">
      ${renderProjectMedia(project)}
      <div class="portfolio-project__head">
        <div>
          <div class="portfolio-project__kind">${escapeHtml(project.kind)}</div>
          <h3>${escapeHtml(project.title)}</h3>
        </div>
        ${renderBadge(project.status, project.statusTone || "neutral")}
      </div>
      <div class="portfolio-project__curation">
        ${renderBadge(lane.label, lane.tone)}
        <span>${escapeHtml(project.category)}</span>
      </div>
      <p>${escapeHtml(project.description)}</p>
      ${renderPublicationNotice(project)}
      ${renderTagList(project.tech)}
      <div class="portfolio-project__actions">
        ${project.casePath ? `<a class="retro-button is-primary" href="${escapeHtml(project.casePath)}" target="_blank" rel="noopener noreferrer">Ver caso</a>` : ""}
        ${isEntryVisibleInCurrentProfile(project) ? `<a class="retro-button ${project.casePath ? "" : "is-primary"}" href="${escapeHtml(project.entryPath)}" target="_blank" rel="noopener noreferrer">Abrir demo</a>` : ""}
        ${project.readmePath ? `<a class="retro-button" href="${escapeHtml(project.readmePath)}" target="_blank" rel="noopener noreferrer">Ver ficha</a>` : ""}
        ${project.command && !project.entryPath ? `<span class="portfolio-project__command">${escapeHtml(project.command)}</span>` : ""}
      </div>
    </article>
  `;
}

function renderCapabilityCard(capability) {
  return `
    <article class="portfolio-capability">
      <h3>${escapeHtml(capability.title)}</h3>
      <p>${escapeHtml(capability.body)}</p>
      ${renderTagList(capability.tags)}
    </article>
  `;
}

function renderPlatformUpgrade(upgrade) {
  return `
    <article class="portfolio-upgrade-card">
      <h3>${escapeHtml(upgrade.title)}</h3>
      <p>${escapeHtml(upgrade.body)}</p>
    </article>
  `;
}

function renderDeliveryFlow() {
  return `
    <div class="portfolio-flow">
      ${DELIVERY_FLOW.map((step, index) => `
        <div class="portfolio-flow__step">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(step)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCategoryOverview() {
  const counts = projectCatalog.reduce((acc, project) => {
    acc[project.category] = (acc[project.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([category, count]) => `
      <div class="portfolio-category-row">
        <span>${escapeHtml(category)}</span>
        <strong>${count}</strong>
      </div>
    `)
    .join("");
}

function isSimulatorState(state) {
  return Boolean(state?.missions && state?.analysis && state?.files);
}

function getVisibleThreads(state) {
  return (state?.mail?.threads || []).filter((thread) => !thread.missionId || state.missions?.states?.[thread.missionId]?.isVisible);
}

function getSimulatorStatus(state) {
  if (state.report?.lastSubmission) {
    return {
      title: "Entrega enviada",
      body: "El primer ciclo ya genero feedback y evidencia de trabajo analitico.",
      primaryNav: "career",
      primaryLabel: "Ver carrera"
    };
  }

  if (state.terminal?.lastResult) {
    return {
      title: "Analisis listo",
      body: "Ya hay resultados SQL. Convierte el hallazgo en una respuesta ejecutiva.",
      primaryNav: "report",
      primaryLabel: "Preparar reporte"
    };
  }

  if (state.analysis?.databaseReady) {
    return {
      title: "Dataset preparado",
      body: "La base esta cargada. Ejecuta la consulta y valida el resultado antes de informar.",
      primaryNav: "terminal",
      primaryLabel: "Abrir SQL"
    };
  }

  if (state.missions?.activeId) {
    return {
      title: "Mision aceptada",
      body: "Revisa los archivos asignados y confirma que el dataset quedo listo para analizar.",
      primaryNav: "files",
      primaryLabel: "Revisar archivos"
    };
  }

  return {
    title: "Solicitud pendiente",
    body: "Empieza como analista junior: abre el correo, entiende el pedido y acepta la mision comercial.",
    primaryNav: "inbox",
    primaryLabel: "Abrir correo"
  };
}

function renderSimulatorStep({ index, title, body, view, active }) {
  return `
    <article class="${active ? "sim-step is-active" : "sim-step"}">
      <span class="sim-step__index">${String(index).padStart(2, "0")}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      <button class="retro-button" data-nav="${escapeHtml(view)}">Abrir</button>
    </article>
  `;
}

function renderSimulatorHome(state) {
  const visibleThreads = getVisibleThreads(state);
  const unreadCount = visibleThreads.filter((thread) => thread.unread).length;
  const status = getSimulatorStatus(state);
  const activeMission = state.missions?.catalog?.find((mission) => mission.id === state.missions.activeId) || null;
  const activeStep = state.report?.lastSubmission
    ? "career"
    : state.terminal?.lastResult
      ? "report"
      : state.analysis?.databaseReady
        ? "terminal"
        : state.missions?.activeId
          ? "files"
          : "inbox";
  const steps = [
    {
      index: 1,
      title: "Correo",
      body: "Lee el pedido, detecta objetivo de negocio y acepta la mision correcta.",
      view: "inbox"
    },
    {
      index: 2,
      title: "Archivos",
      body: "Revisa CSV, schema y notas de calidad antes de consultar datos.",
      view: "files"
    },
    {
      index: 3,
      title: "SQL",
      body: "Ejecuta la consulta base, reutiliza historial y corrige errores.",
      view: "terminal"
    },
    {
      index: 4,
      title: "Reporte",
      body: "Convierte el resultado en una recomendacion ejecutiva validable.",
      view: "report"
    }
  ];

  return `
    <section class="view view-home view-simulator-home">
      <div class="sim-home-hero">
        <div class="sim-home-hero__content">
          <div class="eyebrow">Simulador profesional</div>
          <h1>Data Analyst Career Simulator</h1>
          <p>${escapeHtml(status.body)}</p>
          <div class="portfolio-hero__actions">
            <button class="retro-button is-primary" data-nav="${escapeHtml(status.primaryNav)}">${escapeHtml(status.primaryLabel)}</button>
            <button class="retro-button" data-action="open-onboarding">Guia rapida</button>
          </div>
        </div>
        <div class="sim-command-panel">
          <div class="portfolio-panel-title">${escapeHtml(status.title)}</div>
          <div class="portfolio-panel-metric">
            <span>Hora simulada</span>
            <strong>${escapeHtml(state.sim?.timeLabel || "08:40")}</strong>
          </div>
          <div class="portfolio-panel-metric">
            <span>Correo pendiente</span>
            <strong>${unreadCount}</strong>
          </div>
          <div class="portfolio-panel-metric">
            <span>Mision activa</span>
            <strong>${activeMission ? "1" : "0"}</strong>
          </div>
          <div class="portfolio-panel-note">${escapeHtml(activeMission?.title || "Primera solicitud comercial lista para revisar.")}</div>
        </div>
      </div>

      <div class="card-grid portfolio-summary-grid">
        ${renderStatCard({ label: "Prestigio", value: state.player?.prestige || 0, note: "Sube con entregas claras y a tiempo", tone: "success" })}
        ${renderStatCard({ label: "Tecnica", value: state.player?.technicalScore || 0, note: "SQL, calidad de datos y validacion", tone: "info" })}
        ${renderStatCard({ label: "Dataset", value: state.analysis?.databaseReady ? "Listo" : "Pendiente", note: state.analysis?.databaseReady ? "SQLite cargado en navegador" : "Se desbloquea al aceptar mision", tone: state.analysis?.databaseReady ? "success" : "warning" })}
        ${renderStatCard({ label: "Entrega", value: state.report?.lastSubmission ? "Enviada" : "Abierta", note: "Cierra el ciclo desde Reporte", tone: state.report?.lastSubmission ? "success" : "neutral" })}
      </div>

      <section class="portfolio-section">
        <div class="portfolio-section__head">
          <div>
            <div class="eyebrow">Flujo de trabajo</div>
            <h2>Ruta del analista</h2>
          </div>
          <button class="retro-button" data-action="reset-simulator-progress">Reiniciar progreso</button>
        </div>
        <div class="sim-step-grid">
          ${steps.map((step) => renderSimulatorStep({ ...step, active: activeStep === step.view })).join("")}
        </div>
      </section>
    </section>
  `;
}

export function renderDesktopHome(state = {}) {
  if (isSimulatorState(state)) {
    return renderSimulatorHome(state);
  }

  const summary = getProjectSummary();
  const featuredProjects = getFeaturedProjects();
  const publicationProfile = getPublicationProfile();
  const directDemoCount = projectCatalog.filter(isEntryVisibleInCurrentProfile).length;

  return `
    <section class="view view-home view-portfolio">
      <div class="portfolio-hero">
        <div class="portfolio-hero__content">
          <div class="eyebrow">Blog-portafolio tecnico</div>
          <h1>Laboratorio Megazzonia</h1>
          <p>
            Laboratorio de software aplicado: simuladores, juegos, herramientas de datos, Android y ciencia computacional.
            La publicacion prioriza proyectos con evidencia, casos claros y estado tecnico honesto.
          </p>
          <div class="portfolio-hero__actions">
            <button class="retro-button is-primary" data-nav="projects">Explorar proyectos</button>
            <button class="retro-button" data-nav="projects">Ver proyectos insignia</button>
          </div>
        </div>
        <div class="portfolio-hero__panel">
          <div class="portfolio-panel-title">Estado editorial</div>
          <div class="portfolio-panel-metric">
            <span>Insignias</span>
            <b class="portfolio-panel-value">${summary.spotlight}</b>
          </div>
          <div class="portfolio-panel-metric">
            <span>Demos web directas</span>
            <b class="portfolio-panel-value">${directDemoCount}</b>
          </div>
          <div class="portfolio-panel-metric">
            <span>Casos con ficha</span>
            <b class="portfolio-panel-value">${summary.caseStudies}</b>
          </div>
          <div class="portfolio-panel-note">${publicationProfile === "hosting"
            ? "Version hosting: foco en lectura publica, capturas, fichas y demos livianas; las experiencias pesadas quedan preservadas."
            : "Paquete completo: conserva demos pesadas, casos tecnicos, capturas y evidencias navegables locales."}</div>
        </div>
      </div>

      <div class="card-grid portfolio-summary-grid">
        ${renderStatCard({ label: "Insignias", value: summary.spotlight, note: "Proyectos para primera lectura", tone: "success" })}
        ${renderStatCard({ label: "Demos", value: directDemoCount, note: "Navegables en esta publicacion", tone: "info" })}
        ${renderStatCard({ label: "Documentados", value: summary.documented, note: "README, ficha o caso tecnico", tone: "neutral" })}
        ${renderStatCard({ label: "A curar", value: summary.incubation, note: "Exploracion o entorno pendiente", tone: "warning" })}
      </div>

      <section class="portfolio-section">
        <div class="portfolio-section__head">
          <div>
            <div class="eyebrow">Seleccion curada</div>
            <h2>Proyectos destacados</h2>
          </div>
          <button class="retro-button" data-nav="projects">Ver catalogo completo</button>
        </div>
        <div class="portfolio-featured-grid">
          ${featuredProjects.map(renderFeaturedProject).join("")}
        </div>
      </section>

      <div class="portfolio-workgrid">
        <section class="panel-card">
          <div class="panel-card__title">Mapa de capacidades</div>
          <div class="panel-card__body portfolio-capability-grid">
            ${CAPABILITIES.map(renderCapabilityCard).join("")}
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-card__title">Categorias del portfolio</div>
          <div class="panel-card__body">
            <div class="portfolio-category-list">
              ${renderCategoryOverview()}
            </div>
          </div>
        </section>
      </div>

      <section class="portfolio-section">
        <div class="portfolio-section__head">
          <div>
            <div class="eyebrow">Madurez editorial</div>
            <h2>Como leer el laboratorio</h2>
          </div>
          <button class="retro-button" data-nav="projects">Filtrar por estado</button>
        </div>
        <div class="portfolio-lane-grid">
          ${projectCurationLanes.map(renderCurationLane).join("")}
        </div>
      </section>

      <section class="portfolio-section">
        <div class="portfolio-section__head">
          <div>
            <div class="eyebrow">Criterio de curaduria</div>
            <h2>Como esta organizado el portfolio</h2>
          </div>
          <button class="retro-button" data-nav="projects">Explorar catalogo</button>
        </div>
        ${renderDeliveryFlow()}
        <div class="portfolio-upgrade-grid">
          ${PLATFORM_UPGRADES.map(renderPlatformUpgrade).join("")}
        </div>
      </section>

      <section class="panel-card portfolio-roadmap">
        <div class="panel-card__title">Criterio de publicacion</div>
        <div class="panel-card__body">
          <div class="portfolio-roadmap-grid">
            <div>
              <strong>Demos directas</strong>
              <p>Se publican cuando pueden abrir en navegador con rutas relativas y sin servicios externos.</p>
            </div>
            <div>
              <strong>Fichas de caso</strong>
              <p>Los proyectos con backend, Android o Streamlit se muestran como caso tecnico cuando requieren entorno propio.</p>
            </div>
            <div>
              <strong>Paquete completo</strong>
              <p>Las experiencias con audio o assets grandes se preservan completas fuera de la publicacion liviana.</p>
            </div>
          </div>
        </div>
      </section>
    </section>
  `;
}
