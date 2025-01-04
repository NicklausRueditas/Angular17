import { Component, OnInit } from '@angular/core';
import { Product } from '../../../core/interfaces/product.interface';
import { ProductsService } from '../../../core/services/products.service';
import { FormsModule } from '@angular/forms';
import { FormProductComponent } from './form-product/form-product.component';
import { UpdateProductDto } from '../../../core/dtos/update-product.dto';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, FormProductComponent],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
})
export class InventoryComponent implements OnInit {
  products: Product[] = [];
  isAddModalOpen = false;
  isEditMode = false;
  selectedProduct: Product | null = null;

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
  toggleAddModal(isOpen: boolean, product?: Product): void {
    this.isAddModalOpen = isOpen;
    if (product) {
      this.isEditMode = true;
      this.selectedProduct = { ...product };
    } else {
      this.isEditMode = false;
      this.selectedProduct = null;
    }
  }

  // Manejar producto agregado o editado
  onProductSaved(product: Product): void {
    if (this.isEditMode) {
      this.updateProduct(product);
    } else {
      this.addProduct(product);
    }
    this.toggleAddModal(false);
  }

  // Función para identificar campos modificados
  private getModifiedFields(
    original: Product,
    updated: Product
  ): UpdateProductDto {
    const changes: UpdateProductDto = {};

    for (const key in updated) {
      const updatedValue = updated[key as keyof Product];
      const originalValue = original[key as keyof Product];

      if (updatedValue !== originalValue && updatedValue !== undefined) {
        changes[key] = updatedValue;
      }
    }

    return changes;
  }

  // Actualizar producto existente
  private updateProduct(updatedProduct: Product): void {
    if (!this.selectedProduct) return;

    const changes = this.getModifiedFields(
      this.selectedProduct,
      updatedProduct
    );

    if (Object.keys(changes).length === 0) {
      console.log('No hay cambios para actualizar.');
      return;
    }
    console.log(changes);
    this.productsService
      .updateProduct(this.selectedProduct._id, changes)
      .subscribe({
        next: (response) => {
          const index = this.products.findIndex(
            (p) => p._id === updatedProduct._id
          );
          if (index !== -1) {
            this.products[index] = { ...this.products[index], ...response };
          }
          console.log('Producto actualizado:', response);
        },
        error: (err) => console.error('Error al actualizar el producto:', err),
      });
  }

  // Crear un nuevo producto
  private addProduct(newProduct: Product): void {
    this.productsService.addProduct(newProduct).subscribe({
      next: (response) => {
        this.products.push(response);
        console.log('Producto creado:', response);
      },
      error: (err) => console.error('Error al crear el producto:', err),
    });
  }
}
