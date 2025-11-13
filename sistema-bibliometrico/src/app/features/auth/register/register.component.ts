import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  submitted = false;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordsIguales('password', 'confirmPassword')
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  private passwordsIguales(pass1: string, pass2: string) {
    return (formGroup: FormGroup) => {
      const c1 = formGroup.get(pass1);
      const c2 = formGroup.get(pass2);
      if (!c1 || !c2) return null;
      if (c2.errors && !c2.errors['passwordMismatch']) return null;
      if (c1.value !== c2.value) {
        c2.setErrors({ passwordMismatch: true });
      } else {
        c2.setErrors(null);
      }
      return null;
    };
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.error = '';

    const { nombre, email, password } = this.registerForm.getRawValue();

    this.authService.register(nombre, email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'No se pudo registrar';
      }
    });
  }
}
