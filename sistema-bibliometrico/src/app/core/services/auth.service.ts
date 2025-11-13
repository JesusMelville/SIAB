import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserKey = 'currentUser';
  private tokenKey = 'token';

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get currentUserValue(): User | null {
    const raw = localStorage.getItem(this.currentUserKey);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  login(email: string, password: string): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (res.success && res.data && (res as any).token) {
          // tu backend manda { success, data: user, token }
          localStorage.setItem(this.tokenKey, (res as any).token);
          localStorage.setItem(this.currentUserKey, JSON.stringify(res.data));
        }
      })
    );
  }

  register(nombre: string, email: string, password: string): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/register`, { nombre, email, password });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.currentUserKey);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }
}
