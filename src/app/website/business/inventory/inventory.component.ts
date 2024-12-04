import { Component, OnInit } from '@angular/core';
import { Product } from '../../../core/interfaces/product.interface';
import { ProductsService } from '../../../core/services/products.service';
import { FormsModule } from '@angular/forms';
import { ImageService } from '../../../core/services/image.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
})
export class InventoryComponent implements OnInit {
  products: Product[] = []; // Lista de productos
  isAddModalOpen = false; // Controla la visibilidad del modal
  newProduct: Partial<Product> = {}; // Datos del producto a agregar
  selectedImages: { file: File; preview: string; url: string }[] = []; // Galería de imágenes

  constructor(
    private productsService: ProductsService,
    private imageService: ImageService
  ) {}

  ngOnInit(): void {
    this.loadProducts(); // Carga inicial de productos
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
    if (!isOpen) this.newProduct = {}; // Resetea datos si se cierra
  }

  // Guardar nuevo producto
  saveNewProduct(): void {
    if (!this.newProduct.name || !this.newProduct.price) {
      console.error('Faltan datos del producto');
      return;
    }

    this.productsService.addProduct(this.newProduct as Product).subscribe({
      next: () => {
        console.log('Producto agregado con éxito');
        this.loadProducts(); // Recargar lista de productos
        this.toggleAddModal(false); // Cerrar modal
      },
      error: (err) => console.error('Error al agregar producto:', err),
    });
  }

  // Manejo de selección y subida de imágenes
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    Array.from(input.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const preview = e.target?.result as string;
        const tempIndex = this.selectedImages.push({ file, preview, url: '' }) - 1;

        // Subida al servidor
        this.imageService.uploadImage(file).subscribe({
          next: (response) => {
            this.selectedImages[tempIndex].url = response.url;
            console.log('Imagen subida con éxito:', response.url);
          },
          error: (err) => {
            console.error('Error al subir la imagen:', err);
            this.selectedImages.splice(tempIndex, 1); // Elimina si falla
          },
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // Eliminar producto
  deleteProduct(productId: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    this.productsService.deleteProduct(productId).subscribe({
      next: () => {
        console.log('Producto eliminado con éxito');
        this.loadProducts(); // Recargar lista de productos
      },
      error: (err) => console.error('Error al eliminar producto:', err),
    });
  }

  removeImage(image: { file: File; preview: string; url: string }): void {
    const index = this.selectedImages.indexOf(image);
    if (index > -1) {
      this.selectedImages.splice(index, 1);
    }
  }
}