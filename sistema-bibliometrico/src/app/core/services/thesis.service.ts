// src/app/core/services/thesis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Thesis } from '../models/thesis.model';
import { Statistics } from '../models/statistics.model';
import { ApiResponse } from '../models/api-response.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ThesisService {
  private apiUrl = `${environment.apiUrl}/tesis`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}
  
  getAllTheses(
    page: number = 1,
    limit: number = 10,
    filters?: { [key: string]: string | number }
  ): Observable<ApiResponse<Thesis[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] != null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http
      .get<ApiResponse<Thesis[]>>(this.apiUrl, { params })
      .pipe(catchError(err => throwError(() => err)));
  }

  getStatistics(): Observable<ApiResponse<Statistics>> {
    return this.http
      .get<ApiResponse<Statistics>>(`${this.apiUrl}/stats`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getThesisById(id: string): Observable<ApiResponse<Thesis>> {
    return this.http
      .get<ApiResponse<Thesis>>(`${this.apiUrl}/${id}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  analyzeNewThesis(formData: FormData): Observable<HttpEvent<ApiResponse<Thesis>>> {
    return this.http.post<ApiResponse<Thesis>>(`${this.apiUrl}/analyze`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(catchError(err => throwError(() => err)));
  }

  deleteThesis(thesisId: string): Observable<ApiResponse<null>> {
    return this.http
      .delete<ApiResponse<null>>(`${this.apiUrl}/${thesisId}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  downloadThesisPDF(thesisId: string): Observable<Blob> {
    // Pedimos la respuesta como un 'blob' que representa el archivo binario
    return this.http.get(`${this.apiUrl}/${thesisId}/download`, { responseType: 'blob' });
  }
}
