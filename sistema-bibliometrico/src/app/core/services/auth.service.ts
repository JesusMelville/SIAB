import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

// Interfaz que define la estructura de la respuesta de la API de Node.js
interface AuthResponse {
  status: string;
  token: string;
  data: {
    user: User;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Al iniciar el servicio, intenta cargar el usuario desde localStorage
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  /**
   * Retorna el valor actual del usuario autenticado.
   */
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Realiza la petición de login al backend.
   * @param email El email del usuario.
   * @param password La contraseña del usuario.
   * @returns Un Observable con el usuario autenticado.
   */
  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      map(response => {
        const user = response.data.user;
        if (user) {
          // Asigna el token de la respuesta al objeto de usuario antes de guardarlo
          user.token = response.token;
          this.storeUser(user);
        }
        return user;
      }),
      catchError(err => {
        // Propaga un error claro para que el componente lo muestre
        return throwError(() => new Error(err.error?.message || 'Email o contraseña incorrectos'));
      })
    );
  }

  /**
   * Realiza la petición de registro al backend.
   * @param userData Objeto con nombre, email y password.
   * @returns Un Observable con el nuevo usuario creado y autenticado.
   */
  register(userData: { nombre: string; email: string; password: string }): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      map(response => {
        const user = response.data.user;
        if (user) {
          user.token = response.token;
          this.storeUser(user);
        }
        return user;
      }),
      catchError(err => {
        // Propaga un error claro
        return throwError(() => new Error(err.error?.message || 'Error al registrar usuario'));
      })
    );
  }

  /**
   * Cierra la sesión del usuario.
   */
  logout(): void {
    // Elimina los datos del usuario de localStorage
    localStorage.removeItem('currentUser');
    // Emite null para notificar a toda la app que no hay usuario
    this.currentUserSubject.next(null);
    // Redirige a la página de login
    this.router.navigate(['/login']);
  }

  /**
   * Verifica si hay un usuario autenticado.
   * @returns `true` si hay un token válido, `false` en caso contrario.
   */
  isAuthenticated(): boolean {
    return !!this.currentUserValue?.token;
  }

  /**
   * Retorna el token JWT del usuario actual.
   * @returns El token como string, o null si no hay usuario.
   */
  getToken(): string | null {
    return this.currentUserValue?.token || null;
  }


  /**
   * Método privado para guardar el usuario en localStorage y notificar a los suscriptores.
   * @param user El objeto de usuario a guardar.
   */
  private storeUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }
}