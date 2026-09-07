import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { UsersService } from '../../../core/services/auth/users.service';
import { AuthService }  from '../../../core/services/auth/auth.service';
import { ToastService }  from '../../../core/services/ui/toast.service';
import { User }          from '../../../core/interfaces/user.interface';

export type RoleFilter = 'all' | 'admin' | 'seller' | 'worker' | 'user' | 'affiliate';
export type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ── Estado Principal ──────────────────────────────────────────────────────
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = false;
  searchTerm = '';
  selectedRole: RoleFilter = 'all';
  selectedStatus: StatusFilter = 'all';

  // ── Roles Disponibles en el Sistema ───────────────────────────────────────
  readonly availableRoles = [
    { value: 'admin',     label: 'Administrador', icon: '👑', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'seller',    label: 'Vendedor',      icon: '🏪', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    { value: 'worker',    label: 'Colaborador',   icon: '👷', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'user',      label: 'Cliente',       icon: '🛍️', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'affiliate', label: 'Afiliado',      icon: '💎', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  ];

  // ── Modales ───────────────────────────────────────────────────────────────
  isCreateModalOpen = false;
  isRolesModalOpen  = false;
  isEditModalOpen   = false;
  isDeleteModalOpen = false;

  selectedUser: User | null = null;
  selectedUserRoles: string[] = [];
  isSaving = false;

  createForm!: FormGroup;
  editForm!:   FormGroup;

  // ── Estadísticas Computadas ───────────────────────────────────────────────
  get totalUsers(): number { return this.users.length; }
  get totalAdmins(): number { return this.users.filter(u => u.roles?.includes('admin')).length; }
  get totalSellers(): number { return this.users.filter(u => u.roles?.includes('seller')).length; }
  get totalWorkers(): number { return this.users.filter(u => u.roles?.includes('worker')).length; }
  get totalClients(): number { return this.users.filter(u => u.roles?.includes('user') && !u.roles?.includes('seller') && !u.roles?.includes('admin')).length; }
  get totalInactive(): number { return this.users.filter(u => u.isActive === false).length; }

  constructor(
    private readonly usersService: UsersService,
    private readonly authService:  AuthService,
    private readonly toastService: ToastService,
    private readonly fb:           FormBuilder,
    private readonly cdr:          ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Carga de Datos ───────────────────────────────────────────────────────
  loadUsers(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.usersService.getUsers()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al cargar usuarios', 'error');
          return of([]);
        })
      )
      .subscribe(data => {
        this.users = Array.isArray(data) ? data : [];
        this.applyFilters();
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  // ─── Filtrado Local ───────────────────────────────────────────────────────
  applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      // 1. Filtro por Rol
      if (this.selectedRole !== 'all') {
        if (!user.roles?.includes(this.selectedRole)) return false;
      }

      // 2. Filtro por Estado
      if (this.selectedStatus === 'active' && user.isActive === false) return false;
      if (this.selectedStatus === 'inactive' && user.isActive !== false) return false;

      // 3. Filtro por Búsqueda de Texto
      if (q) {
        const name  = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const phone = (user.phone || '').toLowerCase();
        const dni   = (user.dni || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || dni.includes(q);
      }

      return true;
    });

    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoleFilterChange(role: RoleFilter): void {
    this.selectedRole = role;
    this.applyFilters();
  }

  onStatusFilterChange(status: StatusFilter): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  // ─── Formularios ──────────────────────────────────────────────────────────
  private buildForms(): void {
    this.createForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email:       ['', [Validators.required, Validators.email]],
      password:    ['', [Validators.required, Validators.minLength(6)]],
      phone:       [''],
      dni:         [''],
      role:        ['user', Validators.required],
    });

    this.editForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      phone:       [''],
      dni:         [''],
    });
  }

  // ─── Crear Usuario ────────────────────────────────────────────────────────
  openCreateModal(): void {
    this.createForm.reset({ role: 'user' });
    this.isCreateModalOpen = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.isSaving = false;
    this.cdr.markForCheck();
  }

  submitCreateUser(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formVal = this.createForm.value;
    const dto = {
      displayName: formVal.displayName,
      email:       formVal.email,
      password:    formVal.password,
      phone:       formVal.phone || '',
      dni:         formVal.dni || '',
      roles:       [formVal.role],
    };

    this.usersService.createUser(dto)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al crear usuario', 'error');
          this.isSaving = false;
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe(newUser => {
        if (!newUser) return;
        this.toastService.show('¡Usuario creado exitosamente!', 'success');
        this.closeCreateModal();
        this.loadUsers();
      });
  }

  // ─── Modificar Roles ──────────────────────────────────────────────────────
  openRolesModal(user: User): void {
    this.selectedUser = user;
    this.selectedUserRoles = [...(user.roles || ['user'])];
    this.isRolesModalOpen = true;
    this.cdr.markForCheck();
  }

  closeRolesModal(): void {
    this.isRolesModalOpen = false;
    this.selectedUser = null;
    this.selectedUserRoles = [];
    this.isSaving = false;
    this.cdr.markForCheck();
  }

  hasRoleSelected(role: string): boolean {
    return this.selectedUserRoles.includes(role);
  }

  toggleRoleSelection(role: string): void {
    if (this.hasRoleSelected(role)) {
      // Evitar dejar al usuario sin ningún rol (mínimo 1)
      if (this.selectedUserRoles.length > 1) {
        this.selectedUserRoles = this.selectedUserRoles.filter(r => r !== role);
      } else {
        this.toastService.show('El usuario debe tener al menos un rol asignado.', 'warning');
      }
    } else {
      this.selectedUserRoles.push(role);
    }
    this.cdr.markForCheck();
  }

  saveUserRoles(): void {
    if (!this.selectedUser?._id) return;

    this.isSaving = true;
    this.usersService.updateUserRoles(this.selectedUser._id, this.selectedUserRoles)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al actualizar roles', 'error');
          this.isSaving = false;
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe(updated => {
        if (!updated) return;
        this.toastService.show('Roles actualizados correctamente.', 'success');
        this.closeRolesModal();
        this.loadUsers();
      });
  }

  // ─── Editar Usuario ───────────────────────────────────────────────────────
  openEditModal(user: User): void {
    this.selectedUser = user;
    this.editForm.patchValue({
      displayName: user.displayName || '',
      phone:       user.phone || '',
      dni:         user.dni || '',
    });
    this.isEditModalOpen = true;
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedUser = null;
    this.isSaving = false;
    this.cdr.markForCheck();
  }

  submitEditUser(): void {
    if (this.editForm.invalid || !this.selectedUser?._id) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.usersService.updateUser(this.selectedUser._id, this.editForm.value)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al actualizar perfil', 'error');
          this.isSaving = false;
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe(updated => {
        if (!updated) return;
        this.toastService.show('Perfil de usuario actualizado.', 'success');
        this.closeEditModal();
        this.loadUsers();
      });
  }

  // ─── Activar / Bloquear Usuario ───────────────────────────────────────────
  toggleUserActive(user: User): void {
    if (!user?._id) return;
    const newStatus = user.isActive === false;

    this.usersService.toggleUserStatus(user._id, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al cambiar estado', 'error');
          return of(null);
        })
      )
      .subscribe(updated => {
        if (!updated) return;
        user.isActive = newStatus;
        this.toastService.show(
          newStatus ? 'Usuario activado y habilitado.' : 'Usuario bloqueado / desactivado.',
          newStatus ? 'success' : 'warning'
        );
        this.applyFilters();
      });
  }

  // ─── Eliminar Usuario ─────────────────────────────────────────────────────
  openDeleteModal(user: User): void {
    this.selectedUser = user;
    this.isDeleteModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.selectedUser = null;
    this.isSaving = false;
    this.cdr.markForCheck();
  }

  confirmDeleteUser(): void {
    if (!this.selectedUser?._id) return;

    this.isSaving = true;
    this.usersService.deleteUser(this.selectedUser._id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al eliminar usuario', 'error');
          this.isSaving = false;
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe(res => {
        if (!res) return;
        this.toastService.show('Usuario eliminado permanentemente.', 'success');
        this.closeDeleteModal();
        this.loadUsers();
      });
  }

  // ─── Helpers Visuales ─────────────────────────────────────────────────────
  getRoleBadge(role: string): { label: string; icon: string; color: string } {
    const found = this.availableRoles.find(r => r.value === role);
    return found || { label: role, icon: '🏷️', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }

  getInitials(name?: string, email?: string): string {
    const source = (name || email || 'U').trim();
    const parts = source.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.substring(0, 2).toUpperCase();
  }
}
