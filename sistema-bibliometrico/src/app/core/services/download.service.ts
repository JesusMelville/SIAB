// src/app/core/services/download.service.ts
import { Injectable } from '@angular/core';
import { ThesisService } from './thesis.service';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  constructor(private thesisService: ThesisService) {}

  downloadThesisPdf(id: string, filename?: string) {
    this.thesisService.download(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `tesis-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar PDF', err);
      },
    });
  }
}
