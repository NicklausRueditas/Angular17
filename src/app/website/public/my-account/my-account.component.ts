import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { SesionService } from '../../../core/services/auth/sesion.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './my-account.component.html',
  styleUrl: './my-account.component.css',
})
export class MyAccountComponent {
  user$ = this.sesionService.user$;
  imageError = false;

  constructor(
    private sesionService: SesionService,
    private authService: AuthService,
    private router: Router
  ) { }

  onImageError(): void {
    this.imageError = true;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}

