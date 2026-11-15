import { Chart, registerables } from 'chart.js';
import { AvancementComite, KPIs } from '../models';

Chart.register(...registerables);
Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
Chart.defaults.color = '#7C8BA1';

// Couleurs de la charte (logos ENICarthage / Forum)
export const COULEURS = { bleu: '#0A6CC0', ciel: '#249CD8', vert: '#22A04B', ambre: '#E3A008', rouge: '#E05A5A', gris: '#DCE3EC' };

/** Histogramme de l'avancement (%) par comité. */
export function graphiqueAvancement(canvas: HTMLCanvasElement | null, data: AvancementComite[]): Chart | null {
  if (!canvas) return null;
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(a => a.comiteNom),
      datasets: [{
        label: 'Avancement',
        data: data.map(a => a.avancement),
        backgroundColor: data.map(a => a.avancement >= 70 ? COULEURS.vert : a.avancement >= 40 ? COULEURS.ciel : COULEURS.bleu),
        borderRadius: 8, maxBarThickness: 40,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.parsed.y} % terminé` } } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + ' %' }, grid: { color: '#EEF2F7' }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false } },
      },
    },
  });
}

/** Anneau de répartition des tâches par statut. */
export function graphiqueTaches(canvas: HTMLCanvasElement | null, k: KPIs): Chart | null {
  if (!canvas) return null;
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['À faire', 'En cours', 'Terminées', 'En retard'],
      datasets: [{
        data: [k.tachesAFaire ?? 0, k.tachesEnCours ?? 0, k.tachesTerminees ?? 0, k.tachesEnRetard ?? 0],
        backgroundColor: [COULEURS.gris, COULEURS.ciel, COULEURS.vert, COULEURS.rouge],
        borderWidth: 0, hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } },
    },
  });
}

/** Nombre de jours avant une date (négatif si passée). */
export function joursAvant(date: string | undefined | null): number | null {
  if (!date) return null;
  const j = new Date(date + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(j / 86400000);
}

/** Barres empilées : tâches terminées / restantes par comité. */
export function graphiqueTermineesRestantes(canvas: HTMLCanvasElement | null, data: AvancementComite[]): Chart | null {
  if (!canvas) return null;
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(a => a.comiteNom),
      datasets: [
        { label: 'Terminées', data: data.map(a => a.terminees), backgroundColor: COULEURS.vert, borderRadius: 6, maxBarThickness: 40 },
        { label: 'Restantes', data: data.map(a => (a.total ?? 0) - a.terminees), backgroundColor: COULEURS.gris, borderRadius: 6, maxBarThickness: 40 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } },
      scales: {
        x: { stacked: true, grid: { display: false }, border: { display: false } },
        y: { stacked: true, ticks: { precision: 0 }, grid: { color: '#EEF2F7' }, border: { display: false } },
      },
    },
  });
}
