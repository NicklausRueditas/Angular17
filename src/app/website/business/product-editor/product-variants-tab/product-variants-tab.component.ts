import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

import { ProductVariantsService } from '../../../../core/services/catalog/product-variants.service';
import { ToastService }           from '../../../../core/services/ui/toast.service';
import { Product }                from '../../../../core/interfaces/product.interface';
import { ProductVariant }         from '../../../../core/interfaces/store.interface';
import { VARIANT_TYPE_OPTIONS }   from '../../../../core/constants/product-options.constants';

import { VariantModalComponent }  from '../variant-modal/variant-modal.component';

/**
 * Representa una agrupación lógica de variantes que comparten el mismo color,
 * permitiendo su manipulación y reordenamiento en bloque (Drag & Drop).
 */
export interface ColorGroup {
  /** Código único o slug del color (ej. 'NEG', 'BLC') */
  colorCode:  string;
  /** Nombre comercial legible del color (ej. 'Negro Onix') */
  colorName:  string;
  /** Representación hexadecimal del color (ej. '#18181B') */
  colorHex:   string;
  /** Colección de variantes / tallas pertenecientes a este color */
  variants:   ProductVariant[];
}

/**
 * Componente para la gestión, reordenamiento y visualización moderna de
 * Variantes y Stock de un producto en el panel de administración.
 *
 * Características principales:
 * - Agrupación automática de variantes por color.
 * - Reordenamiento mediante arrastrar y soltar (Drag & Drop) con persistencia en backend.
 * - El primer grupo de color define la portada oficial del producto en la tienda.
 * - Creación, clonación rápida, alternancia de visibilidad y eliminación atómica.
 */
@Component({
  selector: 'app-product-variants-tab',
  standalone: true,
  imports: [CommonModule, RouterLink, VariantModalComponent],
  templateUrl: './product-variants-tab.component.html',
})
export class ProductVariantsTabComponent implements OnInit, OnDestroy {
  /** ID del producto maestro padre */
  @Input() productId!: string;
  /** Objeto del producto maestro con información de precio base, descuento y marca */
  @Input() product: Product | null = null;
  /** Emite el array completo de variantes cuando el orden o catálogo sufre modificaciones */
  @Output() variantsChange = new EventEmitter<ProductVariant[]>();

  /** Colección plana de variantes cargadas para este producto */
  variants: ProductVariant[] = [];
  /** Indicador de carga inicial desde la API */
  isLoadingVariants = false;
  /** Variante seleccionada para edición en el modal */
  editingVariant: ProductVariant | null = null;
  /** Variante base utilizada como plantilla en modo clonación */
  cloneSource: ProductVariant | null = null;
  /** Controla la visibilidad del modal de creación/edición */
  isModalOpen = false;

  /** Array mutable de grupos de color para la interfaz y soporte Drag & Drop */
  colorGroups: ColorGroup[] = [];

  /** Índice del grupo que actualmente está siendo arrastrado (-1 = inactivo) */
  dragSrcIndex = -1;
  /** Indicador activo de arrastre para efectos visuales */
  isDragging = false;
  /** Indicador de sincronización en segundo plano con el backend */
  isSavingOrder = false;

