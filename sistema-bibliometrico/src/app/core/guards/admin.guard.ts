import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(
        private router: Router,
        private authService: AuthService
    ) {}

    canActivate() {
        const currentUser = this.authService.currentUserValue;

        // Comprueba si hay un usuario logueado Y si su rol es 'admin'
        if (currentUser && currentUser.role === 'admin') {
            return true; // Permite el acceso
        }

        // Si no es admin, redirige al dashboard normal y bloquea el acceso
        this.router.navigate(['/dashboard']);
        return false;
    }
}