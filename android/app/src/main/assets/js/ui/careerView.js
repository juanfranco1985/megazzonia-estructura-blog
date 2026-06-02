import { buildCareerModel } from "../systems/progressionSystem.js";
import { escapeHtml, truncate } from "../app/utils.js";
import { renderBadge, renderChipList, renderProgressBar, renderStatCard, renderEmptyState } from "./widgetView.js";

function renderReviewList(items) {
  if (!items.length) {
    return renderEmptyState("Sin reviews", "Todavia no hay cortes formales de performance.");
  }

  return `
    <div class="career-log">
      ${items.map((item) => `
        <article class="career-log__item">
          <div class="career-log__title">${escapeHtml(item.title)} · ${escapeHtml(item.ratingLabel)}</div>
          <div class="career-log__copy">${escapeHtml(`${item.summary} Seniority: ${item.seniorityLabel}. Salary ${item.salary} ${item.burnoutLabel ? `· Burnout ${item.burnoutLabel}` : ""}`)}</div>
        </article>
      `).join("")}
    </div>
  `;
}

export function renderCareerView(state) {
  const career = buildCareerModel(state);
  const progress = career.totalMissions ? Math.round((career.completedMissions / career.totalMissions) * 100) : 0;
  const recentFeedback = state.feedback.slice(0, 3);
  const recentActivity = state.activity.slice(0, 4);
  const strainedStakeholders = career.organization?.strained || [];
  const supporters = career.organization?.supporters || [];

  return `
    <section class="view view-career">
      <div class="view-head">
        <div>
          <div class="eyebrow">Professional profile</div>
          <h2>Panel de carrera</h2>
          <p>Progresion profesional, tension organizacional y carga laboral de la semana simulada.</p>
        </div>
        <div class="view-head__meta">
          ${renderBadge(`${career.completedMissions}/${career.totalMissions} misiones`, "info")}
          ${renderBadge(`${career.successRate}% exito`, career.successRate >= 50 ? "success" : "warning")}
          ${renderBadge(career.performance?.ratingLabel || "Sin rating", career.performance?.ratingScore >= 65 ? "success" : "warning")}
        </div>
      </div>

      <div class="career-hero">
        <div class="career-hero__identity">
          <div class="career-hero__name">${escapeHtml(career.name)}</div>
          <div class="career-hero__role">${escapeHtml(career.seniority?.currentTitle || career.role)}</div>
        </div>
        <div class="career-hero__meta">
          <span>${escapeHtml(career.currentMissionLabel)}</span>
          <span>${escapeHtml(career.currentMissionStatus)}</span>
        </div>
      </div>

      <div class="card-grid">
        ${renderStatCard({ label: "Prestigio", value: career.prestige, note: "Reputacion interna", tone: "success" })}
        ${renderStatCard({ label: "Score tecnico", value: career.technicalScore, note: "Consistencia analitica", tone: "info" })}
        ${renderStatCard({ label: "Seniority", value: career.seniority?.label || "Junior", note: career.seniority?.promotionReadiness || "Base estable", tone: "neutral" })}
        ${renderStatCard({ label: "Salary sim", value: `${career.compensation?.salary || 0} ${career.compensation?.currency || ""}`.trim(), note: career.compensation?.bandLabel || "Band 1", tone: "success" })}
        ${renderStatCard({ label: "Carga", value: career.workload?.loadLabel || "Manejable", note: career.workload?.note || "Sin friccion fuerte", tone: career.workload?.loadScore >= 55 ? "warning" : career.workload?.loadScore >= 30 ? "info" : "success" })}
        ${renderStatCard({ label: "Burnout", value: career.workload?.burnoutLabel || "Bajo", note: `${career.workload?.burnoutRisk || 0}/100`, tone: career.workload?.burnoutRisk >= 60 ? "warning" : career.workload?.burnoutRisk >= 35 ? "info" : "success" })}
      </div>

      <div class="career-layout">
        <section class="panel-card panel-card--large">
          <div class="panel-card__title">Progreso laboral</div>
          <div class="panel-card__body">
            ${renderProgressBar(progress, "Avance semanal", "success")}
            <div class="career-summary">
              <div class="context-row"><span>Track dominante</span><strong>${escapeHtml(career.trajectory?.dominantTrackLabel || "Sin definir")}</strong></div>
              <div class="context-row"><span>Madurez</span><strong>${escapeHtml(career.trajectory?.readinessTier || "Base estable")}</strong></div>
              <div class="context-row"><span>Promotion readiness</span><strong>${escapeHtml(career.seniority?.promotionReadiness || "Base estable")}</strong></div>
              <div class="context-row"><span>Performance</span><strong>${escapeHtml(`${career.performance?.ratingLabel || "Mixto"} · ${career.performance?.ratingScore || 0}/100`)}</strong></div>
            </div>
          </div>
        </section>

        <section class="panel-card panel-card--large">
          <div class="panel-card__title">Skills desbloqueadas</div>
          <div class="panel-card__body">
            ${career.skills.length
              ? renderChipList(career.skills.map((skill) => skill.label), "success")
              : renderEmptyState("Sin skills", "Todavia no hay skills desbloqueadas.")}
          </div>
        </section>
      </div>

      <div class="split-panels career-support-panels">
        <section class="panel-card panel-card--wide">
          <div class="panel-card__title">Performance review</div>
          <div class="panel-card__body">
            <div class="home-brief-note"><strong>Rating actual:</strong> ${escapeHtml(`${career.performance?.ratingLabel || "Mixto"} · ${career.performance?.ratingScore || 0}/100`)}</div>
            <div class="home-brief-note"><strong>Lectura:</strong> ${escapeHtml(career.performance?.summary || "Sin resumen disponible.")}</div>
            <div class="home-brief-note"><strong>Carga actual:</strong> ${escapeHtml(`${career.workload?.loadLabel || "Manejable"} · Burnout ${career.workload?.burnoutLabel || "Bajo"}`)}</div>
            <div class="home-brief-note"><strong>Compensacion:</strong> ${escapeHtml(`${career.compensation?.salary || 0} ${career.compensation?.currency || ""} · ${career.compensation?.bandLabel || "Band 1"}`)}</div>
          </div>
        </section>

        <section class="panel-card panel-card--wide">
          <div class="panel-card__title">Reviews historicas</div>
          <div class="panel-card__body">
            ${renderReviewList((career.performanceReviews || []).slice(0, 3))}
          </div>
        </section>
      </div>

      <section class="panel-card panel-card--large">
        <div class="panel-card__title">Reputacion por area</div>
        <div class="panel-card__body">
          ${career.areaReputation?.length
            ? `
              <div class="career-log">
                ${career.areaReputation.map((area) => `
                  <article class="career-log__item">
                    <div class="career-log__title">${escapeHtml(area.label)} · ${escapeHtml(area.trackLabel)}</div>
                    <div class="career-log__copy">Score ${escapeHtml(String(area.score))} · Señales ${escapeHtml(String(area.signalCount))}${area.lastImpactLabel ? ` · ${escapeHtml(truncate(area.lastImpactLabel, 90))}` : ""}</div>
                  </article>
                `).join("")}
              </div>
            `
            : renderEmptyState("Sin lectura por area", "Todavia no hay lectura por area.")}
        </div>
      </section>

      <section class="panel-card panel-card--large">
        <div class="panel-card__title">Stakeholders, memoria y politica</div>
        <div class="panel-card__body">
          ${career.stakeholderRelationships?.length
            ? `
              <div class="career-log">
                ${career.stakeholderRelationships.map((stakeholder) => `
                  <article class="career-log__item">
                    <div class="career-log__title">${escapeHtml(stakeholder.name)} · ${escapeHtml(stakeholder.role)}</div>
                    <div class="career-log__copy">
                      ${escapeHtml(`Confianza ${stakeholder.trust}/100 · ${stakeholder.trustBand.label} · Reputacion ${stakeholder.reputation} · ${stakeholder.reputationBand.label} · Tension ${stakeholder.tensionBand.label} · ${stakeholder.patternSummary}`)}
                    </div>
                    ${stakeholder.recentNote ? `<div class="career-log__copy">${escapeHtml(truncate(stakeholder.recentNote, 150))}</div>` : ""}
                  </article>
                `).join("")}
              </div>
            `
            : renderEmptyState("Sin vinculos", "Todavia no hay vinculos laborales registrados.")}
        </div>
      </section>

      <div class="split-panels career-support-panels">
        <section class="panel-card">
          <div class="panel-card__title">Mapa organizacional</div>
          <div class="panel-card__body">
            <div class="home-brief-note"><strong>Temperatura politica:</strong> ${escapeHtml(career.organization?.politicalTemperature?.label || "Controlado")}</div>
            <div class="home-brief-note"><strong>Riesgo de prioridad:</strong> ${escapeHtml(career.organization?.priorityRisk ? "Alto" : "Bajo")}</div>
            <div class="home-brief-note"><strong>Aliados:</strong> ${escapeHtml(supporters.length ? supporters.map((item) => item.name).join(" · ") : "Sin cobertura fuerte aun")}</div>
            <div class="home-brief-note"><strong>Fricciones:</strong> ${escapeHtml(strainedStakeholders.length ? strainedStakeholders.map((item) => item.name).join(" · ") : "Sin tensiones fuertes")}</div>
            ${(career.organization?.tensionAlerts || []).length
              ? `<div class="career-log">
                  ${(career.organization.tensionAlerts || []).map((alert) => `
                    <article class="career-log__item">
                      <div class="career-log__copy">${escapeHtml(alert)}</div>
                    </article>
                  `).join("")}
                </div>`
              : renderEmptyState("Organizacion estable", "Todavia no hay alertas politicas de peso.")}
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-card__title">Ultimo feedback</div>
          <div class="panel-card__body">
            ${recentFeedback.length
              ? `
                <div class="career-log">
                  ${recentFeedback.map((item) => `
                    <article class="career-log__item ${(item.success ?? (item.qualityLabel !== "needs_revision" && item.qualityLabel !== "promising_but_incomplete")) ? "is-success" : "is-warning"}">
                      <div class="career-log__title">${escapeHtml(item.subject || (item.success ? "Entrega aprobada" : "Revision solicitada"))}</div>
                      <div class="career-log__copy">${escapeHtml(truncate(item.preview || item.message || item.body || "", 150))}</div>
                    </article>
                  `).join("")}
                </div>
              `
              : renderEmptyState("Sin devoluciones", "Todavia no hay devoluciones registradas.")}
          </div>
        </section>

        <section class="panel-card panel-card--wide">
          <div class="panel-card__title">Actividad reciente</div>
          <div class="panel-card__body">
            ${recentActivity.length
              ? `
                <div class="career-log">
                  ${recentActivity.map((item) => `
                    <article class="career-log__item">
                      <div class="career-log__title">${escapeHtml(item.time || "--")}</div>
                      <div class="career-log__copy">${escapeHtml(item.label)}</div>
                    </article>
                  `).join("")}
                </div>
              `
              : renderEmptyState("Sin actividad", "No hay actividad reciente.")}
          </div>
        </section>
      </div>
    </section>
  `;
}
