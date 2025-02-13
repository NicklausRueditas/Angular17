import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { BehaviorSubject, Observable, catchError, tap, of } from 'rxjs';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root',
})
export class SesionService {
  private readonly apiUrl = `${environment.apiUrl}/sesion/profile`;

  /** 🔄 Estado reactivo del usuario */
  private userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable(); // 🔍 Observable de solo lectura

  constructor(private http: HttpClient) {}

  /** 🔄 Obtiene el usuario desde la API si es necesario */
  getUserProfile(): Observable<User | null> {
    if (!this.userSubject.value) {
      return this.http.get<User>(this.apiUrl, { withCredentials: true }).pipe(
        tap(this.userSubject.next.bind(this.userSubject)), // ✅ Asigna el usuario directamente
        catchError((error) => {
          console.error('❌ Error al obtener el perfil:', error);
          return of(null); // 🔄 Evita que se rompa el flujo en caso de error
        })
      );
    }

    return this.user$; // 📌 Retorna el usuario almacenado
  }
}
