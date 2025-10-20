// src/app/features/diagnostic/diagnostic.component.ts
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // 🔹 Añadimos RouterModule
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BaseChartDirective } from 'ng2-charts'; // 🔹 Añadimos BaseChartDirective
import { Chart, ChartConfiguration, ChartData, ChartType, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { ThesisService } from '../../core/services/thesis.service';
import { Thesis } from '../../core/models/thesis.model';
import { DownloadService } from '../../core/services/download.service';
import { Metrics } from '../../core/models/metrics.model';
import { ApiResponse } from '../../core/models/api-response.model';

// 1. Registrar los componentes necesarios para el gráfico de radar
Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-diagnostic',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective], // 🔹 Añadimos RouterModule y BaseChartDirective
  templateUrl: './diagnostic.component.html',
  styleUrls: ['./diagnostic.component.css']
})
export class DiagnosticComponent implements OnInit {
  loading = true;
  error = '';
  thesis: Thesis | null = null;
  metrics: Metrics | null = null;
  isSilentDownload = false; // Nueva propiedad para controlar la visibilidad

  // 2. Obtener una referencia al gráfico desde la plantilla
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Configuración para el gráfico de radar (puntajes)
  public radarChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      r: {
        angleLines: {
          color: '#e2e8f0' // Color de las líneas que van del centro a las esquinas
        },
        grid: {
          color: '#e2e8f0'
        },
        suggestedMin: 0,
        suggestedMax: 100, // La escala ahora es 0-100
        pointLabels: {
          font: {
            family: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            size: 13,
            weight: 600
          },
          color: '#4a5568' // Color del texto de las etiquetas (Citas, Fuentes, etc.)
        },
        ticks: {
          stepSize: 20,
          backdropColor: 'rgba(255, 255, 255, 0.75)',
          backdropPadding: 5,
          color: '#718096', // Color de los números de la escala (20, 40, 60...)
          font: {
            weight: 500
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.r !== null) {
              // Redondear el puntaje para una mejor visualización
              label += Math.round(context.parsed.r * 100) / 100;
            }
            return label;
          }
        }
      }
    }
  };
  public radarChartType: ChartType = 'radar';
  public radarChartData: ChartData<'radar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Puntajes',
        backgroundColor: 'rgba(102, 126, 234, 0.2)', // Color del área interior del radar
        borderColor: '#667eea', // Color del borde del radar
        pointBorderColor: '#fff', // Color del borde de los puntos
        pointHoverBackgroundColor: '#fff', // Color de relleno de los puntos al pasar el mouse
        pointHoverBorderColor: '#667eea' // Color del borde de los puntos al pasar el mouse
      }
    ]
  };

  private downloadService = inject(DownloadService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private thesisService: ThesisService
  ) {}

  ngOnInit(): void {
    const thesisId = this.route.snapshot.paramMap.get('id');
    // Comprobamos si es una descarga "silenciosa"
    this.isSilentDownload = this.route.snapshot.queryParamMap.get('download') === 'true' && this.route.snapshot.queryParamMap.get('redirect') === 'true';

    if (!thesisId) {
      this.error = 'No se encontró el ID de la tesis en la URL.';
      this.loading = false;
      return;
    }
    this.loadDiagnosticData(thesisId);
  }

  loadDiagnosticData(id: string): void {
    this.loading = true;
    this.thesisService.getThesisById(id).subscribe({
      next: (response: ApiResponse<Thesis>) => {
        if (response.success && response.data) {
          this.thesis = response.data;
          
          // Verificación segura de que la propiedad 'metrics' existe
          if (response.data.metrics) {
            this.metrics = response.data.metrics;
            this.setupCharts();

            // ✅ Si el query param 'download' es true, iniciamos la descarga.
            if (this.route.snapshot.queryParamMap.get('download') === 'true') {
              // Usamos un pequeño timeout para asegurar que el DOM esté completamente renderizado.
              setTimeout(() => {
                const shouldRedirect = this.route.snapshot.queryParamMap.get('redirect') === 'true';
                this.downloadReport(shouldRedirect);
              }, 500);
            }
          } else {
            this.error = 'Los datos de diagnóstico para esta tesis aún no están disponibles.';
          }
        } else {
          this.error = 'No se pudieron cargar los datos de la tesis.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Error al conectar con el servidor.';
        this.loading = false;
      }
    });
  }

  setupCharts(): void {
    // Asegurarnos de que las métricas y los puntajes existan
    if (this.metrics?.puntajes) {
      const { total, ...puntajesDesglose } = this.metrics.puntajes; // Clonamos para no modificar
      
      // Capitalizar las etiquetas para que se vean mejor en el gráfico
      const labels = Object.keys(puntajesDesglose).map(key => 
        key === 'auc_roc' ? 'AUC ROC' : key.charAt(0).toUpperCase() + key.slice(1)
      );
      const data = Object.values(puntajesDesglose);
      
      this.radarChartData.labels = labels;
      this.radarChartData.datasets[0].data = data;
      this.chart?.update(); // Forzar actualización del gráfico
    }
  }

  // Nuevo método para la cuadrícula de puntajes
  getIndividualScores(): { label: string, value: number }[] {
    if (!this.metrics?.puntajes) return [];

    const { total, ...scores } = this.metrics.puntajes;
    return Object.entries(scores).map(([key, value]) => ({
      label: key === 'auc_roc' ? 'AUC ROC' : key.charAt(0).toUpperCase() + key.slice(1),
      value: value as number
    }));
  }

  // --- Nuevos métodos para el resumen del análisis ---
  getStrongestArea(): string {
    const scores = this.getIndividualScores();
    if (scores.length === 0) return 'N/A';
    const strongest = scores.reduce((max, score) => score.value > max.value ? score : max, scores[0]);
    return strongest.label;
  }

  getWeakestArea(): string {
    const scores = this.getIndividualScores();
    if (scores.length === 0) return 'N/A';
    // Excluimos AUC ROC para encontrar el área de mejora más relevante
    const relevantScores = scores.filter(s => s.label !== 'AUC ROC');
    if (relevantScores.length === 0) return 'ninguna en particular';
    
    const weakest = relevantScores.reduce((min, score) => score.value < min.value ? score : min, relevantScores[0]);
    return weakest.label;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  downloadReport(redirectBack: boolean = false): void {
    const reportElement = document.getElementById('diagnosticReport');
    if (!reportElement) {
      console.error('No se encontró el elemento del reporte para descargar.');
      return;
    }

    // Ocultar botones para que no aparezcan en la captura
    const buttonsToHide = reportElement.querySelectorAll('button');
    buttonsToHide.forEach(btn => (btn.style.display = 'none'));

    html2canvas(reportElement, {
      scale: 2, // Aumenta la escala para mejor calidad de imagen
      useCORS: true,
      logging: false
    }).then(canvas => {
      // Volver a mostrar los botones después de la captura
      buttonsToHide.forEach(btn => (btn.style.display = ''));

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const margin = 40;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      let yPos = margin;

      // --- 1. Añadir Encabezado ---
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Reporte de Diagnóstico Bibliométrico', pdfWidth / 2, yPos, { align: 'center' });
      yPos += 30;

      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pdfWidth - margin, yPos);
      yPos += 20;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Tesis: ${this.thesis?.titulo}`, margin, yPos, { maxWidth: contentWidth });
      yPos += 30; // Espacio extra para títulos largos

      // --- 2. Añadir Contenido Principal (la imagen) ---
      pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, contentHeight);

      // --- 3. Añadir Pie de Página ---
      const pageCount = pdf.getNumberOfPages();
      pdf.setFontSize(9);
      pdf.setTextColor(150);
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.text(`Página ${i} de ${pageCount}`, pdfWidth - margin, pdfHeight - margin + 10, { align: 'right' });
        pdf.text(`Generado el: ${new Date().toLocaleDateString()}`, margin, pdfHeight - margin + 10, { align: 'left' });
      }
      
      const fileName = `Diagnostico_${this.thesis?.titulo.slice(0, 20).replace(/\s/g, '_') || 'reporte'}.pdf`;
      pdf.save(fileName);

      // ✅ Si se indicó, regresamos al dashboard después de la descarga.
      if (redirectBack) {
        this.downloadService.notifyComplete();
        this.goBack();
      }
    }).catch(err => {
      buttonsToHide.forEach(btn => (btn.style.display = ''));
      console.error('Error al generar el PDF:', err);
      this.error = 'No se pudo generar el PDF del reporte.';
      if (redirectBack) this.downloadService.notifyComplete();
    });
  }
}