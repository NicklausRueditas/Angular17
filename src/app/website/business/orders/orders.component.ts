import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';

import { OrderService } from '../../../core/services/commerce/order.service';
import { AuthService }  from '../../../core/services/auth/auth.service';
import { ToastService } from '../../../core/services/ui/toast.service';
import { SolCurrencyPipe } from '../../../shared/pipes/sol-currency.pipe';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLOR,
} from '../../../core/interfaces/order.interface';
import { User } from '../../../core/interfaces/user.interface';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SolCurrencyPipe],
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  isLoading = false;
  activeFilter: OrderStatus | 'all' = 'all';
  searchQuery = '';

  currentUser: User | null = null;
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusColors = ORDER_STATUS_COLOR;

  // ─── Modal de Verificación de Retiro en Tienda (Pickup) ────────────────────
  isPickupModalOpen = false;
  selectedPickupOrder: Order | null = null;
  verificationCodeInput = '';
  isVerifyingPickup = false;
  pickupVerificationError = '';

  // ─── Modal de Confirmación de Entrega a Domicilio (Delivery) ───────────────
  isDeliveryModalOpen = false;
  selectedDeliveryOrder: Order | null = null;
  isConfirmingDelivery = false;

  constructor(
    private readonly orderService: OrderService,
    private readonly authService:  AuthService,
    private readonly toastService: ToastService,
    private readonly router:       Router,
    private readonly cdr:          ChangeDetectorRef,
  ) {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        this.currentUser = u;
        this.cdr.markForCheck();
      });
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isWorker(): boolean {
    return this.currentUser?.roles?.includes('worker') ?? false;
  }

  get isAdmin(): boolean {
    return this.currentUser?.roles?.includes('admin') ?? false;
  }

  get isSeller(): boolean {
    return this.currentUser?.roles?.includes('seller') ?? false;
  }

  // ─── Carga de Órdenes ─────────────────────────────────────────────────────
  loadOrders(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const filterParam = this.activeFilter !== 'all' ? this.activeFilter : undefined;
    this.orderService.getAllOrders(filterParam ? { status: filterParam } : undefined)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al cargar pedidos', 'error');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(res => {
        this.orders = Array.isArray(res) ? res : (res?.orders ?? []);
        this.applyFilterAndSearch();
      });
  }

  setFilter(filter: OrderStatus | 'all'): void {
    this.activeFilter = filter;
    this.loadOrders();
  }

  applyFilterAndSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter(order => {
        const invoice = (order.invoiceNumber || '').toLowerCase();
        const code    = (order.pickupCode || '').toLowerCase();
        const clientName  = this.getClientName(order).toLowerCase();
        const clientEmail = this.getClientEmail(order).toLowerCase();
        const clientDni   = (this.getClientDni(order) || '').toLowerCase();
        return invoice.includes(q) || code.includes(q) || clientName.includes(q) || clientEmail.includes(q) || clientDni.includes(q);
      });
    }
    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.applyFilterAndSearch();
  }

  // ─── Transición Básica de Estados ─────────────────────────────────────────
  /**
   * Navega a la vista de preparación detallada (/business/orders/:id)
   * Si la orden está en estado 'paid', la pasa automáticamente a 'preparing'.
   */
  goToPrepareOrder(order: Order): void {
    if (order.status === 'paid') {
      this.orderService.updateOrderStatus(order._id, 'preparing').subscribe();
    }
    this.router.navigate(['/business/orders', order._id]);
  }

  updateStatus(order: Order, status: OrderStatus): void {
    this.orderService.updateOrderStatus(order._id, status)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al actualizar estado', 'error');
          return of(null);
        })
      )
      .subscribe(res => {
        if (!res) return;
        const updated = res?.order ?? res;
        const idx = this.orders.findIndex(o => o._id === order._id);
        if (idx !== -1 && updated) {
          this.orders[idx] = updated;
          this.applyFilterAndSearch();
        }
        this.toastService.show(`Estado actualizado: ${this.statusLabels[status]}`, 'success');
      });
  }

  // ─── Modal de Retiro en Tienda (Pickup) ───────────────────────────────────
  openPickupModal(order: Order): void {
    this.selectedPickupOrder = order;
    this.verificationCodeInput = '';
    this.pickupVerificationError = '';
    this.isVerifyingPickup = false;
    this.isPickupModalOpen = true;
    this.cdr.markForCheck();
  }

  closePickupModal(): void {
    this.isPickupModalOpen = false;
    this.selectedPickupOrder = null;
    this.verificationCodeInput = '';
    this.pickupVerificationError = '';
    this.isVerifyingPickup = false;
    this.cdr.markForCheck();
  }

  confirmPickupByCode(): void {
    const code = this.verificationCodeInput.trim().toUpperCase();
    if (!code) {
      this.pickupVerificationError = 'Por favor ingresa el código de retiro del cliente.';
      return;
    }

    if (this.selectedPickupOrder?.pickupCode && this.selectedPickupOrder.pickupCode.toUpperCase() !== code) {
      this.pickupVerificationError = 'El código ingresado no coincide con el código de esta orden.';
      return;
    }

    this.isVerifyingPickup = true;
    this.pickupVerificationError = '';

    this.orderService.confirmPickup(code)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.pickupVerificationError = err?.error?.message || 'Código de retiro no encontrado o inválido.';
          this.isVerifyingPickup = false;
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe(res => {
        this.isVerifyingPickup = false;
        if (!res) return;

        this.toastService.show(`✅ ¡Retiro verificado y completado! — Orden ${this.selectedPickupOrder?.invoiceNumber}`, 'success');
        
        // Actualizar estado localmente
        if (this.selectedPickupOrder) {
          const idx = this.orders.findIndex(o => o._id === this.selectedPickupOrder?._id);
          if (idx !== -1) {
            this.orders[idx].status = 'delivered';
            this.orders[idx].pickupUsedAt = new Date().toISOString();
          }
        }
        this.closePickupModal();
        this.applyFilterAndSearch();
      });
  }

  goToScanner(): void {
    this.closePickupModal();
    this.router.navigate(['/business/pickup-scanner']);
  }

  // ─── Modal de Confirmación de Delivery ────────────────────────────────────
  openDeliveryModal(order: Order): void {
    this.selectedDeliveryOrder = order;
    this.isConfirmingDelivery = false;
    this.isDeliveryModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDeliveryModal(): void {
    this.isDeliveryModalOpen = false;
    this.selectedDeliveryOrder = null;
    this.isConfirmingDelivery = false;
    this.cdr.markForCheck();
  }

  confirmDelivery(): void {
    if (!this.selectedDeliveryOrder?._id) return;

    this.isConfirmingDelivery = true;
    this.orderService.updateOrderStatus(this.selectedDeliveryOrder._id, 'delivered')
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.toastService.show(err?.error?.message || 'Error al confirmar entrega', 'error');
          this.isConfirmingDelivery = false;
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe(res => {
        this.isConfirmingDelivery = false;
        if (!res) return;

        this.toastService.show(`📦 Pedido ${this.selectedDeliveryOrder?.invoiceNumber} marcado como entregado.`, 'success');
        const idx = this.orders.findIndex(o => o._id === this.selectedDeliveryOrder?._id);
        if (idx !== -1) {
          this.orders[idx].status = 'delivered';
        }
        this.closeDeliveryModal();
        this.applyFilterAndSearch();
      });
  }

  getClientObj(order: Order | null): any {
    if (!order) return null;
    if (order.user && typeof order.user === 'object') return order.user;
    if (order.userId && typeof order.userId === 'object') return order.userId;
    return null;
  }

  getClientName(order: Order | null): string {
    const client = this.getClientObj(order);
    return client?.displayName || client?.name || (order?.shippingAddress?.alias ? `Cliente (${order.shippingAddress.alias})` : 'Cliente Moorea');
  }

  getClientEmail(order: Order | null): string {
    const client = this.getClientObj(order);
    return client?.email || '';
  }

  getClientDni(order: Order | null): string | null {
    const client = this.getClientObj(order);
    const dni = client?.dni || (client as any)?.documentNumber;
    return dni && dni.trim() !== '' ? dni.trim() : null;
  }

  getClientPhone(order: Order | null): string | null {
    const client = this.getClientObj(order);
    const phone = client?.phone || order?.pickupStore?.phone;
    return phone && phone.trim() !== '' ? phone.trim() : null;
  }

  // ─── Helpers Visuales ─────────────────────────────────────────────────────
  totalItems(order: Order): number {
    return (order.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
  }

  getOrderTotal(order: Order): number {
    return Number(order?.pricing?.total ?? (order as any)?.totalAmount ?? 0);
  }

  isPickupOrder(order: Order): boolean {
    return order.fulfillmentType === 'pickup' || (order as any).fulfillment === 'pickup';
  }
}
