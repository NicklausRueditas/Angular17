import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product } from '../../../../core/interfaces/product.interface';
import { ImageService } from '../../../../core/services/image.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-product',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './form-product.component.html',
  styleUrl: './form-product.component.css',
})
export class FormProductComponent {
  // Propiedad para controlar la visibilidad del modal
  @Input() isAddModalOpen: boolean = false;

  // Eventos para notificar al componente padre
  @Output() closeModal = new EventEmitter<void>();
  @Output() productAdded = new EventEmitter<Product>();

  // Modelo parcial para el nuevo producto
  newProduct: Partial<Product> = {};

  // Almacena las imágenes seleccionadas para la galería
  selectedImages: { file: File; preview: string; url: string }[] = [];

  // Almacena las categorías seleccionadas
  selectedCategory: string[] = [];

  // Especificaciones del producto en formato key-value
  specifications: { [key: string]: string } = {};
  get specificationKeys(): string[] {
    return Object.keys(this.specifications);
  }
  newSpecKey: string = ''; // Clave temporal para especificación
  newSpecValue: string = ''; // Valor temporal para especificación

  constructor(private imageService: ImageService) {}

  /**
   * Controla la visibilidad del modal y resetea el formulario al cerrarlo.
   * @param isOpen - Indica si el modal debe estar abierto o cerrado.
   */
  toggleAddModal(isOpen: boolean): void {
    this.isAddModalOpen = isOpen;

    if (!isOpen) {
      // Resetea los datos del formulario
      this.newProduct = {};
      this.selectedImages = [];
      this.selectedCategory = [];
      this.specifications = {};
      this.newSpecKey = '';
      this.newSpecValue = '';
      this.closeModal.emit(); // Notifica al padre que se cerró el modal
    }
  }

  /**
   * Valida y emite el producto creado al componente padre.
   */
  saveNewProduct(): void {
    if (!this.newProduct.name || !this.newProduct.price) {
      console.error('El nombre y el precio del producto son obligatorios.');
      return;
    }

    // Procesa los datos del producto
    this.newProduct.gallery = this.selectedImages.map((image) => image.url);
    this.newProduct.category = [...this.selectedCategory];
    this.newProduct.specifications = { ...this.specifications };
    this.newProduct.stock = this.newProduct.stock || 0; // Valor predeterminado

    // Emite el evento con el nuevo producto
    this.productAdded.emit(this.newProduct as Product);
  }

  /**
   * Agrega una nueva especificación al producto.
   */
  addSpecification(): void {
    if (this.newSpecKey.trim() && this.newSpecValue.trim()) {
      this.specifications[this.newSpecKey.trim()] = this.newSpecValue.trim();
      this.newSpecKey = '';
      this.newSpecValue = '';
    }
  }

  /**
   * Elimina una especificación del producto.
   * @param key - Clave de la especificación a eliminar.
   */
  removeSpecification(key: string): void {
    delete this.specifications[key];
  }

  /**
   * Maneja la selección de imágenes para la galería.
   * @param event - Evento de cambio del input de archivos.
   */
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    Array.from(input.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const preview = e.target?.result as string;
        const tempIndex =
          this.selectedImages.push({ file, preview, url: '' }) - 1;

        // Sube la imagen al servidor
        this.imageService.uploadImage(file).subscribe({
          next: (response) => {
            this.selectedImages[tempIndex].url = response.url;
          },
          error: (err) => {
            console.error('Error al subir la imagen:', err);
            this.selectedImages.splice(tempIndex, 1);
          },
        });
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Elimina una imagen de la galería.
   * @param image - Objeto de la imagen a eliminar.
   */
  removeImage(image: { file: File; preview: string; url: string }): void {
    const idLink = image.url.split('/').pop();

    this.imageService.deleteImage(idLink!).subscribe({
      next: () => {
        const index = this.selectedImages.indexOf(image);
        if (index > -1) {
          this.selectedImages.splice(index, 1);
        }
      },
      error: (err) => {
        console.error('Error al eliminar la imagen:', err);
      },
    });
  }

  /**
   * Agrega una categoría seleccionada al producto.
   * @param event - Evento de selección del elemento `select`.
   */
  onCategorySelected(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const category = target.value;

    if (category && !this.selectedCategory.includes(category)) {
      this.selectedCategory.push(category);
    }
  }

  /**
   * Elimina una categoría del producto.
   * @param category - Categoría a eliminar.
   */
  removeCategory(category: string): void {
    this.selectedCategory = this.selectedCategory.filter(
      (item) => item !== category
    );
  }
}