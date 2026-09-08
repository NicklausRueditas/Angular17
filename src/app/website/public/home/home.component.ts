import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProductsService } from '../../../core/services/catalog/products.service';
import { Product } from '../../../core/interfaces/product.interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  featuredProducts: Product[] = [];
  isLoadingProducts = true;
  newsletterEmail = '';
  newsletterSuccess = false;

  private subscriptions = new Subscription();

  constructor(private readonly productsService: ProductsService) {}

  ngOnInit(): void {
    this.loadFeaturedProducts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadFeaturedProducts(): void {
    this.productsService.loadCatalog(1, 12);

    const sub = this.productsService.catalog$.subscribe({
      next: (products) => {
        if (products && products.length > 0) {
          this.featuredProducts = products.slice(0, 8);
          this.isLoadingProducts = false;
        } else {
          // Si el snapshot ya tiene datos
          const snapshot = this.productsService.getCatalogSnapshot();
          if (snapshot.length > 0) {
            this.featuredProducts = snapshot.slice(0, 8);
            this.isLoadingProducts = false;
          }
        }
      },
      error: () => {
        this.isLoadingProducts = false;
      }
    });

    this.subscriptions.add(sub);
  }

  /** Obtiene la imagen principal de un producto */
  getProductImage(product: Product): string {
    if (product.firstVariantImage) return product.firstVariantImage;
    if (product.gallery && product.gallery.length > 0) return product.gallery[0];
    if (product.thumbnailGallery && product.thumbnailGallery.length > 0) {
      return product.thumbnailGallery[0].image;
    }
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
  }

  /** Calcula el precio con descuento */
  getFinalPrice(product: Product): number {
    if (product.discount && product.discount > 0) {
      return product.basePrice * (1 - product.discount / 100);
    }
    return product.basePrice;
  }

  onProductImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
  }

  onSubscribeNewsletter(): void {
    if (this.newsletterEmail && this.newsletterEmail.includes('@')) {
      this.newsletterSuccess = true;
      this.newsletterEmail = '';
      setTimeout(() => {
        this.newsletterSuccess = false;
      }, 5000);
    }
  }

  // ─── Beneficios y Promesas de Marca ───
  features = [
    {
      svgPath: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V16.5m0-9h-9',
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      badge: 'Envío Express',
      title: 'Entrega Rápida y Segura',
      description: 'Despacho el mismo día en Huancayo y envíos garantizados a todo el Perú.'
    },
    {
      svgPath: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
      colorClass: 'text-blue-600 bg-blue-50 border-blue-100',
      badge: 'Garantía Oficial',
      title: 'Calidad 100% Garantizada',
      description: 'Todos nuestros productos cuentan con garantía directa y control de calidad.'
    },
    {
      svgPath: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6-11.25h16.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 18V6.75A2.25 2.25 0 014.5 4.5z',
      colorClass: 'text-violet-600 bg-violet-50 border-violet-100',
      badge: 'Pagos Seguros',
      title: 'Múltiples Métodos de Pago',
      description: 'Paga con IziPay, tarjetas de crédito/débito, transferencias y billeteras digitales.'
    },
    {
      svgPath: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
      colorClass: 'text-amber-600 bg-amber-50 border-amber-100',
      badge: 'Soporte 24/7',
      title: 'Atención Personalizada',
      description: 'Equipo de soporte listo para asistirte antes, durante y después de tu compra.'
    }
  ];

  // ─── Categorías Destacadas ───
  categories = [
    {
      name: 'Moda & Calzado',
      tag: 'Tendencias 2026',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600',
      color: 'from-rose-500/80 to-purple-900/90',
      link: '/store'
    },
    {
      name: 'Tecnología & Gadgets',
      tag: 'Lo más nuevo',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600',
      color: 'from-blue-600/80 to-slate-900/90',
      link: '/store'
    },
    {
      name: 'Hogar & Estilo',
      tag: 'Espacios únicos',
      image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600',
      color: 'from-emerald-600/80 to-teal-950/90',
      link: '/store'
    },
    {
      name: 'Deportes & Fitness',
      tag: 'Alto rendimiento',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600',
      color: 'from-amber-500/80 to-orange-950/90',
      link: '/store'
    }
  ];
}