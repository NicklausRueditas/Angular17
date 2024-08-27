import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginCredentials } from '../../core/interfaces/login/login.interface';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Verifica si ya existe un token en las cookies
    const token = this.getTokenFromCookies();

    if (token) {
      // Si hay un token, redirige automáticamente a la página de inicio
      this.router.navigate(['/home']);
    }

    // Inicialización del formulario
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onLogin() {
    if (this.loginForm.valid) {
      const credentials: LoginCredentials = this.loginForm.value as LoginCredentials;

      this.authService.login(credentials).subscribe(
        () => {
          // Redirige a la página de inicio después del inicio de sesión exitoso
          this.router.navigate(['/home']);
        },
        (error) => {
          console.error('Error en el inicio de sesión', error);
        }
      );
    } else {
      console.warn('El formulario no es válido');
    }
  }

  // Método para obtener el token desde las cookies (dejamos que el navegador lo gestione automáticamente)
  private getTokenFromCookies(): string | null {
    // Esto funciona porque las cookies son enviadas automáticamente por el navegador con `withCredentials`
    // Verificamos simplemente si la cookie de sesión existe
    const allCookies = document.cookie.split(';');
    const tokenCookie = allCookies.find(cookie => cookie.trim().startsWith('sessiontoken='));
    
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  }
}
