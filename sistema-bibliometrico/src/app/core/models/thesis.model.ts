import { Metrics } from './metrics.model';
import { User } from './user.model';

export interface Thesis {
  _id?: string;
  titulo: string;
  autor: string;
  anio: number;
  user: string | User;
  calificacionPredicha: number;
  categoria: string;
  indicadores: { [key: string]: number };
  metrics?: Metrics;
  filePath?: string;
  fileName?: string;
  createdAt?: string;
  updatedAt?: string;
}
