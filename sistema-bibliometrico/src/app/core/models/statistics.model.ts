export interface Statistics {
  total: number;
  promedio: number;
  categorias: {
    [key: string]: number;
  };
  thisMonth: number;
}
