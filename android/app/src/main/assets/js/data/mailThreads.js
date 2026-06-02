export const mailThreads = [
  {
    id: 'thread_mission_001',
    missionId: 'mission_001_sales_cleaning',
    threadType: 'mission',
    senderId: 'carla_mendez',
    senderName: 'Carla Méndez',
    senderRole: 'Gerente Comercial',
    subject: 'Necesito el canal ganador de la semana pasada',
    preview: 'Hay comité hoy y necesito una respuesta breve, clara y defendible con base confiable.',
    priority: 'high',
    timestamp: 'Mon 08:12',
    unread: true,
    accepted: false,
    labels: ['mission', 'urgent'],
    attachments: [
      {
        id: 'sales_dirty_csv',
        name: 'sales_dirty.csv',
        type: 'csv',
        label: 'Raw export',
        status: 'Pendiente de revisión',
        path: 'data/mission_001_sales_cleaning/raw/sales_dirty.csv'
      },
      {
        id: 'mission_json',
        name: 'mission.json',
        type: 'json',
        label: 'Brief de misión',
        status: 'Contexto operativo',
        path: 'data/mission_001_sales_cleaning/mission.json'
      }
    ],
    messages: [
      {
        id: 'm-1',
        from: 'Carla Méndez',
        role: 'Gerente Comercial',
        body: 'Buenos días. Necesito saber qué canal vendió más la semana pasada. El export que me pasaron no está limpio, así que no quiero un número apresurado. Carga el archivo, valida el corte semanal y déjame una conclusión ejecutiva que pueda reenviar al comité.'
      },
      {
        id: 'm-2',
        from: 'Carla Méndez',
        role: 'Gerente Comercial',
        body: 'Si hay duplicados o estados dudosos, corrígelos. La lectura tiene que ser defendible y útil para dirección.'
      }
    ]
  },
  {
    id: 'thread_boss_followup',
    missionId: 'mission_001_sales_cleaning',
    threadType: 'guidance',
    senderId: 'mariana_soto',
    senderName: 'Mariana Soto',
    senderRole: 'Analista Senior / Jefa Directa',
    subject: 'Ojo con el export: normaliza antes de comparar',
    preview: 'Te dejo una pista técnica para evitar un error metodológico en la primera entrega.',
    priority: 'normal',
    timestamp: 'Mon 08:25',
    unread: true,
    labels: ['technical', 'guidance'],
    attachments: [],
    messages: [
      {
        id: 'm-1',
        from: 'Mariana Soto',
        role: 'Analista Senior / Jefa Directa',
        body: 'Vi el extracto que llegó a operaciones. Hay fechas en distintos formatos, montos con símbolos, canales escritos distinto y al menos una fila duplicada. Si trabajas contra el raw sin limpiar, el total semanal te va a salir contaminado.'
      },
      {
        id: 'm-2',
        from: 'Mariana Soto',
        role: 'Analista Senior / Jefa Directa',
        body: 'Mi recomendación: revisa el corte 2026-04-06 a 2026-04-12, filtra pedidos válidos y agrupa por canal normalizado. Después arma una entrega simple y ejecutiva.'
      }
    ]
  },
  {
    id: 'thread_mission_002',
    missionId: 'mission_002_web_category_mix',
    threadType: 'mission',
    senderId: 'nico_ortega',
    senderName: 'Nicolás Ortega',
    senderRole: 'Líder de Marketing',
    subject: 'Ahora necesito la categoría ganadora dentro de Web',
    preview: 'Quiero aprovechar la misma base limpia para entender qué categoría domina revenue dentro del canal digital.',
    priority: 'normal',
    timestamp: 'Mon 10:54',
    unread: true,
    accepted: false,
    labels: ['mission', 'followup'],
    attachments: [
      {
        id: 'sales_dirty_csv',
        name: 'sales_dirty.csv',
        type: 'csv',
        label: 'Raw export reutilizado',
        status: 'Disponible tras misión comercial',
        path: 'data/mission_002_web_category_mix/raw/sales_dirty.csv'
      },
      {
        id: 'mission_json',
        name: 'mission.json',
        type: 'json',
        label: 'Brief de misión',
        status: 'Contexto operativo',
        path: 'data/mission_002_web_category_mix/mission.json'
      }
    ],
    messages: [
      {
        id: 'm-1',
        from: 'Nicolás Ortega',
        role: 'Líder de Marketing',
        body: 'Buen corte el de comercial. Ahora quiero mirar el canal Web por dentro. Necesito saber qué categoría trae más revenue digital en la misma semana, manteniendo el mismo estándar de limpieza.'
      },
      {
        id: 'm-2',
        from: 'Nicolás Ortega',
        role: 'Líder de Marketing',
        body: 'No me sirve el total global ni mezclar todos los canales. Necesito una lectura específica de Web, con una conclusión corta que podamos usar para orientar pauta y foco creativo.'
      }
    ]
  },
  {
    id: 'thread_mission_002_guidance',
    missionId: 'mission_002_web_category_mix',
    threadType: 'guidance',
    senderId: 'mariana_soto',
    senderName: 'Mariana Soto',
    senderRole: 'Analista Senior / Jefa Directa',
    subject: 'Segundo corte: no confundas canal con categoría',
    preview: 'Pequeña advertencia metodológica antes de que marketing te pida una lectura cruzada.',
    priority: 'normal',
    timestamp: 'Mon 11:12',
    unread: true,
    labels: ['technical', 'guidance'],
    attachments: [],
    messages: [
      {
        id: 'm-1',
        from: 'Mariana Soto',
        role: 'Analista Senior / Jefa Directa',
        body: 'En esta segunda lectura no cambies la lógica de limpieza. Reutiliza sales_clean, mantén status completed y el mismo corte temporal. La diferencia es que ahora debes filtrar Web antes de agrupar por categoría.'
      }
    ]
  }
];

export function cloneMailThreads() {
  return mailThreads.map((thread) => ({
    ...thread,
    labels: [...thread.labels],
    attachments: thread.attachments.map((attachment) => ({ ...attachment })),
    messages: thread.messages.map((message) => ({ ...message }))
  }));
}
