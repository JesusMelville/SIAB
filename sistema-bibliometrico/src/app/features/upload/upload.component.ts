import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ThesisService } from '../../core/services/thesis.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  thesisForm: FormGroup;
  selectedFile: File | null = null;
  isDragging = false;
  uploading = false;
  uploadProgress = 0;
  error = '';

  constructor(
    private fb: FormBuilder,
    private thesisService: ThesisService,
    private router: Router
  ) {
    this.thesisForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(10)]],
      autor: ['', [Validators.required, Validators.minLength(5)]],
      anio: [
        new Date().getFullYear(),
        [Validators.required, Validators.min(1990), Validators.max(2100)],
      ],
    });
  }

  get titulo() { return this.thesisForm.get('titulo'); }
  get autor() { return this.thesisForm.get('autor'); }
  get anio() { return this.thesisForm.get('anio'); }

  triggerFileInput(input: HTMLInputElement): void {
    input.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.selectedFile = input.files[0];
    this.error = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      this.error = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  onSubmit(): void {
    if (this.thesisForm.invalid || !this.selectedFile) {
      this.error = 'Completa los campos y sube el PDF.';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('titulo', this.thesisForm.value.titulo);
    formData.append('autor', this.thesisForm.value.autor);
    formData.append('anio', this.thesisForm.value.anio);

    this.uploading = true;
    this.error = '';

    this.thesisService.uploadAndAnalyze(formData).subscribe({
      next: (res) => {
        this.uploading = false;
        const thesisId = res?.data?._id;
        if (thesisId) {
          // ✅ ir directo al diagnóstico
          this.router.navigate(['/diagnostic', thesisId]);
        } else {
          this.error = 'Se analizó la tesis pero no llegó el ID.';
        }
      },
      error: (err) => {
        this.uploading = false;
        this.error = err?.error?.message || 'Error al analizar la tesis.';
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
