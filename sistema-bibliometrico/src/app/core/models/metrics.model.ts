// src/app/core/models/metrics.model.ts

// ✅ SOLUCIÓN: Añadir 'export' para que la interfaz pueda ser importada.
export interface Metrics {
  _id?: string;
  tesisId: string;
  fechaAnalisis: Date;
  
  puntajes: {
    citacion: number;
    metodologia: number;
    innovacion: number;
    tecnicas: number;
    resultados: number;
    total: number;
  };
  
  prediccionIA: {
    categoria: 'Excelente' | 'Buena' | 'Regular' | 'Deficiente';
    confianza: number;
    modeloVersion: string;
    probabilidades?: {
      [key: string]: number;
    };
  };
  
  comparativa: {
    promedioUniversidad: number;
    promedioNacional: number;
    rankingUniversidad: number;
    totalTesisUniversidad: number;
    diferenciaNacional: number;
  };
  
  recomendaciones: Recommendation[];
}

// ✅ SOLUCIÓN: Añadir 'export' también a esta interfaz.
export interface Recommendation {
  prioridad: 'Alta' | 'Media' | 'Baja';
  categoria: string;
  texto: string;
}