import { Injectable } from '@angular/core';
import { Metrics } from '../models/metrics.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  toRadar(metrics: Metrics | null) {
    if (!metrics) {
      return {
        labels: [],
        datasets: [],
      };
    }
    return {
      labels: ['Citación', 'Metodología', 'Innovación', 'Técnicas', 'Resultados'],
      datasets: [
        {
          label: 'Puntajes',
          data: [
            metrics.puntajes.citacion,
            metrics.puntajes.metodologia,
            metrics.puntajes.innovacion,
            metrics.puntajes.tecnicas,
            metrics.puntajes.resultados,
          ],
        },
      ],
    };
  }

  getRecommendations(metrics: Metrics | null) {
    if (!metrics) return [];
    return metrics.recomendaciones ?? [];
  }

  getTotal(metrics: Metrics | null) {
    if (!metrics) return 0;
    return metrics.puntajes.total ?? 0;
  }
}
