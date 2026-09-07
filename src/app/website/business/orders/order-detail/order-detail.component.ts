import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';

import { OrderService } from '../../../../core/services/commerce/order.service';
import { ToastService } from '../../../../core/services/ui/toast.service';
import { PdfReportService } from '../../../../core/services/ui/pdf-report.service';
import { SolCurrencyPipe } from '../../../../shared/pipes/sol-currency.pipe';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLOR,
} from '../../../../core/interfaces/order.interface';

/**
 * Componente para ver el detalle integral, hoja de preparación,
 * picking y despacho de una orden individual en el panel de administración.
 * Todas las transiciones de estado requieren confirmación explícita mediante modales.
 */
@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SolCurrencyPipe],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css',
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  orderId: string | null = null;
  order: Order | null = null;
  isLoading = true;
  isUpdatingStatus = false;
  loadError: string | null = null;

  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusColors = ORDER_STATUS_COLOR;

  // ─── Checklist de Picking / Verificación de Prendas ───────────────────────
  checkedItems = new Set<string>();

  toggleItemCheck(variantId: string): void {
    if (this.order?.status !== 'preparing') return;
    if (this.checkedItems.has(variantId)) {
      this.checkedItems.delete(variantId);
    } else {
      this.checkedItems.add(variantId);
    }
    this.cdr.markForCheck();
  }

  isItemChecked(variantId: string): boolean {
    if (!this.order) return false;
    // Si la orden ya superó la preparación (está lista, despachada o entregada), el check está bloqueado como listo
    if (this.order.status !== 'preparing' && this.order.status !== 'paid') {
      return true;
    }
    return this.checkedItems.has(variantId);
  }

  areAllItemsChecked(): boolean {
    if (!this.order?.items || this.order.items.length === 0) return true;
    if (this.order.status !== 'preparing') return true;
    return this.order.items.every(item => this.checkedItems.has(item.variantId));
  }

  checkedItemsCount(): number {
    if (!this.order?.items) return 0;
    if (this.order.status !== 'preparing' && this.order.status !== 'paid') {
      return this.order.items.length;
    }
    return this.order.items.filter(item => this.checkedItems.has(item.variantId)).length;
  }

  // ─── Control de Modales de Confirmación Rigurosa ──────────────────────────
  confirmModalType: 'preparing' | 'ready_for_pickup' | 'shipped' | 'pickup_deliver' | 'delivery_deliver' | null = null;
  isProcessingAction = false;

  // Campos para Retiro en Tienda (PIN / Código de verificación)
  verificationCodeInput = '';
  pickupVerificationError = '';

  // Campos para Recepción en Domicilio (Delivery)
  deliveryRecipientName = '';
  deliveryRecipientDni = '';
  deliveryNotes = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly orderService: OrderService,
    private readonly toastService: ToastService,
    private readonly pdfReportService: PdfReportService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id');
    if (!this.orderId) {
      this.loadError = 'ID de pedido no especificado.';
      this.isLoading = false;
      return;
    }
    this.loadOrderDetail();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrderDetail(): void {
    if (!this.orderId) return;
    this.isLoading = true;
    this.loadError = null;
    this.cdr.markForCheck();

    this.orderService.getAdminOrderDetail(this.orderId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.loadError = err?.error?.message || 'No se pudo cargar el detalle del pedido.';
          this.toastService.show(this.loadError ?? 'Error al cargar pedido', 'error');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(order => {
        if (!order) return;
        this.order = order;
        // Normalizar objeto user si está en userId
        if (order.userId && typeof order.userId === 'object' && !order.user) {
          this.order.user = order.userId;
        }
        this.cdr.markForCheck();
      });
  }

  // ─── Gestión de Modales de Confirmación ───────────────────────────────────

  /**
   * Abre el modal de confirmación correspondiente a la etapa de la orden
   */
  openConfirmModal(type: 'preparing' | 'ready_for_pickup' | 'shipped' | 'pickup_deliver' | 'delivery_deliver'): void {
    this.confirmModalType = type;
    this.pickupVerificationError = '';
    this.verificationCodeInput = '';
    this.deliveryNotes = '';
    this.deliveryRecipientName = this.getClientName();
    this.deliveryRecipientDni = this.getClientDni() || '';
    this.cdr.markForCheck();
  }

  /**
   * Cierra cualquier modal de confirmación activo
   */
  closeConfirmModal(): void {
    this.confirmModalType = null;
    this.pickupVerificationError = '';
    this.verificationCodeInput = '';
    this.isProcessingAction = false;
    this.cdr.markForCheck();
  }

  /**
   * Ejecuta la acción confirmada por el operario
   */
  executeConfirmAction(): void {
    if (!this.order?._id || !this.confirmModalType) return;

    if (this.confirmModalType === 'preparing') {
      this.submitStatusChange('preparing', '¡Orden en preparación y empaque!');
    } else if (this.confirmModalType === 'ready_for_pickup') {
      this.submitStatusChange('ready_for_pickup', '¡Pedido marcado como listo para retiro en tienda!');
    } else if (this.confirmModalType === 'shipped') {
      this.submitStatusChange('shipped', '¡Pedido marcado como despachado / en camino!');
    } else if (this.confirmModalType === 'pickup_deliver') {
      this.confirmPickupByCode();
    } else if (this.confirmModalType === 'delivery_deliver') {
      this.submitStatusChange('delivered', '¡Entrega en domicilio confirmada exitosamente!');
    }
  }

  /**
   * Envía la actualización de estado a la API
   */
  private submitStatusChange(newStatus: OrderStatus, successMsg: string): void {
    if (!this.order?._id) return;
    this.isProcessingAction = true;
    this.isUpdatingStatus = true;
    this.cdr.markForCheck();

    this.orderService.updateOrderStatus(this.order._id, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al actualizar estado', 'error');
          return of(null);
        }),
        finalize(() => {
          this.isProcessingAction = false;
          this.isUpdatingStatus = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(res => {
        if (!res) return;
        const updated = res?.order ?? res;
        this.order = { ...this.order, ...updated };
        this.toastService.show(successMsg, 'success');
        this.closeConfirmModal();
      });
  }

  /**
   * Valida el código de retiro en tienda con el backend
   */
  private confirmPickupByCode(): void {
    const code = this.verificationCodeInput.trim().toUpperCase();
    if (!code) {
      this.pickupVerificationError = 'Por favor ingresa el código de retiro del cliente.';
      return;
    }

    if (this.order?.pickupCode && this.order.pickupCode.toUpperCase() !== code) {
      this.pickupVerificationError = 'El código ingresado no coincide con el código de esta orden.';
      return;
    }

    this.isProcessingAction = true;
    this.pickupVerificationError = '';
    this.cdr.markForCheck();

    this.orderService.confirmPickup(code)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.pickupVerificationError = err?.error?.message || 'Código de retiro no encontrado o inválido.';
          return of(null);
        }),
        finalize(() => {
          this.isProcessingAction = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(res => {
        if (!res) return;
        this.toastService.show('✅ ¡Retiro verificado y completado con éxito!', 'success');
        if (this.order) {
          this.order.status = 'delivered';
          this.order.pickupUsedAt = new Date().toISOString();
        }
        this.closeConfirmModal();
      });
  }

  /**
   * Imprime la hoja formal de preparación abriendo el reporte en PDF
   */
  printOrder(): void {
    if (!this.order) return;
    this.toastService.show('Abriendo reporte formal para impresión...', 'info');
    this.pdfReportService.generateOrderReport(this.order, 'open');
  }

  /**
   * Genera y descarga el reporte corporativo oficial en formato PDF
   */
  downloadPdf(): void {
    if (!this.order) return;
    this.toastService.show('Generando y descargando reporte corporativo en PDF...', 'success');
    this.pdfReportService.generateOrderReport(this.order, 'save');
  }

  /**
   * Copia texto al portapapeles
   */
  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.show(`${label} copiado al portapapeles`, 'info');
    });
  }

  // ─── Helpers de Información ───────────────────────────────────────────────

  getClientObj(): any {
    if (!this.order) return null;
    if (this.order.user && typeof this.order.user === 'object') return this.order.user;
    if (this.order.userId && typeof this.order.userId === 'object') return this.order.userId;
    return null;
  }

  getClientName(): string {
    const client = this.getClientObj();
    return client?.displayName || client?.name || (this.order?.shippingAddress?.alias ? `Cliente (${this.order.shippingAddress.alias})` : 'Cliente Moorea');
  }

  getClientEmail(): string {
    const client = this.getClientObj();
    return client?.email || 'Sin correo registrado';
  }

  getClientDni(): string | null {
    const client = this.getClientObj();
    const dni = client?.dni || (client as any)?.documentNumber;
    return dni && dni.trim() !== '' ? dni.trim() : null;
  }

  getClientPhone(): string | null {
    const client = this.getClientObj();
    const phone = client?.phone || this.order?.pickupStore?.phone;
    return phone && phone.trim() !== '' ? phone.trim() : null;
  }

  isPickup(): boolean {
    return this.order?.fulfillment === 'pickup' || this.order?.fulfillmentType === 'pickup';
  }

  totalItems(): number {
    return (this.order?.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
  }
}
