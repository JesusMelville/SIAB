import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Thesis } from '../models/thesis.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/tesis`;

  constructor(private http: HttpClient) {}

  getTheses(page: number, limit: number): Observable<Thesis[]> {
    return this.http.get<Thesis[]>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  getStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }
}
