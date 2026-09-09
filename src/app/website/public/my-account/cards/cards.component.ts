import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardService } from '../../../../core/services/ui/card.service';
import { ToastService } from '../../../../core/services/ui/toast.service';
import { CardModalComponent } from '../../../../shared/components/card-modal/card-modal.component';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { Card, CardResponse } from '../../../../core/interfaces/card.interface';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModalComponent, ToastComponent],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.css'],
})
export class CardsComponent implements OnInit {
  cards: Card[] = [];
  isLoading = false;

  // ─── Modal ────────────────────────────────────────────────────────────────
  showCardModal = false;
  cardToEdit: Card | null = null;

  constructor(
    private readonly cardService: CardService,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadCards();
  }

  // ─── Carga ────────────────────────────────────────────────────────────────

  loadCards(): void {
    this.isLoading = true;
    this.cardService.getCards().subscribe({
      next: (response: Card[] | CardResponse) => {
        if (Array.isArray(response)) {
          this.cards = response;
        } else if ('cards' in response && Array.isArray(response.cards)) {
          this.cards = response.cards ?? [];
        } else if ('card' in response && Array.isArray((response as any).card)) {
          this.cards = (response as any).card ?? [];
        } else {
          this.cards = [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toastService.showError('Error al cargar las tarjetas');
      },
    });
  }

  // ─── Apertura del modal ───────────────────────────────────────────────────

  openAddModal(): void {
    this.cardToEdit = null;
    this.showCardModal = true;
  }

  openEditModal(card: Card): void {
    this.cardToEdit = card;
    this.showCardModal = true;
  }

  onModalClosed(): void {
    this.showCardModal = false;
    this.cardToEdit = null;
  }

  onCardSaved(saved: Card): void {
    this.loadCards();
  }

  // ─── Eliminar ─────────────────────────────────────────────────────────────

  deleteCard(card: Card): void {
    this.toastService.showConfirm(
      '¿Estás seguro de eliminar esta tarjeta?',
      () => {
        if (!card._id) return;
        this.cardService.deleteCard(card._id).subscribe({
          next: () => {
            this.cards = this.cards.filter(c => c._id !== card._id);
            this.toastService.showSuccess('Tarjeta eliminada correctamente');
          },
          error: () => this.toastService.showError('Error al eliminar la tarjeta'),
        });
      },
      undefined, 'Sí, eliminar', 'Cancelar',
    );
  }

  // ─── Helpers visuales ────────────────────────────────────────────────────

  getCardGradient(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'visa':       return 'from-slate-950 via-blue-950 to-indigo-950 border border-blue-500/20';
      case 'mastercard': return 'from-neutral-950 via-stone-900 to-amber-950 border border-amber-500/20';
      case 'amex':       return 'from-slate-950 via-emerald-950 to-teal-950 border border-emerald-500/20';
      default:           return 'from-slate-900 via-neutral-900 to-black border border-slate-700/30';
    }
  }
}
