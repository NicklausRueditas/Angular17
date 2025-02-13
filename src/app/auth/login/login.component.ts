import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(private authService: AuthService, private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  signIn(): void {
    this.authService.signInWithGoogle();
  }

  onSubmit(){
    if (this.loginForm.invalid) {
      return; // Si el formulario no es válido, no enviar la solicitud
    }
  
    const { email, password } = this.loginForm.value;
  
    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('Inicio de sesión exitoso:', response);
        // Aquí puedes redirigir al usuario o almacenar la sesión
      },
      error: (error) => {
        console.error('Error al iniciar sesión:', error);
        // Muestra un mensaje de error al usuario si las credenciales son incorrectas
      }
    });
  }
}
