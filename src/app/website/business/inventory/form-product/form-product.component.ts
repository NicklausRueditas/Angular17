import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Product } from '../../../../core/interfaces/product.interface';
import { ImageService } from '../../../../core/services/image.service';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-form-product',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './form-product.component.html',
  styleUrls: ['./form-product.component.css'],
})
export class FormProductComponent {
  @Input() selectedProduct: Partial<Product> | null = null; // Producto para editar

  @Input() isEditMode: boolean = false;

  @Output() closeModal = new EventEmitter<boolean>();
  @Output() productAdded = new EventEmitter<Product>();

  buttonSaveEnable: boolean = true;

  productForm: FormGroup;

  // Controles reactivos independientes
  objectKeys = Object.keys;
  specKeyControl = new FormControl('');
  specValueControl = new FormControl('');

  constructor(private imageService: ImageService, private fb: FormBuilder) {
    this.productForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(4)], ,], // Código único del producto
      name: ['', Validators.required], // Nombre del producto
      brand: ['', Validators.required], // Marca del producto
      model: ['', Validators.required], // Modelo del producto
      description: [''], // Descripción opcional
      specifications: [null], // Especificaciones dinámicas
      supplier: ['', Validators.required], // Proveedor
      color: ['', Validators.required], // Color
      size: ['', Validators.required], // Tamaño
      information: [''], // Información adicional opcional
      price: [0, [Validators.required, Validators.min(0)]], // Precio del producto (debe ser mayor o igual a 0)
      category: this.fb.array([], Validators.required), // Categorías del producto
      gallery: this.fb.array([], Validators.required), // URLs de imágenes
      stock: [0, [Validators.required, Validators.min(0)]], // Inventario disponible (debe ser mayor o igual a 0)
    });
  }

  disableInputs() {
    if (this.selectedProduct) {
      if (this.isEditMode) {
/*         this.productForm.get('code')?.disable(); */
        this.buttonSaveEnable = true
      } else {
        this.productForm.disable();
        this.buttonSaveEnable = false
      }
    } else {
      this.productForm.enable();
      this.buttonSaveEnable = true
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.disableInputs();
    if (changes['selectedProduct']?.currentValue) {
      this.productForm.reset(); // Limpia el formulario antes de llenarlo

      // Cargar categorías en el FormArray
      const categoryArray = this.productForm.get('category') as FormArray;
      this.clearFormArray(categoryArray);
      this.selectedProduct?.category?.forEach((cat) =>
        categoryArray.push(this.fb.control(cat, Validators.required))
      );

      // Cargar galería en el FormArray
      const galleryArray = this.productForm.get('gallery') as FormArray;
      this.clearFormArray(galleryArray);
      this.selectedProduct?.gallery?.forEach((item) =>
        galleryArray.push(this.fb.control(item, Validators.required))
      );

      // Rellenar el resto del formulario
      this.productForm.patchValue(this.selectedProduct || {});
    } else {
      this.productForm.reset();
    }
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      // Emitir los datos del formulario
      this.productAdded.emit(this.productForm.value as Product);
      this.onCloseModal();
    }
  }

  /**
   * Función para eliminar todos los elementos de un FormArray.
   * @param formArray El FormArray que será limpiado.
   */
  private clearFormArray(formArray: FormArray): void {
    // Elimina todos los controles del FormArray
    while (formArray.length) {
      formArray.removeAt(0); // Elimina el primer elemento
    }
  }

  /* ------------------------categoria---------------------------- */

  categoryOptions: string[] = [
    '2024',
    'Laptop',
    'Comedor',
    'Computadora',
    'Accesorios',
    'Zapatillas',
    'Herramientas',
    'Cocina',
  ];

  // Función para obtener el FormArray de 'category'
  get categoryArray(): FormArray {
    return this.productForm.get('category') as FormArray;
  }

  // Función para agregar una categoría al FormArray
  addCategory(event: Event): void {
    // Obtener el valor seleccionado desde el evento
    const category = (event.target as HTMLSelectElement).value;

    // Verificar si el valor es válido y no está vacío
    if (
      category &&
      category.trim() &&
      !this.categoryArray.value.includes(category)
    ) {
      // Agregar la categoría al FormArray
      this.categoryArray.push(
        this.fb.control(category.trim(), Validators.required)
      );

      // Reiniciar el valor del select (opcional)
      (event.target as HTMLSelectElement).value = '';
    }
  }

  // Función para eliminar una categoría del FormArray
  removeCategory(index: number): void {
    if (index >= 0 && index < this.categoryArray.length) {
      this.categoryArray.removeAt(index);
    }
  }

  /* ------------------------especificaciones---------------------------- */

  // Función para obtener el valor actual de 'specifications'
  get specifications(): Record<string, string> | null {
    return this.productForm.get('specifications')?.value || {};
  }

  // Función para agregar o actualizar una especificación
  addOrUpdateSpecification(): void {
    const key = this.specKeyControl.value;
    const value = this.specValueControl.value;
    if (key?.trim() && value?.trim()) {
      const currentSpecs = this.specifications || {};
      currentSpecs[key.trim()] = value.trim(); // Agregar o actualizar la especificación
      this.productForm.get('specifications')?.setValue(currentSpecs); // Actualiza el campo 'specifications'

      // Limpiar los campos de entrada
      this.specKeyControl.reset();
      this.specValueControl.reset();
    }
  }

  // Función para eliminar una especificación por clave
  removeSpecification(key: string): void {
    if (key && key.trim()) {
      const currentSpecs = { ...this.specifications }; // Copia actual de las especificaciones
      delete currentSpecs[key.trim()]; // Eliminar la clave especificada
      this.productForm.get('specifications')?.setValue(currentSpecs); // Actualiza el campo 'specifications'
    }
  }

  // Función para listar todas las especificaciones
  listSpecifications(): Record<string, string> {
    return this.specifications || {};
  }

  // Función para limpiar todas las especificaciones
  clearSpecifications(): void {
    this.productForm.get('specifications')?.setValue(null); // Resetea el campo
  }

  /* ------------------------galeria---------------------------- */

  // Función para manejar la selección de imagen
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.imageService.uploadImage(file).subscribe(
        (response) => {
          this.addGalleryImage(response.url); // Agregar la URL al array
        },
        (error) => {
          console.error('Error uploading image:', error);
        }
      );
    }
  }

  // Función para obtener el FormArray de 'gallery'
  get galleryArray(): FormArray {
    return this.productForm.get('gallery') as FormArray;
  }

  // Función para agregar una URL de imagen al FormArray
  addGalleryImage(url: string): void {
    if (url && url.trim()) {
      this.galleryArray.push(this.fb.control(url.trim(), Validators.required));
    }
  }

  // Función para eliminar una URL de imagen del FormArray
  removeImage(index: number, url: string): void {
    // Validar que el índice y la URL sean válidos
    if (index >= 0 && index < this.galleryArray.length && url && url.trim()) {
      const idLink = url.split('/').pop();

      // Verificar que el idLink sea válido
      if (idLink) {
        this.imageService.deleteImage(idLink).subscribe({
          next: () => {
            console.log('Imagen eliminada del servidor:', url);
            // Eliminar del FormArray después de la confirmación del servidor
            this.galleryArray.removeAt(index);
          },
          error: (err) => {
            console.error('Error al eliminar la imagen del servidor:', err);
          },
        });
      } else {
        console.error('ID de imagen no válido extraído de la URL:', url);
      }
    } else {
      console.error('Índice o URL no válidos:', { index, url });
    }
  }

  // Variable para almacenar el índice del elemento arrastrado
  draggedIndex: number | null = null;

  // Función que se ejecuta al iniciar el arrastre
  onDragStart(index: number): void {
    this.draggedIndex = index;
  }

  // Función que se ejecuta cuando un elemento es soltado
  onDrop(event: Event, dropIndex: number): void {
    event.preventDefault(); // Prevenir el comportamiento por defecto del navegador

    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
      const controls = this.galleryArray.controls;

      // Mover el elemento dentro del array
      const draggedControl = controls[this.draggedIndex];
      controls.splice(this.draggedIndex, 1); // Eliminar el elemento arrastrado
      controls.splice(dropIndex, 0, draggedControl); // Insertarlo en la nueva posición

      // Actualizar el array y limpiar el índice arrastrado
      this.galleryArray.updateValueAndValidity();
      this.draggedIndex = null;
    }
  }

  /* ------------------------modal---------------------------- */

  // Cerrar modal
  onCloseModal(): void {
    // Resetea los datos del formulario
    this.productForm.reset();
    this.closeModal.emit(); // Notifica al padre que se cerró el modal
  }
}
