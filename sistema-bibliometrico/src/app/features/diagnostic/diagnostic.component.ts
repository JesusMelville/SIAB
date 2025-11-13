// src/app/features/diagnostic/diagnostic.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisService } from '../../core/services/thesis.service';
import { PdfService } from '../../core/services/pdf.service';
import { Thesis } from '../../core/models/thesis.model';
import { Metrics } from '../../core/models/metrics.model';

@Component({
  selector: 'app-diagnostic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagnostic.component.html',
  styleUrls: ['./diagnostic.component.css'],
})
export class DiagnosticComponent implements OnInit {
  loading = true;
  error = '';
  thesis: Thesis | null = null;
  metrics: Metrics | null = null;
  isSilentDownload = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private thesisService: ThesisService,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'No se encontró la tesis.';
      this.loading = false;
      return;
    }

    this.thesisService.getById(id).subscribe({
      next: (res) => {
        const data = res.data || (res as any).data;
        this.thesis = data;
        this.metrics = data?.metrics || null;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar el diagnóstico.';
        this.loading = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  async downloadReport(): Promise<void> {
    this.isSilentDownload = true;
    // nombre amistoso
    const name =
      this.thesis?.titulo
        ? `diagnostico-${this.thesis.titulo.replace(/[^a-z0-9áéíóúñ ]/gi, '').slice(0, 60)}.pdf`
        : 'diagnostico.pdf';

    await this.pdfService.downloadElement('diagnosticReport', name);
    this.isSilentDownload = false;
  }

  getStrongestArea(): string {
    if (!this.metrics?.puntajes) return '—';
    const p = this.metrics.puntajes;
    const entries = [
      { name: 'Citación', v: p.citacion ?? 0 },
      { name: 'Metodología', v: p.metodologia ?? 0 },
      { name: 'Innovación', v: p.innovacion ?? 0 },
      { name: 'Técnicas', v: p.tecnicas ?? 0 },
      { name: 'Resultados', v: p.resultados ?? 0 },
    ];
    return entries.sort((a, b) => b.v - a.v)[0].name;
  }

  getWeakestArea(): string {
    if (!this.metrics?.puntajes) return '—';
    const p = this.metrics.puntajes;
    const entries = [
      { name: 'Citación', v: p.citacion ?? 0 },
      { name: 'Metodología', v: p.metodologia ?? 0 },
      { name: 'Innovación', v: p.innovacion ?? 0 },
      { name: 'Técnicas', v: p.tecnicas ?? 0 },
      { name: 'Resultados', v: p.resultados ?? 0 },
    ];
    return entries.sort((a, b) => a.v - b.v)[0].name;
  }

  getIndividualScores(): Array<{ label: string; value: number }> {
    if (!this.metrics?.puntajes) return [];
    const p = this.metrics.puntajes;
    return [
      { label: 'Citación', value: p.citacion ?? 0 },
      { label: 'Metodología', value: p.metodologia ?? 0 },
      { label: 'Innovación', value: p.innovacion ?? 0 },
      { label: 'Técnicas', value: p.tecnicas ?? 0 },
      { label: 'Resultados', value: p.resultados ?? 0 },
    ];
  }
}
