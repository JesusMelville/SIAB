// src/app/features/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model'; // Asegúrate de importar el modelo User

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // Si ya hay un usuario logueado, lo redirigimos a su dashboard correspondiente
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.router.navigate([currentUser.role === 'admin' ? '/admin-dashboard' : '/dashboard']);
    }
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        // 🔹 Usamos la sintaxis de objeto para tener acceso al 'user'
        next: (user: User) => {
          // ✅ SOLUCIÓN: LÓGICA DE REDIRECCIÓN BASADA EN ROL
          if (user && user.role === 'admin') {
            // Si el usuario es administrador, lo enviamos al panel de admin.
            this.router.navigate(['/admin-dashboard']);
          } else {
            // Para cualquier otro rol, lo enviamos al dashboard normal.
            this.router.navigate([this.returnUrl]);
          }
        },
        error: err => {
          this.error = err.message || 'Email o contraseña incorrectos';
        }
      });
  }
}