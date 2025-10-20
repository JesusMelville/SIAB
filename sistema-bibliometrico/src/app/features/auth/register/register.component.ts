// src/app/features/auth/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

/**
 * Validador personalizado para asegurar que los campos de contraseña y confirmación coincidan.
 * @returns ValidatorFn
 */
export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    // Si los campos no existen o el campo de confirmación está vacío, no hacer nada.
    if (!password || !confirmPassword || !confirmPassword.value) {
      return null;
    }

    // Si los valores no coinciden, se establece el error en el campo 'confirmPassword'.
    if (password.value !== confirmPassword.value) {
      // Usamos 'setErrors' para que el error se asocie directamente al control.
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true }; // También se puede devolver el error al formulario principal.
    }

    // Si coinciden, nos aseguramos de que no haya error.
    confirmPassword.setErrors(null);
    return null;
  };
}


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Redirigir si ya está autenticado
    if (this.authService.currentUserValue) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      // Se aplica el validador a nivel de grupo de formulario.
      validators: passwordMatchValidator()
    });
  }

  // Getter para acceder fácilmente a los controles del formulario en el template.
  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // Detener si el formulario es inválido.
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    // Excluimos 'confirmPassword' de los datos que se envían al backend.
    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.authService.register(registerData)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          // Si el registro es exitoso, redirigir al dashboard.
          this.router.navigate(['/dashboard']);
        },
        error: err => {
          // Mostrar el mensaje de error que viene del backend.
          this.error = err.message || 'Ocurrió un error al registrar el usuario.';
        }
      });
  }
}