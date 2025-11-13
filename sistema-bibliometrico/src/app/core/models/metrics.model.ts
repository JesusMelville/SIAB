export interface Metrics {
  _id?: string;
  tesisId: string;
  puntajes: {
    total: number;
    citacion: number;
    metodologia: number;
    innovacion: number;
    tecnicas: number;
    resultados: number;
  };
  prediccionIA: {
    categoria: string;
    confianza: number;
    modeloVersion: string;
  };
  comparativa: { [key: string]: any };
  recomendaciones: Recommendation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Recommendation {
  prioridad: 'Alta' | 'Media' | 'Baja';
  categoria: string;
  texto: string;
}
