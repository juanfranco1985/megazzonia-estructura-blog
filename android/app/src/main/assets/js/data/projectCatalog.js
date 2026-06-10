const WORKSPACE_ROOT_PREFIX = "../../../../../../";

export const projectCategories = [
  "Columna vertebral",
  "Juegos y experiencias",
  "Simuladores tecnicos",
  "Ciencia solar y clima",
  "Producto y negocio",
  "Movil y backend",
  "Exploracion tecnica"
];

const HOSTING_CASE_ONLY = {
  hideEntry: true,
  label: "Demo completa local",
  note: "En esta publicacion se muestra como ficha/captura para mantener una carga rapida. La demo interactiva se conserva en el paquete completo."
};

const SPOTLIGHT_PROJECT_IDS = new Set([
  "data-analyst-career-simulator",
  "drone-factory",
  "motorcraft-codex-2",
  "flight-simulator",
  "heat-sink",
  "analisis-estructural",
  "roi-analytics-android"
]);

export const projectCurationLanes = [
  {
    id: "spotlight",
    label: "Insignia",
    tone: "success",
    title: "Proyectos insignia",
    body: "Piezas con mejor combinacion de demo, caso, evidencia visual y lectura profesional."
  },
  {
    id: "case",
    label: "Caso tecnico",
    tone: "info",
    title: "Casos tecnicos",
    body: "Proyectos que conviene leer como producto, arquitectura y decisiones tecnicas."
  },
  {
    id: "demo",
    label: "Demo web",
    tone: "success",
    title: "Demos navegables",
    body: "Experiencias que abren directo en navegador dentro del paquete publicado."
  },
  {
    id: "technical",
    label: "Articulo tecnico",
    tone: "neutral",
    title: "Articulos tecnicos",
    body: "Trabajo reproducible o documentado que requiere entorno propio."
  },
  {
    id: "local",
    label: "Demo local",
    tone: "warning",
    title: "Preservadas localmente",
    body: "Experiencias completas con assets pesados que se muestran por ficha/captura en hosting."
  },
  {
    id: "incubation",
    label: "Exploracion",
    tone: "neutral",
    title: "Exploracion",
    body: "Ideas o modulos que necesitan cierre editorial, entorno o evidencia antes de subir de jerarquia."
  }
];

const CURATION_ORDER = new Map(projectCurationLanes.map((lane, index) => [lane.id, index]));

function getCurationLane(id) {
  return projectCurationLanes.find((lane) => lane.id === id) || projectCurationLanes[projectCurationLanes.length - 1];
}

