import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`; // URL del backend en NestJS

  constructor(private http: HttpClient) {}

  /**
   * Redirige al usuario a la autenticación de Google.
   */
  signInWithGoogle(): void {
    window.location.href = `${this.apiUrl}/google`;
  }

  /**
   * Inicia sesión con email y contraseña.
   * @param email Email del usuario
   * @param password Contraseña del usuario
   * @returns Observable con la respuesta del backend
   */
  login(email: string, password: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/login`,
      { email, password },
      { withCredentials: true }
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }
}
