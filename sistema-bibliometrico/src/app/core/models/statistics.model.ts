export interface Statistics {
  total: number;
  promedio: number;
  // Usamos un objeto indexable para mayor flexibilidad
  categorias: {
    [key: string]: number;
  };
  thisMonth: number;
}