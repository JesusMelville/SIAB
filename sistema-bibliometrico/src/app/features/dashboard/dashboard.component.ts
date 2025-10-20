import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ThesisService } from '../../core/services/thesis.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { DownloadService } from '../../core/services/download.service';
import { Thesis } from '../../core/models/thesis.model';
import { Statistics } from '../../core/models/statistics.model';
import { User } from '../../core/models/user.model';
import { ApiResponse } from '../../core/models/api-response.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  animations: [
    trigger('listAnimation', [
      transition('* => *', [ // Se activa cada vez que cambia el estado de la lista
        query(':enter', [ // Selecciona los nuevos elementos que entran en el DOM
          style({ transform: 'translateY(20px)', opacity: 0 }),
          stagger('100ms', [ // Aplica un retraso de 100ms entre cada elemento
            animate('0.5s ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  Math = Math;

  thesisList: Thesis[] = [];
  statistics: Statistics = {
    total: 0,
    promedio: 0,
    categorias: {},
    thisMonth: 0
  };
  loading = true;
  currentUser: User | null;

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalTheses = 0;

  isDownloading = false;

  searchTerm = '';
  selectedYear: number | null = null;
  years: number[] = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i);

  constructor(
    private thesisService: ThesisService,
    private authService: AuthService,
    private router: Router,
    private downloadService: DownloadService,
    private toastService: ToastService // ✅ Inyectar el servicio de toast
  ) {
    this.currentUser = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.loadStatistics();
    this.loadTheses();
  }

  loadStatistics(): void {
    this.thesisService.getStatistics().subscribe({
      next: (res: ApiResponse<Statistics>) => {
        if (res.success && res.data) this.statistics = res.data;
      },
      error: (err: any) => console.error('Error al cargar estadísticas:', err)
    });
  }

  loadTheses(): void {
    this.loading = true;
    const filters: Record<string, any> = {};
    if (this.selectedYear) filters['anio'] = this.selectedYear;
    if (this.searchTerm.trim()) filters['search'] = this.searchTerm.trim();

    this.thesisService.getAllTheses(this.currentPage, this.pageSize, filters).subscribe({
      next: (res: ApiResponse<Thesis[]>) => {
        if (res.success && res.data) {
          this.thesisList = res.data;
          this.totalTheses = res.pagination?.total ?? 0;
          this.totalPages = res.pagination?.pages ?? 0;
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar tesis:', err);
        this.loading = false;
      }
    });
  }

  // --- Filtros y paginación ---
  onSearch(): void { this.currentPage = 1; this.loadTheses(); }
  onFilterChange(): void { this.currentPage = 1; this.loadTheses(); }
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedYear = null;
    this.currentPage = 1;
    this.loadTheses();
  }
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTheses();
    }
  }

  // --- Acciones del usuario ---
  viewDiagnostic(thesisId: string): void { this.router.navigate(['/diagnostic', thesisId]); }
  
  downloadDiagnostic(thesis: Thesis): void {
    if (!thesis._id) return;
    this.isDownloading = true;

    // Nos suscribimos para saber cuándo termina la descarga
    const sub = this.downloadService.downloadComplete$.subscribe(() => {
      this.isDownloading = false;
      sub.unsubscribe();
    });

    // Navegamos a la página de diagnóstico y pasamos un query param para iniciar la descarga.
    this.router.navigate(['/diagnostic', thesis._id], { 
      queryParams: { download: 'true', redirect: 'true' } 
    });
  }

  goToUpload(): void { this.router.navigate(['/upload']); }
  logout(): void { this.authService.logout(); }

  // --- Helpers ---
  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  getCategoryClass(category: string): string {
    switch (category?.toLowerCase()) {
      case 'excelente': return 'badge-excellent';
      case 'buena': return 'badge-good';
      case 'regular': return 'badge-regular';
      case 'deficiente': return 'badge-poor';
      default: return '';
    }
  }

  // En tu archivo dashboard.component.ts
  
    // ... (asegúrate de que ThesisService esté inyectado en tu constructor)
  
    // ... (tus otros métodos como ngOnInit, loadTheses, etc.)
  
    /**
     * Elimina una tesis por su ID después de una confirmación.
     */
    deleteThesis(id: string): void {
      // Preguntar al usuario para confirmar la acción
      if (confirm('¿Estás seguro de que quieres eliminar esta tesis? Esta acción no se puede deshacer.')) {
        this.thesisService.deleteThesis(id).subscribe({
          next: () => {
            this.toastService.show('Tesis eliminada exitosamente', 'success');
            // Volver a cargar la lista de tesis para reflejar el cambio
            this.loadTheses(); 
          },
          error: (err) => {
            console.error('Error al eliminar la tesis:', err);
            this.toastService.show('No se pudo eliminar la tesis. Por favor, inténtalo de nuevo.', 'error');
          }
        });
      }
    }
  
    // ... (el resto de tu componente)
  
}