export const projectCatalog = [
  {
    id: "laboratorio-megazzonia",
    title: "Laboratorio Megazzonia",
    category: "Columna vertebral",
    kind: "Blog / hub",
    status: "Integrado",
    statusTone: "success",
    description: "Hub web que organiza demos, casos tecnicos y fichas del laboratorio en una experiencia navegable.",
    tech: ["HTML", "CSS", "JavaScript", "Android WebView"],
    entryPath: "./index.html#home",
    readmePath: `${WORKSPACE_ROOT_PREFIX}/LABORATORIO MEGAZZONIA estructura blog/README.md`,
    actionLabel: "Abrir hub"
  },
  {
    id: "data-analyst-career-simulator",
    title: "Data Analyst Career Simulator",
    category: "Columna vertebral",
    kind: "Simulador laboral",
    status: "Funcional",
    statusTone: "success",
    description: "Simulador de primera semana laboral para analisis de datos, con SQL real, misiones, correo interno y reportes.",
    tech: ["Vanilla JS", "sql.js", "Chart.js", "Android WebView"],
    entryPath: "./simulator.html?v=dacs-20260429b#home",
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/data-analyst-career-simulator/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/data-analyst-career-simulator.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/LABORATORIO MEGAZZONIA estructura blog/docs/ESTADO_ACTUAL_PROYECTO.md`,
    actionLabel: "Abrir simulador"
  },
  {
    id: "champions-pong",
    title: "World Pong 2026",
    category: "Juegos y experiencias",
    kind: "Juego web",
    status: "Caso preservado",
    statusTone: "success",
    description: "Juego de pong con estetica mundialista y ejecucion directa en navegador.",
    tech: ["HTML", "CSS", "JavaScript"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Champions Pong - copia - copia/mundial-de-pong/index.html`,
    hosting: HOSTING_CASE_ONLY
  },
  {
    id: "cronicas-ultimo-piloto",
    title: "Cronicas del ultimo piloto",
    category: "Juegos y experiencias",
    kind: "Experiencia narrativa",
    status: "Caso preservado",
    statusTone: "success",
    description: "Proyecto narrativo con assets visuales y audio listos para exploracion desde navegador.",
    tech: ["HTML", "CSS", "JavaScript", "Audio"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Cronicas del ultimo piloto/index.html`,
    hosting: HOSTING_CASE_ONLY
  },
  {
    id: "drone-factory",
    title: "Drone Factory",
    category: "Juegos y experiencias",
    kind: "Juego incremental",
    status: "Caso + demo",
    statusTone: "success",
    description: "Juego incremental de fabrica de drones con canvas de planta, contratos, misiones, eventos y telemetria local.",
    tech: ["HTML", "CSS", "JavaScript", "Canvas", "MJS"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Drone Factory/index.html`,
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/drone-factory/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/drone-factory.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Drone Factory/README.md`
  },
  {
    id: "endless-runner",
    title: "South American Runner",
    category: "Juegos y experiencias",
    kind: "Juego web",
    status: "Caso preservado",
    statusTone: "success",
    description: "Runner por biomas sudamericanos con niveles, expedicion completa, progreso persistente, assets propios y controles tactiles.",
    tech: ["Canvas", "JavaScript", "Audio", "Sprites"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Endless Runner/index.html`,
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/south-american-runner/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/south-american-runner.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Endless Runner/README.md`,
    hosting: HOSTING_CASE_ONLY
  },
  {
    id: "flight-simulator",
    title: "Flight Simulator 3D",
    category: "Juegos y experiencias",
    kind: "Simulador 3D",
    status: "Caso + build",
    statusTone: "success",
    description: "Simulador 3D con Three.js, terreno procedural, clima, contratos, HUD, minimapa, perfil persistente y escenarios rapidos.",
    tech: ["React", "Three.js", "Vite", "WebGL"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/FlightSimulatorClaude2/dist/index.html`,
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/flight-simulator-3d/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/flight-simulator-3d.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/FlightSimulatorClaude2/README.md`,
    command: "npm run dev"
  },
  {
    id: "gato-humano",
    title: "Gato & Humano",
    category: "Juegos y experiencias",
    kind: "Demo de niveles",
    status: "Caso preservado",
    statusTone: "success",
    description: "Demo de ascenso al rascacielos celestial con niveles y recursos visuales propios.",
    tech: ["HTML", "CSS", "JavaScript", "Sprites"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Gato & Humano Ascenso al Rascacielos Celestial/index.html`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Gato & Humano Ascenso al Rascacielos Celestial/README.md`,
    hosting: HOSTING_CASE_ONLY
  },
  {
    id: "formula-apex-garage",
    title: "Formula Apex Garage",
    category: "Juegos y experiencias",
    kind: "Juego / garage",
    status: "Entrada web",
    statusTone: "success",
    description: "Proyecto de carreras con entrada estatica y logica JavaScript separada.",
    tech: ["HTML", "CSS", "JavaScript"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Juego Juan/index.html`
  },
  {
    id: "real-turn-pong",
    title: "Real Turn Pong",
    category: "Juegos y experiencias",
    kind: "Juego web",
    status: "Caso preservado",
    statusTone: "success",
    description: "Pong tactico por turnos con identidad visual propia y assets incluidos.",
    tech: ["HTML", "CSS", "JavaScript"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Real Turn Pong/index.html`,
    hosting: HOSTING_CASE_ONLY
  },
  {
    id: "tanque-chatgpt",
    title: "Linea de Acero",
    category: "Juegos y experiencias",
    kind: "Estrategia / combate",
    status: "Entrada web",
    statusTone: "success",
    description: "Juego tactico de tanques con sistemas separados de unidades, mapa, combate, ordenes y render.",
    tech: ["HTML", "JavaScript"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Tanque CHATGPT/index.html`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Tanque CHATGPT/README.md`
  },
  {
    id: "buscaminas-procedural",
    title: "Buscaminas Procedural",
    category: "Juegos y experiencias",
    kind: "Juego procedural",
    status: "Entrada web",
    statusTone: "success",
    description: "Buscaminas con generacion procedural dentro de la suite de juegos procedurales.",
    tech: ["HTML", "CSS", "JavaScript"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Juegos Procedurales/Buscaminas Procedural/index.html`
  },
  {
    id: "sopa-infinita",
    title: "Sopa Infinita",
    category: "Juegos y experiencias",
    kind: "Juego procedural",
    status: "Entrada web",
    statusTone: "success",
    description: "Sopa de letras procedural, preparada tambien para empaquetado Android.",
    tech: ["HTML", "CSS", "JavaScript", "Android"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Juegos Procedurales/Sopa de letras/index.html`
  },
  {
    id: "sudoku-procedural",
    title: "Sudoku Procedural",
    category: "Juegos y experiencias",
    kind: "Juego procedural",
    status: "Entrada web",
    statusTone: "success",
    description: "Sudoku procedural con arquitectura modular, PWA y carpeta Android asociada.",
    tech: ["HTML", "CSS", "JavaScript", "Android"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Juegos Procedurales/Sudoku/index.html`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Juegos Procedurales/Sudoku/README.md`
  },
  {
    id: "procedural-playworks",
    title: "Procedural Playworks",
    category: "Juegos y experiencias",
    kind: "Suite procedural",
    status: "Entrada web + Android",
    statusTone: "success",
    description: "Suite de 20 juegos procedurales con semillas reproducibles, perfiles, campana, logros, audio sintetico y wrapper Android.",
    tech: ["HTML", "CSS", "JavaScript", "Canvas", "PWA", "Android WebView"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Sistema de juegos procedurales 2/web/index.html`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Sistema de juegos procedurales 2/README.md`,
    actionLabel: "Abrir suite"
  },
  {
    id: "motorcraft-codex-2",
    title: "3D Motor Winding Lab",
    category: "Simuladores tecnicos",
    kind: "Simulador 3D",
    status: "Caso + build",
    statusTone: "success",
    description: "Laboratorio 3D para bobinado trifasico con validacion, campo magnetico rotante, modo demo y exportacion.",
    tech: ["Three.js", "Vite", "JavaScript", "WebGL"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Motorcraft CODEX 2/dist/index.html`,
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/motorcraft-codex-2/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/motorcraft-codex-2.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Motorcraft CODEX 2/README.md`,
    command: "npm run dev"
  },
  {
    id: "consumo-electrico",
    title: "Simulador de Consumo Electrico",
    category: "Simuladores tecnicos",
    kind: "Dashboard energetico",
    status: "Caso + demo",
    statusTone: "success",
    description: "Dashboard estatico para estimar kWh, costo mensual, equipos criticos, escenarios e historial exportable.",
    tech: ["HTML", "CSS", "JavaScript", "Canvas"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Simulador de consumo electrico/index.html`,
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/consumo-electrico/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/consumo-electrico.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Simulador de consumo electrico/README.md`
  },
  {
    id: "heat-sink",
    title: "Simulador de transferencia de calor",
    category: "Simuladores tecnicos",
    kind: "Simulador tecnico",
    status: "Caso + build",
    statusTone: "success",
    description: "Simulador React/Vite para comparar disipadores, materiales, conveccion, geometria de aletas, reportes y presets tecnicos.",
    tech: ["React", "Vite", "Canvas", "LocalStorage"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Simulador de transferencia de calor en disipadores/dist/index.html`,
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/heat-sink-simulator/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/heat-sink-simulator.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Simulador de transferencia de calor en disipadores/README.md`,
    command: "npm run dev"
  },
  {
    id: "analisis-estructural",
    title: "Analisis Estructural",
    category: "Simuladores tecnicos",
    kind: "Herramienta tecnica",
    status: "Caso + build",
    statusTone: "success",
    description: "Workbench React/Vite para vigas, cargas, apoyos, diagramas, factores de seguridad, persistencia y exportacion de reportes.",
    tech: ["React", "TypeScript", "Recharts", "Vite"],
    entryPath: `${WORKSPACE_ROOT_PREFIX}/Software de Analisis estructural - copia/dist/index.html`,
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/analisis-estructural/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/demos/analisis-estructural.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Software de Analisis estructural - copia/README.md`,
    command: "npm run dev"
  },
  {
    id: "solar-year-db",
    title: "Solar Year Historical Database",
    category: "Ciencia solar y clima",
    kind: "Base analitica",
    status: "README",
    statusTone: "info",
    description: "Base historica y herramienta de analisis para calendario solar 4x90 con SQLite, ETL y estudios climaticos.",
    tech: ["Python", "SQLite", "Streamlit"],
    readmePath: `${WORKSPACE_ROOT_PREFIX}/10 - SOLAR YEAR HISTORICAL DATABASE & ANALYSIS TOOL/README.md`,
    command: "pip install -r requirements.txt"
  },
  {
    id: "solar-agriculture",
    title: "Solar Agriculture Planning System",
    category: "Ciencia solar y clima",
    kind: "Planner agricola",
    status: "Streamlit",
    statusTone: "warning",
    description: "Planner que cruza cultivos, clima historico y riesgo agricola sobre calendario solar 4x90.",
    tech: ["Python", "Streamlit", "Plotly", "ML"],
    readmePath: `${WORKSPACE_ROOT_PREFIX}/5 - Solar Agriculture Planning System/README.md`,
    command: "streamlit run src/dashboard/app.py"
  },
  {
    id: "astronomical-calendar-engine",
    title: "Astronomical Solar Calendar Engine",
    category: "Ciencia solar y clima",
    kind: "Motor astronomico",
    status: "Investigacion",
    statusTone: "neutral",
    description: "Motor dinamico y predictivo de calendario solar astronomico, con scripts Python y ejecutables exportados.",
    tech: ["Python", "Astronomia", "EXE"],
    command: "revisar notebooks y scripts"
  },
  {
    id: "solar-climate-dashboard",
    title: "Solar Climate Dashboard",
    category: "Ciencia solar y clima",
    kind: "Dashboard climatico",
    status: "Caso + Streamlit",
    statusTone: "info",
    description: "Dashboard interactivo para mapear clima al calendario solar 4x90, comparar hemisferios, explorar drift y ejecutar ML opcional.",
    tech: ["Python", "Streamlit", "Plotly", "ML"],
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/solar-climate-dashboard/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/cases/solar-climate-dashboard.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/9 - Solar Climate Dashboard/README.md`,
    command: "streamlit run app.py"
  },
  {
    id: "npt-sistema-solar",
    title: "Proyecto NPT - sistema solar",
    category: "Ciencia solar y clima",
    kind: "Proyecto Python",
    status: "Investigacion",
    statusTone: "neutral",
    description: "Conjunto de scripts Python alrededor de sistema solar, en etapa de documentacion y curaduria visual.",
    tech: ["Python"]
  },
  {
    id: "ai-product-research",
    title: "Product Research Engine",
    category: "Producto y negocio",
    kind: "Motor de investigacion",
    status: "README",
    statusTone: "info",
    description: "MVP para ingestar reviews, extraer pain points, agrupar problemas y puntuar severidad.",
    tech: ["Python", "NLP", "Pytest"],
    readmePath: `${WORKSPACE_ROOT_PREFIX}/ai-product-research/README.md`,
    command: "pytest"
  },
  {
    id: "amazon-deals",
    title: "Amazon Deals",
    category: "Producto y negocio",
    kind: "App + servidor",
    status: "Entorno dedicado",
    statusTone: "warning",
    description: "Proyecto separado en app y server, con package.json en ambos lados. Necesita configuracion antes de integrarlo como demo navegable.",
    tech: ["Node", "TypeScript", "App"],
    command: "npm install && npm run dev"
  },
  {
    id: "cuaderno-musical",
    title: "Cuaderno Musical Inteligente",
    category: "Producto y negocio",
    kind: "SaaS musical",
    status: "Backend dedicado",
    statusTone: "warning",
    description: "Aplicacion para musicos con frontend, backend, auth, PostgreSQL, billing simulado, adjuntos y colaboracion.",
    tech: ["React", "Node", "Express", "Prisma", "PostgreSQL"],
    readmePath: `${WORKSPACE_ROOT_PREFIX}/Proyecto Cuaderno digital inteligente para músicos/README.md`,
    command: "backend + frontend en paralelo"
  },
  {
    id: "roi-analytics-android",
    title: "ROI Analytics Android",
    category: "Movil y backend",
    kind: "App Android",
    status: "Build verificado",
    statusTone: "success",
    description: "App Kotlin + Jetpack Compose para consumir un backend FastAPI de analisis de campanas, con fallback local y exportacion PDF.",
    tech: ["Kotlin", "Compose", "Hilt", "Retrofit", "FastAPI"],
    casePath: `${WORKSPACE_ROOT_PREFIX}/portfolio/projects/roi-analytics-android/`,
    screenshotPath: `${WORKSPACE_ROOT_PREFIX}/portfolio/assets/screenshots/cases/roi-analytics-android.png`,
    readmePath: `${WORKSPACE_ROOT_PREFIX}/RoiAnalyticsAndroid_v3/README.md`,
    command: "gradlew assembleDebug"
  },
  {
    id: "laboratorio-fluidos",
    title: "Laboratorio virtual de mecanica de fluidos",
    category: "Exploracion tecnica",
    kind: "Modulo JS",
    status: "Investigacion",
    statusTone: "neutral",
    description: "Actualmente aparece como modulo JavaScript suelto; necesita HTML, README o build para entrar al hub.",
    tech: ["JavaScript"]
  }
];

export function getProjectCuration(project) {
  if (SPOTLIGHT_PROJECT_IDS.has(project.id)) {
    return getCurationLane("spotlight");
  }

  if (project.hosting?.hideEntry) {
    return getCurationLane("local");
  }

  if (project.statusTone === "warning" || project.statusTone === "neutral") {
    return getCurationLane("incubation");
  }

  if (project.casePath) {
    return getCurationLane("case");
  }

  if (project.entryPath) {
    return getCurationLane("demo");
  }

  if (project.readmePath || project.command) {
    return getCurationLane("technical");
  }

  return getCurationLane("incubation");
}

export function getProjectSortWeight(project) {
  const lane = getProjectCuration(project);
  const laneWeight = CURATION_ORDER.get(lane.id) ?? 99;
  const categoryWeight = projectCategories.indexOf(project.category);
  return {
    lane: laneWeight,
    category: categoryWeight === -1 ? 99 : categoryWeight,
    title: project.title
  };
}

export function compareProjectsForPortfolio(a, b) {
  const weightA = getProjectSortWeight(a);
  const weightB = getProjectSortWeight(b);
  return weightA.lane - weightB.lane
    || weightA.category - weightB.category
    || weightA.title.localeCompare(weightB.title);
}

export function getProjectSummary() {
  const total = projectCatalog.length;
  const launchable = projectCatalog.filter((project) => Boolean(project.entryPath)).length;
  const documented = projectCatalog.filter((project) => Boolean(project.readmePath)).length;
  const needsWork = projectCatalog.filter((project) => project.statusTone === "warning" || project.statusTone === "neutral").length;
  const curationCounts = projectCatalog.reduce((acc, project) => {
    const lane = getProjectCuration(project);
    acc[lane.id] = (acc[lane.id] || 0) + 1;
    return acc;
  }, {});

  return {
    total,
    launchable,
    documented,
    needsWork,
    spotlight: curationCounts.spotlight || 0,
    caseStudies: projectCatalog.filter((project) => Boolean(project.casePath)).length,
    technicalArticles: curationCounts.technical || 0,
    localOnly: curationCounts.local || 0,
    incubation: curationCounts.incubation || 0,
    curationCounts
  };
}
