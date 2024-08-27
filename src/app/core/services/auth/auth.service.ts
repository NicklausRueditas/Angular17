import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginCredentials, LoginResponse } from '../../interfaces/login/login.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000'; // URL de tu API

  constructor(private http: HttpClient) {}

  // Usa LoginCredentials para tipar las credenciales de inicio de sesión
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true });
  }

  // Otras funciones como register, logout...
}
