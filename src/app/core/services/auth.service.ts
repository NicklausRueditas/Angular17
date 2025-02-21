import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`; // URL base del backend en NestJS
  constructor(private http: HttpClient) {}

  /**
   * 🔗 Redirige al usuario al flujo de autenticación con Google.
   */
  signInWithGoogle(): void {
    window.location.href = `${this.apiUrl}/google`;
  }

  /**
   * 🔐 Inicia sesión con email y contraseña.
   * @param email Email del usuario
   * @param password Contraseña del usuario
   * @returns Observable con la respuesta del backend
   */
  login(email: string, password: string): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/login`,
        { email, password },
        { withCredentials: true }
      )
      .pipe(
        map((response: any) => {
          return response;
        })
      );
  }

  /**
   * 🚪 Cierra la sesión del usuario y borra el estado de autenticación.
   * @returns Observable con la respuesta del backend.
   */

  logout(): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        map((response) => {
          return response;
        })
      );
  }
}
