
export const stakeholders = [
  {
    id: "carla_mendez",
    name: "Carla Méndez",
    role: "Gerente Comercial",
    area: "commercial",
    tone: "urgente, ejecutiva y orientada a claridad",
    exigency: 4,
    bias: "prefiere respuestas rápidas y un resumen confiable antes que demasiada explicación técnica",
    avatar: "CM",
    accent: "#c29a57",
    feedbackStyle: "sintetiza resultados y pide una conclusión clara para negocio"
  },
  {
    id: "nico_ortega",
    name: "Nicolás Ortega",
    role: "Líder de Marketing",
    area: "marketing",
    tone: "comercial, exploratorio y orientado a segmentos",
    exigency: 3,
    bias: "tiende a pensar en campañas, audiencias y lecturas de embudo",
    avatar: "NO",
    accent: "#6b8fb9",
    feedbackStyle: "pide contexto, segmentación y próximos cortes"
  },
  {
    id: "mariana_soto",
    name: "Mariana Soto",
    role: "Analista Senior / Jefa Directa",
    area: "leadership",
    tone: "preciso, técnico y exigente",
    exigency: 5,
    bias: "prioriza limpieza, metodología y consistencia estadística",
    avatar: "MS",
    accent: "#6c9a88",
    feedbackStyle: "señala errores metodológicos y sugiere correcciones concretas"
  },
  {
    id: "lucia_ferraro",
    name: "Lucía Ferraro",
    role: "Operations Lead",
    area: "operations",
    tone: "directa, orientada a riesgo operativo y muy sensible a bloqueos",
    exigency: 4,
    bias: "prioriza incidentes, cumplimiento y visibilidad inmediata del riesgo",
    avatar: "LF",
    accent: "#b26d5d",
    feedbackStyle: "pide cortes breves, estado accionable y foco en impacto operativo"
  }
];

export function getStakeholder(id) {
  return stakeholders.find((stakeholder) => stakeholder.id === id) || null;
}
