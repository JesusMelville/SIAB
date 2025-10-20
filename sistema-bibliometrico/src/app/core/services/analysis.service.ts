import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private apiUrl = `${environment.apiUrl}/analysis`;

  constructor(private http: HttpClient) {}

  // Calcular métricas bibliométricas
  calculateMetrics(thesisData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/calculate-metrics`, thesisData);
  }

  // Obtener predicción IA
  getIAPrediction(thesisId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ia-prediction/${thesisId}`);
  }

  // Generar recomendaciones
  getRecommendations(thesisId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommendations/${thesisId}`);
  }

  // Comparar con universidad
  compareWithUniversity(thesisId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/compare-university/${thesisId}`);
  }
}