import { HttpEvent, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional que añade el token de autenticación a las peticiones salientes.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    // Clona la petición para añadir la nueva cabecera de autorización.
    const clonedReq = req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
    return next(clonedReq);
  }
  return next(req);
};