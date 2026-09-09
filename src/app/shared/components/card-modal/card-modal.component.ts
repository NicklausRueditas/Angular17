import {
  Component, OnChanges, OnDestroy,
  Input, Output, EventEmitter, SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CardService } from '../../../core/services/ui/card.service';
import { ToastService } from '../../../core/services/ui/toast.service';
import {
  Card,
  CardResponse,
  CreateCardDto,
  UpdateCardDto,
} from '../../../core/interfaces/card.interface';

/**
 * Modal reutilizable para crear o editar una tarjeta de pago.
 *
 * Uso:
 * ```html
 * <app-card-modal
 *   [isOpen]="showModal"
 *   [editCard]="cardToEdit"
 *   (closed)="showModal = false"
 *   (cardSaved)="onCardSaved($event)">
 * </app-card-modal>
 * ```
 */
@Component({
  selector: 'app-card-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './card-modal.component.html',
  styleUrl: './card-modal.component.css',
})
export class CardModalComponent implements OnChanges, OnDestroy {
  /** Controla la visibilidad del modal */
  @Input() isOpen = false;
  /** Si se proporciona, entra en modo edición */
  @Input() editCard: Card | null = null;

  /** Emitido al cerrar el modal (backdrop o botón Cancelar) */
  @Output() closed = new EventEmitter<void>();
  /** Emitido cuando la tarjeta fue guardada exitosamente */
  @Output() cardSaved = new EventEmitter<Card>();

  // Interno
  get editMode(): boolean { return !!this.editCard; }
  private currentCardId: string | null = null;
  private subscriptions = new Subscription();

  isSaving = false;
  cardForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly cardService: CardService,
    private readonly toastService: ToastService,
  ) {
    this.cardForm = this.fb.group({
      cardNumber:     ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      cardHolder:     ['', [Validators.required, Validators.minLength(3)]],
      expirationDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cardType:       ['Visa', [Validators.required]],
      cvv:            ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.setupModal();
      } else {
        this.resetForm();
      }
    }
    if (changes['editCard'] && this.isOpen) {
      this.setupModal();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Setup

  private setupModal(): void {
    this.resetForm();
    if (this.editCard) {
      this.currentCardId = this.editCard._id ?? null;
      this.cardForm.patchValue({
        cardNumber:     this.editCard.cardNumber,
        cardHolder:     this.editCard.cardHolder,
        expirationDate: this.editCard.expirationDate,
        cardType:       this.editCard.cardType,
        cvv:            '***', // Placeholder de seguridad
      });
      // En modo edición, número, CVV y tipo no se pueden cambiar
      this.cardForm.get('cardNumber')?.disable();
      this.cardForm.get('cvv')?.disable();
      this.cardForm.get('cardType')?.disable();
    }
  }

  private resetForm(): void {
    this.cardForm.enable();
    this.cardForm.reset({ cardType: 'Visa' });
    this.currentCardId = null;
    this.isSaving = false;
  }

  // Acciones

  close(): void { this.closed.emit(); }

  onSubmit(): void {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      this.toastService.showWarning('Por favor complete todos los campos requeridos');
      return;
    }
    this.isSaving = true;
    const raw = this.cardForm.getRawValue();

    if (this.editMode && this.currentCardId) {
      this.doUpdate(this.currentCardId, {
        cardHolder:     raw.cardHolder,
        expirationDate: raw.expirationDate,
      });
    } else {
      this.doCreate({
        cardNumber:     raw.cardNumber,
        cardHolder:     (raw.cardHolder as string).toUpperCase(),
        expirationDate: raw.expirationDate,
        cardType:       raw.cardType,
        cvv:            raw.cvv,
      });
    }
  }

  private doCreate(data: CreateCardDto): void {
    this.subscriptions.add(
      this.cardService.createCard(data).subscribe({
        next: (res: CardResponse | Card) => {
          const saved: Card = (res as CardResponse).card ?? (res as Card);
          this.toastService.showSuccess('Tarjeta agregada correctamente');
          this.cardSaved.emit(saved);
          this.closed.emit();
        },
        error: () => {
          this.isSaving = false;
          this.toastService.showError('Error al agregar la tarjeta');
        },
      })
    );
  }

  private doUpdate(id: string, data: UpdateCardDto): void {
    this.subscriptions.add(
      this.cardService.updateCard(id, data).subscribe({
        next: (res: CardResponse | Card) => {
          const saved: Card = (res as CardResponse).card ?? (res as Card);
          this.toastService.showSuccess('Tarjeta actualizada correctamente');
          this.cardSaved.emit(saved);
          this.closed.emit();
        },
        error: () => {
          this.isSaving = false;
          this.toastService.showError('Error al actualizar la tarjeta');
        },
      })
    );
  }

  // Helpers visuales y de formato
  get formattedCardNumber(): string {
    const raw = this.cardForm.get('cardNumber')?.value || '';
    if (this.editMode) {
      const last4 = this.editCard?.cardNumber ? this.editCard.cardNumber.slice(-4) : '••••';
      return `•••• •••• •••• ${last4}`;
    }
    const padded = raw.padEnd(16, '•');
    return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`;
  }

  get formattedExpiry(): string {
    return this.cardForm.get('expirationDate')?.value || 'MM/YY';
  }

  get cardHolderDisplay(): string {
    return this.cardForm.get('cardHolder')?.value || 'TITULAR DE LA TARJETA';
  }

  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').slice(0, 16);
    this.cardForm.get('cardNumber')?.setValue(cleaned, { emitEvent: true });
    input.value = cleaned;
  }

  onHolderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    this.cardForm.get('cardHolder')?.setValue(upper, { emitEvent: true });
  }

  onExpiryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^\d]/g, '');
    if (val.length >= 3) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4);
    } else if (val.length > 4) {
      val = val.slice(0, 4);
    }
    this.cardForm.get('expirationDate')?.setValue(val, { emitEvent: true });
    input.value = val;
  }

  onCvvInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').slice(0, 4);
    this.cardForm.get('cvv')?.setValue(cleaned, { emitEvent: true });
    input.value = cleaned;
  }

  setCardType(type: string): void {
    if (!this.editMode) {
      this.cardForm.get('cardType')?.setValue(type);
    }
  }

  getCardPreviewGradient(): string {
    const type = (this.cardForm.get('cardType')?.value ?? 'Visa') as string;
    switch (type.toLowerCase()) {
      case 'visa':
        return 'from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30';
      case 'mastercard':
        return 'from-stone-950 via-neutral-900 to-amber-950 border border-amber-500/30';
      case 'amex':
        return 'from-teal-950 via-slate-900 to-emerald-950 border border-emerald-500/30';
      default:
        return 'from-neutral-950 via-neutral-900 to-neutral-800 border border-white/10';
    }
  }
}
