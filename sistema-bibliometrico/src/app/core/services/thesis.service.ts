import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Thesis } from '../models/thesis.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ThesisService {
  private apiUrl = `${environment.apiUrl}/tesis`;

  constructor(private http: HttpClient) {}

  uploadAndAnalyze(formData: FormData): Observable<ApiResponse<Thesis>> {
    return this.http.post<ApiResponse<Thesis>>(`${this.apiUrl}/analyze`, formData);
  }

  getMyTheses(): Observable<ApiResponse<Thesis[]>> {
    return this.http.get<ApiResponse<Thesis[]>>(`${this.apiUrl}/mine`);
  }

  // nombre original
  getById(id: string): Observable<ApiResponse<Thesis>> {
    return this.http.get<ApiResponse<Thesis>>(`${this.apiUrl}/${id}`);
  }

  // ✅ alias para que el diagnostic no reviente
  getThesisById(id: string): Observable<ApiResponse<Thesis>> {
    return this.getById(id);
  }

  delete(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      responseType: 'blob',
    });
  }
}
