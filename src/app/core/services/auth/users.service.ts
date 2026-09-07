import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../../interfaces/user.interface';
import { SellerUser, CreateSellerUserDto } from '../../interfaces/seller.interface';

/**
 * Servicio integral de administración de usuarios (Exclusivo Admin).
 * Cubre todos los endpoints bajo /manage/users y /manage/user/.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly manageUrl = `${environment.apiUrl}/manage`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene la lista completa de todos los usuarios registrados en el sistema.
   * Incluye usuarios activos, inactivos y bloqueados.
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.manageUrl}/users`);
  }

  /**
   * Obtiene la información detallada de un usuario por su ID.
   * @param id - Identificador único de usuario en MongoDB
   */
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.manageUrl}/user/${id}`);
  }

  /**
   * Crea un nuevo usuario asignándole un rol específico.
   * @param dto - Datos del usuario y roles iniciales
   */
  createUser(dto: CreateSellerUserDto | any): Observable<User> {
    return this.http.post<User>(`${this.manageUrl}/user/create`, dto);
  }

  /**
   * Actualiza datos de perfil de un usuario (nombre, teléfono, DNI).
   * @param id - ID del usuario a modificar
   * @param dto - Campos parciales a actualizar
   */
  updateUser(id: string, dto: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.manageUrl}/user/${id}`, dto);
  }

  /**
   * Modifica y asigna los roles autorizados a un usuario.
   * @param id - ID del usuario
   * @param roles - Array de roles ('user', 'seller', 'worker', 'admin', 'affiliate')
   */
  updateUserRoles(id: string, roles: string[]): Observable<User> {
    return this.http.patch<User>(`${this.manageUrl}/user/${id}/roles`, { roles });
  }

  /**
   * Alterna el estado activo o bloqueado de un usuario en el sistema.
   * @param id - ID del usuario
   * @param isActive - true para habilitar, false para bloquear/desactivar
   */
  toggleUserStatus(id: string, isActive: boolean): Observable<User> {
    return this.http.patch<User>(`${this.manageUrl}/user/${id}/toggle-status`, { isActive });
  }

  /**
   * Desactiva un usuario (soft delete).
   * @param id - ID del usuario a desactivar
   */
  deactivateUser(id: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.manageUrl}/user/${id}/deactivate`, {});
  }

  /**
   * Elimina permanentemente a un usuario de la base de datos.
   * @param id - ID del usuario a eliminar
   */
  deleteUser(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.manageUrl}/user/${id}`);
  }
}
