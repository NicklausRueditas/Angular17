import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SesionService } from '../../../../core/services/sesion.service';
import { catchError, of, tap } from 'rxjs';
import { User } from '../../../../core/interfaces/user.interface';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  userData: User | null = null;

  constructor(
    private sesionService: SesionService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /* =======================Iniciar aplicación======================= */

  ngOnInit(): void {
    this.sesionService.getUserProfile().subscribe((user) => {
      this.cdr.detectChanges();
      this.userData = user; // 🚀 Forzar actualización de la vista solo si cambia
    });
  }

  /* =======================Cerrar sesión======================= */

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.userData = null; // Eliminar datos del usuario en la UI
      this.router.navigate(['/home']); // Redirigir al login
    });
  }

  /* =======================Menú de usuario======================= */

  isMenuUserOpen = false; // Estado del menú

  toggleMenuUser(event: Event) {
    event.stopPropagation(); // Evita que el clic cierre el menú inmediatamente
    this.isMenuUserOpen = !this.isMenuUserOpen; // Alternar estado
  }

  @HostListener('document:click', ['$event'])
  closeMenuUser(event: Event) {
    const clickedInside = (event.target as HTMLElement).closest('#user-menu');
    if (!clickedInside) {
      this.isMenuUserOpen = false; // Cierra el menú si el clic fue afuera
    }
  }
}
