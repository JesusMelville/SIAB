import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { ThesisService } from '../../core/services/thesis.service';
import { DownloadService } from '../../core/services/download.service';
import { AuthService } from '../../core/services/auth.service';
import { Statistics } from '../../core/models/statistics.model';
import { Thesis } from '../../core/models/thesis.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  Math = Math; // para el template

  currentUser: any = null;

  statistics: Statistics = {
    total: 0,
    promedio: 0,
    categorias: {},
    thisMonth: 0,
  };

  allTheses: Thesis[] = [];
  viewTheses: Thesis[] = [];
  loading = true;

  searchTerm = '';
  selectedYear: number | null = null;
  years: number[] = [];

  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  isDownloading = false;

  constructor(
    private dashboardService: DashboardService,
    private thesisService: ThesisService,
    private downloadService: DownloadService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadStats();
    this.loadTheses();
  }

  private loadStats(): void {
    this.dashboardService.getMyStats().subscribe({
      next: (res) => {
        const data = res.data || (res as any);
        this.statistics = {
          total: data.total ?? 0,
          promedio: data.promedio ?? 0,
          categorias: data.categorias ?? {},
          thisMonth: data.thisMonth ?? 0,
        };
      },
    });
  }

  private loadTheses(): void {
    this.loading = true;
    this.thesisService.getMyTheses().subscribe({
      next: (res) => {
        const data = res.data || (res as any);
        this.allTheses = data || [];
        this.years = Array.from(
          new Set(this.allTheses.map((t) => t.anio).filter(Boolean))
        ).sort((a, b) => b - a);
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get thesisList(): Thesis[] {
    return this.viewTheses;
  }

  get totalTheses(): number {
    return this.allTheses.length;
  }

  applyFilters(): void {
    let list = [...this.allTheses];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.titulo.toLowerCase().includes(term) ||
          t.autor.toLowerCase().includes(term)
      );
    }
    if (this.selectedYear) {
      list = list.filter((t) => t.anio === this.selectedYear);
    }
    this.totalPages = Math.max(1, Math.ceil(list.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.viewTheses = list.slice(start, end);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedYear = null;
    this.currentPage = 1;
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  truncateText(text: string, max: number): string {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  viewDiagnostic(id: string): void {
    this.router.navigate(['/diagnostic', id]);
  }

  downloadDiagnostic(t: Thesis): void {
    if (!t._id) return;
    this.isDownloading = true;
    this.downloadService.downloadThesisPdf(t._id, t.fileName);
    this.isDownloading = false;
  }

  deleteThesis(id: string): void {
    if (!id) return;
    this.thesisService.delete(id).subscribe({
      next: () => this.loadTheses(),
    });
  }

  goToUpload(): void {
    this.router.navigate(['/upload']);
  }

  getCategoryClass(cat: string): string {
    switch (cat) {
      case 'Excelente':
        return 'badge-excellent';
      case 'Buena':
        return 'badge-good';
      case 'Regular':
        return 'badge-regular';
      default:
        return 'badge-bad';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
