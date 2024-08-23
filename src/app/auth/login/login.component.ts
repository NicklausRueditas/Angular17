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
          const token = this.getCookie('sessiontoken'); // Cambia el nombre según tu cookie
          if (token) {
            localStorage.setItem('token', token);
            this.router.navigate(['/home']);
          } else {
            console.error('Token no encontrado en las cookies');
          }
        },
        (error) => {
          console.error('Error en el inicio de sesión', error);
        }
      );
    } else {
      console.warn('El formulario no es válido');
    }
  }
  
  // Función para obtener el valor de una cookie
  getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }
}
