// src/app/features/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { User } from '../../../core/models/user.model';
import { ApiResponse } from '../../../core/models/api-response.model';

interface DashboardStats {
  totalUsers: number;
  totalThesis: number;
  totalThisMonth: number;
  averageScore: number;
  usersByRole: { [key: string]: number };
  thesisByCategory: { [key: string]: number };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null;
  loading = true;

  stats: DashboardStats = {
    totalUsers: 0,
    totalThesis: 0,
    totalThisMonth: 0,
    averageScore: 0,
    usersByRole: {},
    thesisByCategory: {},
  };

  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm = '';
  selectedRole = '';

  showEditModal = false;
  editingUser: User | null = null;

  showDeleteModal = false;
  deletingUser: User | null = null;

  recentActivities: any[] = [];
  activeView: 'overview' | 'users' | 'activity' = 'overview';

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUserValue;
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    forkJoin({
      stats: this.adminService.getAdminStats(),
      users: this.adminService.getAllUsers(),
      activity: this.adminService.getRecentActivity(),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ stats, users, activity }) => {
          if (stats.success && stats.data) {
            this.stats = stats.data;
          }
          if (users.success && users.data) {
            this.users = users.data;
            this.filterUsers();
          }
          if (activity.success && activity.data) {
            this.recentActivities = activity.data;
          }
        },
        error: (error: any) => {
          console.error('Error al cargar los datos del dashboard:', error);
        },
      });
  }

  filterUsers(): void {
    let filtered = this.users;
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter((user) => {
        const name = (user.nombre || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(search) || email.includes(search);
      });
    }
    if (this.selectedRole) {
      filtered = filtered.filter((user) => user.role === this.selectedRole);
    }
    this.filteredUsers = filtered;
  }

  saveUser(): void {
    if (!this.editingUser?._id) return;
    this.adminService
      .updateUser(this.editingUser._id, this.editingUser)
      .subscribe({
        next: (response: ApiResponse<User>) => {
          if (response.success && response.data) {
            const index = this.users.findIndex(
              (u) => u._id === this.editingUser!._id
            );
            if (index !== -1) this.users[index] = response.data;
            this.filterUsers();
            this.closeEditModal();
          }
        },
        error: (error: any) =>
          console.error('Error al actualizar usuario:', error),
      });
  }

  confirmDelete(): void {
    if (!this.deletingUser?._id) return;
    this.adminService.deleteUser(this.deletingUser._id).subscribe({
      next: (response: ApiResponse<null>) => {
        if (response.success) {
          this.users = this.users.filter(
            (u) => u._id !== this.deletingUser!._id
          );
          this.filterUsers();
          this.closeDeleteModal();
          this.loadDashboardData();
        }
      },
      error: (error: any) => console.error('Error al eliminar usuario:', error),
    });
  }

  toggleUserStatus(user: User): void {
    if (!user._id) return;
    const newStatus = !user.isActive;
    this.adminService
      .updateUser(user._id, { isActive: newStatus })
      .subscribe({
        next: (response: ApiResponse<User>) => {
          if (response.success && response.data) {
            user.isActive = response.data.isActive;
          }
        },
        error: (error: any) =>
          console.error('Error al cambiar estado:', error),
      });
  }

  setActiveView(view: 'overview' | 'users' | 'activity'): void {
    this.activeView = view;
  }

  openEditModal(user: User): void {
    this.editingUser = { ...user };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
  }

  openDeleteModal(user: User): void {
    this.deletingUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingUser = null;
  }

  getRoleBadgeClass(role: string): string {
    const classes: any = {
      admin: 'badge-admin',
      docente: 'badge-docente',
      investigador: 'badge-investigador',
    };
    return classes[role] || 'badge-default';
  }

  getRoleLabel(role: string): string {
    const labels: any = {
      admin: 'Administrador',
      docente: 'Docente',
      investigador: 'Investigador',
    };
    return labels[role] || role;
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToRegularDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
