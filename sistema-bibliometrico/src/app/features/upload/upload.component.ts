// src/app/features/upload/upload.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ThesisService } from '../../core/services/thesis.service';
import { PdfService } from '../../core/services/pdf.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
  uploading = false;
  selectedFile: File | null = null;
  error = '';
  uploadProgress = 0;
  thesisForm!: FormGroup;
  isDragging = false;

  constructor(
    private thesisService: ThesisService,
    private pdfService: PdfService,
    private router: Router,
    private fb: FormBuilder,
    private location: Location // 1. Inyectar el servicio Location
  ) {}

  ngOnInit(): void {
    this.thesisForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(10)]],
      autor: ['', [Validators.required, Validators.minLength(5)]],
      anio: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear())]]
    });
  }

  // --- Getters para un acceso fácil en la plantilla ---
  get titulo() { return this.thesisForm.get('titulo'); }
  get autor() { return this.thesisForm.get('autor'); }
  get anio() { return this.thesisForm.get('anio'); }

  triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  // --- Manejadores de Drag and Drop ---
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.uploading) {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (this.uploading) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Solo procesamos el primer archivo si se arrastran varios
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  private async processFile(file: File): Promise<void> {
    if (file.type !== 'application/pdf') {
      this.error = 'Por favor selecciona un archivo PDF válido';
      return;
    }
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.error = 'El archivo es demasiado grande. El tamaño máximo es de 50MB.';
      return;
    }

    this.selectedFile = file;
    this.error = '';
    this.uploading = true;

    try {
      const metadata = await this.pdfService.getMetadata(file);
      this.thesisForm.patchValue({
        titulo: metadata.title || '',
        autor: metadata.author || '',
        anio: metadata.year
      });
    } catch (e: any) {
      console.error('Error extrayendo metadatos del PDF:', e);
      this.error = e.message || 'No se pudieron leer los metadatos del PDF. Por favor, verifica los datos manualmente.';
      this.thesisForm.patchValue({ anio: new Date().getFullYear() }); // Fallback para el año
    } finally {
      this.uploading = false;
    }
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      this.error = 'Por favor, selecciona un archivo PDF.';
      return;
    }
    if (this.thesisForm.invalid) {
      this.thesisForm.markAllAsTouched(); // Marca todos los campos como "tocados" para mostrar errores
      return; 
    }

    this.uploading = true;
    this.error = '';
    this.uploadProgress = 0;

    // 1. Crear un objeto FormData
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('titulo', this.thesisForm.value.titulo);
    formData.append('autor', this.thesisForm.value.autor);
    formData.append('anio', this.thesisForm.value.anio.toString());

    this.thesisService.analyzeNewThesis(formData)
      .pipe(finalize(() => this.uploading = false))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress = Math.round(100 * (event.loaded / event.total!));
          } else if (event.type === HttpEventType.Response) {
            const newThesis = event.body?.data;
            if (newThesis?._id) {
              this.router.navigate(['/diagnostic', newThesis._id]);
            } else {
              this.error = "La respuesta del servidor no fue la esperada.";
            }
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Ocurrió un error al procesar la tesis.';
          this.uploadProgress = 0;
        }
      });
  }

  removeFile(): void {
    this.selectedFile = null;
    this.error = '';
    this.uploadProgress = 0;
    this.thesisForm.reset({ anio: new Date().getFullYear() });
  }

  goBack(): void {
    // 2. Usar location.back() para una navegación más intuitiva
    this.location.back();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
