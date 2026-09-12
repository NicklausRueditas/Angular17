import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, ThumbnailEntry } from '../../../core/interfaces/product.interface';
import { CloudinaryPipe } from '../../pipes/cloudinary.pipe';

/**
 * Componente de tarjeta de producto (Product Card) para catálogo, vista previa y carruseles.
 * Muestra la información principal, precio con descuento, estado de disponibilidad,
 * y galería interactiva con orden jerárquico: Variantes (por color) primero, seguidas
 * de las fotos de catálogo del Producto Maestro.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CloudinaryPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {
  /** Datos del producto a renderizar */
  @Input({ required: true }) product!: Product;
  /** Indicador de estado de carga para acciones */
  @Input() loading: boolean = false;

  /** Emite el producto al hacer clic en 'Agregar rápido' */
  @Output() quickAdd = new EventEmitter<Product>();
  /** Emite el producto para agregar o quitar de la lista de favoritos */
  @Output() toggleFavorite = new EventEmitter<Product>();

  /** Índice activo en el carrusel de imágenes del producto */
  activeIdx: number = 0;

  /**
   * Resuelve la lista ordenada de imágenes para el carrusel de la tarjeta.
   * Jerarquía estricta requerida por el negocio:
   * 1. Imágenes de variantes (en el orden de sus colores).
   * 2. Imágenes del producto maestro (lifestyle, detalles, lookbook) al final.
   *
   * @returns Array de URLs de imágenes a proyectar en el slider
   */
  get images(): string[] {
    const gallery = (this.product?.gallery || []).filter(
      (img): img is string => typeof img === 'string' && img.trim().length > 0
    );
    const tg = (this.product?.thumbnailGallery || []).filter(
      (t): t is ThumbnailEntry => !!t && typeof t.image === 'string' && t.image.trim().length > 0
    );

    // Fallback si no hay ninguna imagen
    if (gallery.length === 0 && tg.length === 0) {
      return ['assets/images/placeholder.svg'];
    }

    const tgImages = tg.map(t => t.image);
    // Verificar si la galería ya contiene las fotos de las variantes (caso previewProduct de edición)
    const galleryAlreadyHasVariants = tgImages.some(img => gallery.includes(img));

    if (galleryAlreadyHasVariants) {
      // previewProduct ya estructuró la lista completa en orden:
      // (Variante 1 -> Variante 2 -> ... -> Fotos Maestro)
      return gallery;
    }

    // Caso API pública / Catálogo donde gallery solo tiene fotos maestras
    // y thumbnailGallery contiene las fotos por variante:
    const list: string[] = [];
    const seen = new Set<string>();

    // 1. Primero las fotos de las variantes por orden de color
    for (const tImg of tgImages) {
      if (!seen.has(tImg)) {
        seen.add(tImg);
        list.push(tImg);
      }
    }

    // 2. Al final, las fotos del producto maestro sin duplicados
    for (const mImg of gallery) {
      if (!seen.has(mImg)) {
        seen.add(mImg);
        list.push(mImg);
      }
    }

    return list.length > 0 ? list : ['assets/images/placeholder.svg'];
  }

  /**
   * Avanza a la siguiente imagen del carrusel.
   * @param event - Evento nativo de clic
   */
  cardNext(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const imgs = this.images;
    if (imgs.length <= 1) return;
    this.activeIdx = (this.activeIdx + 1) % imgs.length;
  }

  /**
   * Retrocede a la imagen anterior del carrusel.
   * @param event - Evento nativo de clic
   */
  cardPrev(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const imgs = this.images;
    if (imgs.length <= 1) return;
    this.activeIdx = (this.activeIdx - 1 + imgs.length) % imgs.length;
  }

  /**
   * Selecciona directamente una diapositiva por su índice numérico.
   * @param event - Evento nativo de clic
   * @param idx - Índice destino
   */
  cardGoTo(event: Event, idx: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeIdx = idx;
  }

  /**
   * Permite al usuario seleccionar un color desde las muestras circulares (swatches)
   * sincronizando inmediatamente el slider a la foto correspondiente a ese color.
   * @param event - Evento nativo de clic
   * @param thumb - Entrada de color con código, nombre e imagen
   */
  onSwatchClick(event: Event, thumb: ThumbnailEntry): void {
    event.preventDefault();
    event.stopPropagation();
    if (!thumb?.image) return;
    const idx = this.images.findIndex((img) => img === thumb.image);
    if (idx !== -1) {
      this.activeIdx = idx;
    }
  }

  /**
   * Retorna el porcentaje de descuento del producto.
   */
  get discountPct(): number {
    return this.product?.discount ?? 0;
  }

  /**
   * Retorna el precio base sin descuento para tachar si aplica.
   */
  get originalPrice(): number {
    const d = this.discountPct;
    const finalPrice = this.product?.finalPrice ?? this.product?.basePrice ?? 0;
    return d <= 0 ? finalPrice : (this.product?.basePrice ?? 0);
  }

  /**
   * Retorna el precio final vigente al consumidor.
   */
  get finalPrice(): number {
    return this.product?.finalPrice ?? this.product?.basePrice ?? 0;
  }

  /**
   * Evalúa si el producto está disponible para recojo rápido cercano (<= 5km).
   */
  canPickupFast(): boolean {
    const km = this.product?.nearestStoreKm;
    return km !== undefined && km !== null && km <= 5;
  }

  /**
   * Determina si el producto fue creado en los últimos 30 días para insignia 'Nuevo'.
   */
  isNewProduct(): boolean {
    if (!this.product?.createdAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(this.product.createdAt) > thirtyDaysAgo;
  }

  /**
   * Calcula el número de cuotas sin intereses según escala de precio.
   */
  get installmentsCount(): number {
    const price = this.finalPrice;
    if (price >= 2000) return 24;
    if (price >= 1000) return 12;
    if (price >= 500) return 3;
    return 0;
  }

  /**
   * Monto mensual por cuota.
   */
  get installmentPrice(): number {
    const count = this.installmentsCount;
    return count > 0 ? this.finalPrice / count : 0;
  }

  /**
   * Emite el evento de agregar rápido al carrito.
   * @param event - Evento nativo de clic
   */
  onQuickAddClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickAdd.emit(this.product);
  }

  /**
   * Emite el evento de alternar favoritos.
   * @param event - Evento nativo de clic
   */
  onFavoriteClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleFavorite.emit(this.product);
  }

  /**
   * Manejador de error al cargar imagen: reemplaza por placeholder SVG.
   * @param event - Evento de error
   */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.svg';
    img.onerror = null;
  }
}
