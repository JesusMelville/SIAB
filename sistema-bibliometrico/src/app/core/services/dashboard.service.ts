import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { Statistics } from '../models/statistics.model';
import { Thesis } from '../models/thesis.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // ya no /dashboard
  private apiUrl = `${environment.apiUrl}/tesis`;

  constructor(private http: HttpClient) {}

  // devolvemos Stats aunque el backend mande la lista de tesis
  getMyStats(): Observable<ApiResponse<Statistics>> {
    return this.http
      .get<ApiResponse<Thesis[]>>(`${this.apiUrl}/mine`)
      .pipe(
        map((res) => {
          const theses = res.data || [];
          const total = theses.length;
          const promedio =
            total > 0
              ? theses.reduce((acc, t) => acc + (t.calificacionPredicha || 0), 0) / total
              : 0;

          const stats: Statistics = {
            total,
            promedio,
            categorias: {
              Excelente: theses.filter((t) => t.categoria === 'Excelente').length,
              Buena: theses.filter((t) => t.categoria === 'Buena').length,
              Regular: theses.filter((t) => t.categoria === 'Regular').length,
              Deficiente: theses.filter((t) => t.categoria === 'Deficiente').length,
            },
            thisMonth: 0, // si luego quieres, lo calculamos por fecha
          };

          return { success: true, data: stats } as ApiResponse<Statistics>;
        })
      );
  }
}
