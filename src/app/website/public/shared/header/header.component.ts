import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  isMenuVisible = false;
  isMenuOpen = false;

  toggleDropdown() {
    console.log('toggleDropdown ejecutado'); // Verifica si el evento se dispara
    if (this.isMenuOpen) {
      this.isMenuOpen = false;
      setTimeout(() => {
        this.isMenuVisible = false;
      }, 500); // Tiempo para la animación de cierre
    } else {
      this.isMenuVisible = true;
      setTimeout(() => {
        this.isMenuOpen = true;
      }, 0); // Tiempo para la animación de apertura
    }
  }

  @HostListener('document:click', ['$event'])
  closeMenuOnClickOutside(event: Event) {
    const targetElement = event.target as HTMLElement;
    if (!targetElement.closest('.relative')) {
      this.isMenuOpen = false;
      setTimeout(() => {
        this.isMenuVisible = false;
      }, 500);
    }
  }
}
