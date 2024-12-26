import { Component, OnInit } from '@angular/core';
import { Product } from '../../../core/interfaces/product.interface';
import { ProductsService } from '../../../core/services/products.service';
import { FormsModule } from '@angular/forms';
import { FormProductComponent } from './form-product/form-product.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule,FormProductComponent],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
})
export class InventoryComponent implements OnInit {
  products: Product[] = [];
  isAddModalOpen = false;

  constructor(private productsService: ProductsService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  // Cargar lista de productos
  loadProducts(): void {
    this.productsService.getProducts().subscribe({
      next: (data) => (this.products = data),
      error: (err) => console.error('Error al cargar productos:', err),
    });
  }

  // Abrir/Cerrar modal
  toggleAddModal(isOpen: boolean): void {
    this.isAddModalOpen = isOpen;
  }

  // Manejo del producto agregado desde el modal
  onProductAdded(product: Product): void {
    this.productsService.addProduct(product).subscribe({
      next: () => {
        console.log('Producto agregado con éxito');
        this.loadProducts();
        this.toggleAddModal(false);
      },
      error: (err) => console.error('Error al agregar producto:', err),
    });
  }
}