  /** Notificador de destrucción del componente para desuscripción reactiva */
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly variantsService: ProductVariantsService,
    private readonly toastService:    ToastService,
  ) {}

  ngOnInit(): void {
    this.loadVariants();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Agrupación por color ─────────────────────────────────────────────────

  /**
   * Agrupa las variantes por su código de color conservando el orden de prelación.
   * Si ya existía un orden previo establecido por arrastre, se respeta la posición de los grupos.
   */
  private buildColorGroups(): void {
    const map = new Map<string, ColorGroup>();
    for (const v of this.variants) {
      const key  = v.color?.code ?? '__no_color__';
      const name = v.color?.name ?? 'Sin color';
      const hex  = v.color?.hex  ?? '#e5e7eb';
      if (!map.has(key)) {
        map.set(key, { colorCode: key, colorName: name, colorHex: hex, variants: [] });
      }
      map.get(key)!.variants.push(v);
    }
    const newGroups = Array.from(map.values());
    if (this.colorGroups.length === 0) {
      this.colorGroups = newGroups;
      return;
    }
    // Respetar el orden previo de los grupos ya arrastrados
    const ordered: ColorGroup[] = [];
    for (const existing of this.colorGroups) {
      const fresh = newGroups.find(g => g.colorCode === existing.colorCode);
      if (fresh) ordered.push(fresh);
    }
    for (const g of newGroups) {
      if (!ordered.find(o => o.colorCode === g.colorCode)) ordered.push(g);
    }
    this.colorGroups = ordered;
  }

  // ─── Drag & Drop de grupos de color ──────────────────────────────────────

  /**
   * Inicia el arrastre de un grupo de color.
   * @param event - Evento nativo DragEvent
   * @param index - Posición del grupo en el array
   */
  onGroupDragStart(event: DragEvent, index: number): void {
    this.dragSrcIndex = index;
    this.isDragging   = true;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  /**
   * Controla el arrastre sobre otro grupo permitiendo el intercambio visual en tiempo real.
   * @param event - Evento nativo DragEvent
   * @param index - Posición de destino
   */
  onGroupDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragSrcIndex === -1 || this.dragSrcIndex === index) return;
    const groups = [...this.colorGroups];
    const [moved] = groups.splice(this.dragSrcIndex, 1);
    groups.splice(index, 0, moved);
    this.colorGroups  = groups;
    this.dragSrcIndex = index;
  }

  /**
   * Finaliza el arrastre y persiste el nuevo orden en el backend.
   * El primer grupo pasa a ser la portada oficial del producto en la tienda.
   */
  onGroupDragEnd(): void {
    this.isDragging   = false;
    this.dragSrcIndex = -1;
    this.variants = this.colorGroups.flatMap(g => g.variants);

    const orderedIds = this.variants.map(v => v._id);
    this.isSavingOrder = true;
    this.variantsService.reorderVariants(this.productId, orderedIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSavingOrder = false;
          this.toastService.showSuccess(`✓ Portada y orden actualizados (${res.updated} variantes)`);
          this.variantsChange.emit(this.variants);
        },
        error: () => {
          this.isSavingOrder = false;
          this.toastService.showError('Error al guardar el nuevo orden en el servidor.');
        },
      });
  }

  // ─── Acciones de Modal y Variante ─────────────────────────────────────────

  /**
   * Abre el modal para crear, editar o clonar una variante.
   * @param variant - Variante a editar (opcional)
   * @param clone - Variante a usar como molde de clonación (opcional)
   */
  openModal(variant?: ProductVariant, clone?: ProductVariant): void {
    this.editingVariant = variant ?? null;
    this.cloneSource    = clone   ?? null;
    this.isModalOpen    = true;
  }

  /**
   * Cierra el modal y restablece el estado de edición.
   */
  closeModal(): void {
    this.isModalOpen    = false;
    this.editingVariant = null;
    this.cloneSource    = null;
  }

  /**
   * Callback invocado al guardar exitosamente una variante en el modal.
   * @param saved - Objeto de la variante guardada
   */
  onVariantSaved(saved: ProductVariant): void {
    if (this.editingVariant) {
      const idx = this.variants.findIndex(v => v._id === this.editingVariant!._id);
      this.variants = idx !== -1
        ? this.variants.map((v, i) => i === idx ? saved : v)
        : [...this.variants, saved];
    } else {
      this.variants = [...this.variants, saved];
    }
    this.buildColorGroups();
    this.variantsChange.emit(this.variants);
    this.closeModal();
  }

  /**
   * Alterna el estado activo/inactivo de una variante.
   * @param variant - Variante cuyo estado se alternará
   */
  toggleVariantActive(variant: ProductVariant): void {
    const activate = !variant.isActive;
    const req$ = activate
      ? this.variantsService.activateVariant(variant._id, this.productId)
      : this.variantsService.deactivateVariant(variant._id, this.productId);

    req$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.variants = this.variants.map(v => v._id === updated._id ? updated : v);
          this.buildColorGroups();
          this.variantsChange.emit(this.variants);
          this.toastService.showSuccess(activate ? 'Variante activada en catálogo ✅' : 'Variante desactivada ⭕');
        },
        error: () => this.toastService.showError('Error al cambiar el estado de la variante'),
      });
  }

  /**
   * Elimina permanentemente una variante liberando su SKU.
   * @param variant - Variante a eliminar
   */
  deleteVariant(variant: ProductVariant): void {
    if (!confirm(`⚠️ ¿Eliminar permanentemente la talla "${variant.size?.value || variant.sku}"?\nEsta acción no se puede deshacer.`)) return;
    this.variantsService.deleteVariant(variant._id, this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.variants = this.variants.filter(v => v._id !== variant._id);
          this.buildColorGroups();
          this.variantsChange.emit(this.variants);
          this.toastService.showSuccess('Variante eliminada permanentemente');
        },
        error: () => this.toastService.showError('Error al eliminar la variante'),
      });
  }

  /**
   * Elimina en bloque todas las tallas asociadas a un grupo de color.
   * @param group - Grupo de color a remover
   */
  deleteGroupByColor(group: ColorGroup): void {
    const tallaCount = group.variants.length;
    const confirmed = confirm(
      `⚠️ ¿Eliminar permanentemente todo el color "${group.colorName}" (${group.colorCode})?\n` +
      `Se borrarán ${tallaCount} talla(s) de forma definitiva.\n\n` +
      `Esta acción NO se puede deshacer.`,
    );
    if (!confirmed) return;

    this.variantsService.deleteColorGroup(this.productId, group.colorCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.variants = this.variants.filter(v => v.color?.code !== group.colorCode);
          this.buildColorGroups();
          this.variantsChange.emit(this.variants);
          this.toastService.showSuccess(
            `🗑️ Color "${group.colorName}" eliminado (${res.deleted} variante(s))`,
          );
        },
        error: () => this.toastService.showError(`Error al eliminar el color "${group.colorName}"`),
      });
  }

  /**
   * Copia un SKU al portapapeles y notifica al usuario.
   * @param sku - Texto del SKU a copiar
   */
  copySku(sku: string): void {
    if (!sku) return;
    navigator.clipboard.writeText(sku).then(() => {
      this.toastService.showSuccess(`SKU copiado: ${sku}`);
    }).catch(() => {});
  }

  // ─── Helpers y Métricas de Visualización ───────────────────────────────────

  /** Cantidad total de grupos de color únicos */
  get totalColors(): number { return this.colorGroups.length; }
  /** Cantidad total de tallas registradas */
  get totalSizes(): number { return this.variants.length; }
  /** Cantidad de variantes activas para venta */
  get activeVariantsCount(): number { return this.variants.filter(v => v.isActive).length; }
  /** Cantidad de variantes inactivas */
  get inactiveVariantsCount(): number { return this.variants.filter(v => !v.isActive).length; }

  /**
   * Retorna el precio base antes de descuentos de la variante.
   * @param variant - Variante a evaluar
   */
  rawPrice(variant: ProductVariant): number {
    return (this.product?.basePrice ?? 0) + (variant.priceAdjustment ?? 0);
  }

  /**
   * Retorna el precio final vigente al cliente tras aplicar descuento promocional.
   * @param variant - Variante a evaluar
   */
  finalPrice(variant: ProductVariant): number {
    const raw      = this.rawPrice(variant);
    const discount = this.product?.discount ?? 0;
    return raw * (1 - discount / 100);
  }

  /**
   * Retorna la etiqueta legible del tipo y valor de talla.
   * @param variant - Variante a evaluar
   */
  sizeLabel(variant: ProductVariant): string {
    if (!variant.size) return 'Sin talla';
    const opt = VARIANT_TYPE_OPTIONS.find(t => t.value === variant.size!.type);
    const typeLabel = opt?.label.replace(/^\S+\s/, '') ?? variant.size.type;
    return `${typeLabel}: ${variant.size.value}`;
  }

  /**
   * Retorna el sistema o región de la talla (ej. 'EU', 'US', o nombre de tipo).
   * @param variant - Variante a evaluar
   */
  sizeSystemBadge(variant: ProductVariant): string {
    if (variant.size?.region) return variant.size.region;
    if (variant.size?.type === 'footwear') return 'Calzado';
    if (variant.size?.type === 'clothing') return 'Textil';
    return variant.size?.type || 'Standard';
  }

  // ─── Carga de Datos ───────────────────────────────────────────────────────

  /**
   * Carga las variantes desde el servicio y las ordena por sortOrder.
   */
  private loadVariants(): void {
    this.isLoadingVariants = true;
    this.variantsService.getVariantsByProduct(this.productId)
      .pipe(takeUntil(this.destroy$), finalize(() => { this.isLoadingVariants = false; }))
      .subscribe({
        next: (v) => {
          this.variants = [...v].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          this.buildColorGroups();
        },
        error: () => {
          this.variants = [];
          this.colorGroups = [];
        },
      });
  }
}
