// src/app/core/models/thesis.model.ts

import { Metrics } from './metrics.model';

export interface Thesis {
  _id?: string;
  titulo: string;
  autor: string;
  anio: number;
  user: string;
  calificacionPredicha: number;
  categoria: string;
  indicadores: { [key: string]: number };
  metrics?: Metrics;
  filePath?: string; // <-- AÑADE ESTA LÍNEA
  fileName?: string; // <-- AÑADE ESTA LÍNEA
  createdAt?: string;
  updatedAt?: string;
}