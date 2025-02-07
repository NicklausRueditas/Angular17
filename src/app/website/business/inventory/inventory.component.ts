import { Component, OnInit } from '@angular/core';
import { Product } from '../../../core/interfaces/product.interface';
import { ProductsService } from '../../../core/services/products.service';
import { FormProductComponent } from './form-product/form-product.component';
import { UpdateProductDto } from '../../../core/dtos/update-product.dto';
import { ImageService } from '../../../core/services/image.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormProductComponent],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
})
export class InventoryComponent implements OnInit {
  products: Product[] = [];
  isAddModalOpen = false;
  isEditMode = false;
  selectedProduct: Product | null = null;

  constructor(
    private productsService: ProductsService,
    private imageService: ImageService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  /**
   * Carga la lista de productos desde el servicio.
   */
  private loadProducts(): void {
    this.productsService.getProducts().subscribe({
      next: (data) => (this.products = data),
      error: (err) => console.error('Error al cargar productos:', err),
    });
  }

  /**
   * Abre o cierra el modal de producto.
   * @param isOpen Indica si el modal debe abrirse o cerrarse.
   * @param product Producto seleccionado (opcional, solo en edición).
   * @param isEdit Indica si se está en modo edición.
   */
  toggleAddModal(isOpen: boolean, product?: Product, isEdit: boolean = false): void {
    this.isAddModalOpen = isOpen;
    this.selectedProduct = product ? { ...product } : null;
    this.isEditMode = isEdit;
  }

  /**
   * Maneja el evento cuando se guarda un producto (nuevo o editado).
   * @param product Producto a guardar.
   */
  onProductSaved(product: Product): void {
    this.isEditMode ? this.updateProduct(product) : this.addProduct(product);
  }

  /**
   * Agrega un nuevo producto a la lista.
   * @param newProduct Producto a agregar.
   */
  private addProduct(newProduct: Product): void {
    this.productsService.addProduct(newProduct).subscribe({
      next: (response) => {
        this.products.push(response);
        console.log('Producto creado:', response);
      },
      error: (err) => console.error('Error al crear el producto:', err),
    });
  }

  /**
   * Actualiza un producto existente si hay cambios.
   * @param updatedProduct Producto con datos actualizados.
   */
  private updateProduct(updatedProduct: Product): void {
    if (!this.selectedProduct) return;

    const changes = this.getModifiedFields(this.selectedProduct, updatedProduct);
    if (Object.keys(changes).length === 0) return console.log('No hay cambios para actualizar.');

    this.productsService.updateProduct(this.selectedProduct._id, changes).subscribe({
      next: (response) => {
        const index = this.products.findIndex((p) => p.code === updatedProduct.code);
        if (index !== -1) {
          this.products[index] = { ...this.products[index], ...response };
        }
        console.log('Producto actualizado:', response);
      },
      error: (err) => console.error('Error al actualizar el producto:', err),
    });
  }

  /**
   * Elimina un producto y sus imágenes asociadas.
   * @param id Identificador del producto a eliminar.
   */
  deleteProduct(id: string): void {
    if (!confirm('¿Está seguro de que desea eliminar este producto?')) {
      return;
    }
    const product = this.products.find((p) => p._id === id);
    if (product?.gallery) {
      product.gallery.forEach((imageUrl) => {
        const idLink = imageUrl.split('/').pop();
        if (idLink) {
          this.imageService.deleteImage(idLink).subscribe({
            next: () => console.log('Imagen eliminada:', imageUrl),
            error: (err) => console.error('Error al eliminar imagen:', err),
          });
        }
      });
    }

    this.productsService.deleteProduct(id).subscribe({
      next: () => {
        this.products = this.products.filter((p) => p._id !== id);
        console.log('Producto eliminado:', id);
      },
      error: (err) => console.error('Error al eliminar el producto:', err),
    });
  }

  /**
   * Obtiene los campos modificados entre dos productos.
   * @param original Producto original.
   * @param updated Producto actualizado.
   * @returns Un objeto con los cambios detectados.
   */
  private getModifiedFields(original: Product, updated: Product): UpdateProductDto {
    return Object.keys(updated).reduce((changes, key) => {
      const updatedValue = updated[key as keyof Product];
      const originalValue = original[key as keyof Product];

      if (Array.isArray(updatedValue) && Array.isArray(originalValue)) {
        if (!this.arraysAreEqual(updatedValue, originalValue)) {
          changes[key] = updatedValue;
        }
      } else if (updatedValue !== originalValue && updatedValue !== undefined) {
        changes[key] = updatedValue;
      }
      return changes;
    }, {} as UpdateProductDto);
  }

  /**
   * Compara si dos arreglos son iguales.
   * @param arr1 Primer arreglo.
   * @param arr2 Segundo arreglo.
   * @returns Verdadero si los arreglos son iguales, falso si no lo son.
   */
  private arraysAreEqual(arr1: any[], arr2: any[]): boolean {
    return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
  }
}