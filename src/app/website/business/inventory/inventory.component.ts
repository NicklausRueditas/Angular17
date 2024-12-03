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

  uploadSuccess = false; // Bandera para éxito en la subida
  uploadError = false; // Bandera para error en la subida

  constructor(private productsService: ProductsService,private imageService: ImageService) {}

  ngOnInit(): void {
    this.loadProducts(); // Cargar productos al iniciar
  }

  // Cargar lista de productos
  loadProducts(): void {
    this.productsService.getProducts().subscribe(
      (data) => (this.products = data),
      (error) => console.error('Error al cargar productos:', error)
    );
  }

  // Abrir modal para agregar producto
  openAddModal(): void {
    this.isAddModalOpen = true; // Muestra el modal
  }

  // Cerrar modal
  closeAddModal(): void {
    this.isAddModalOpen = false; // Oculta el modal
    this.newProduct = {}; // Resetea los datos del producto
  }

  // Guardar nuevo producto
  saveNewProduct(): void {
    if (this.newProduct.name && this.newProduct.price) {
      this.productsService.addProduct(this.newProduct as Product).subscribe(
        () => {
          console.log('Producto agregado con éxito');
          this.loadProducts(); // Recargar lista de productos
          this.closeAddModal(); // Cerrar modal
        },
        (error) => console.error('Error al agregar producto:', error)
      );
    } else {
      console.error('Faltan datos del producto');
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Subir la imagen
      this.imageService.uploadImage(file).subscribe({
        next: (response) => {
          this.uploadSuccess = true; // Marca éxito
          this.uploadError = false;
          console.log('Imagen subida con éxito:', response.url);
        },
        error: (err) => {
          this.uploadSuccess = false;
          this.uploadError = true; // Marca error
          console.error('Error al subir la imagen:', err);
        },
      });
    }
  }

  // Abrir modal para actualizar producto
  openUpdateModal(product: Product): void {
    // Lógica para abrir modal de actualización
    console.log('Abrir modal para actualizar producto:', product);
  }

  // Subir imagen para un producto
  openUploadModal(product: Product): void {
    // Lógica para subir imagen
    console.log('Abrir modal para subir imagen del producto:', product);
  }

  // Eliminar un producto
  deleteProduct(productId: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      this.productsService.deleteProduct(productId).subscribe(
        () => {
          console.log('Producto eliminado con éxito');
          this.loadProducts(); // Recargar lista de productos
        },
        (error) => console.error('Error al eliminar producto:', error)
      );
    }
  }
}
