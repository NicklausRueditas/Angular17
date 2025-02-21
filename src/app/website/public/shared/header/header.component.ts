import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SesionService } from '../../../../core/services/sesion.service';
import { User } from '../../../../core/interfaces/user.interface';
import { AuthService } from '../../../../core/services/auth.service';
import { BasketService } from '../../../../core/services/basket.service';
import { Basket } from '../../../../core/interfaces/basket.interface';
import { Product } from '../../../../core/interfaces/product.interface';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  userData: User | null = null;
  basket: Basket | null = null;
  products: Product[] = [];

  constructor(
    private sesionService: SesionService,
    private authService: AuthService,
    private basketService: BasketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /* =======================Iniciar aplicación======================= */

  ngOnInit(): void {
    this.sesionService.getUserProfile().subscribe((user) => {
      this.userData = user; // 🚀 Forzar actualización de la vista solo si cambia
      this.basketService.cartItems$.subscribe((items) => {
        this.basket = items;
      });

      this.basketService.product$.subscribe((items) => {
        this.products = items;
      });
    });

    this.cdr.detectChanges();
  }

  /* =======================Cerrar sesión======================= */

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.userData = null; // Eliminar datos del usuario en la UI
      this.router.navigate(['/home']); // Redirigir al login
    });
  }

  /* =======================Menús======================= */

  isMenuUserOpen = false;
  isMenuCartOpen = false;

  toggleMenu(menu: 'user' | 'cart', event: Event) {
    event.stopPropagation();
    if (menu === 'user') {
      this.isMenuUserOpen = !this.isMenuUserOpen;
      this.isMenuCartOpen = false; // Opcional: Cierra el otro menú
    } else {
      this.isMenuCartOpen = !this.isMenuCartOpen;
      this.isMenuUserOpen = false; // Opcional: Cierra el otro menú
    }
  }

  @HostListener('document:click', ['$event'])
  closeMenus(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('#user-menu') && !target.closest('#cart-menu')) {
      this.isMenuUserOpen = false;
      this.isMenuCartOpen = false;
    }
  }

  /* =======================Carrito de compras======================= */

  get totalPrice(): number { 
    if (!this.basket?.items?.length) return 0; // Verifica que basket e items existen y no están vacíos
  
    return this.basket.items.reduce((acc, item) => {
      const product = this.getProductById(item.product);
      return acc + ((product?.price || 0) * (item.quantity || 0));
    }, 0);
  }
  
  get totalItems(): number {
    if (!this.basket?.items?.length) return 0; // Verifica que basket e items existen y no están vacíos
  
    return this.basket.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  }
  
  getProductById(productId: string): Product | undefined {
    return this.products.find(p => p._id === productId);
  }
}
