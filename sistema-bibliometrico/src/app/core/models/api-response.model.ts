/**
 * Representa la estructura estandarizada para todas las respuestas de la API del backend.
 * Es una interfaz genérica, donde 'T' representa el tipo de los datos esperados.
 *
 * @template T El tipo de la carga de datos (ej. User, Thesis[], DashboardStats).
 */
export interface ApiResponse<T> {
  /**
   * Indica si la petición fue exitosa.
   * Siempre presente en la respuesta.
   * @example true
   */
  success: boolean;

  /**
   * La carga de datos principal de la respuesta.
   * Esta propiedad es opcional ('?') y estará presente en peticiones exitosas.
   * Su tipo 'T' puede ser un solo objeto o un arreglo de objetos.
   * @example { _id: '...', nombre: '...' } O [{...}, {...}]
   */
  data?: T;

  /**
   * Un mensaje corto y amigable para el usuario que describe el resultado de la operación.
   * Es opcional y se puede usar para mostrar alertas o notificaciones en el frontend.
   * @example 'Usuario actualizado exitosamente.'
   */
  message?: string;

  /**
   * Contiene los detalles de paginación si la respuesta es para una lista de ítems.
   * Esta propiedad es opcional y solo estará presente en los endpoints paginados.
   */
  pagination?: {
    page: number;    // Página actual
    limit: number;   // Ítems por página
    total: number;   // Total de ítems
    pages: number;   // Total de páginas
  };

  /**
   * Un código de error legible por máquina para escenarios de manejo de errores específicos.
   * Es opcional y típicamente solo está presente en peticiones fallidas.
   * @example 'DUPLICATE_EMAIL'
   */
  error?: string;
}