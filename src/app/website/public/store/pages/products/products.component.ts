import { Component, OnInit } from '@angular/core';
import { Product } from '../../../../../core/interfaces/product.interface';
import { ProductsService } from '../../../../../core/services/products.service';
import { BasketService } from '../../../../../core/services/basket.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [], // 📌 Importa los módulos necesarios aquí si los usas
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'], // 📌 Usa styleUrls en lugar de styleUrl
})
export class ProductsComponent implements OnInit {
  // Lista de productos
  products: Product[] = [];

  constructor(
    private productService: ProductsService, // 📌 Servicio de productos
    private basketService: BasketService // 📌 Servicio del carrito
  ) {}

  /**
   * Método del ciclo de vida de Angular: se ejecuta al inicializar el componente.
   * Carga los productos al iniciar.
   */
  ngOnInit(): void {
    this.loadProducts();
  }

  /**
   * Carga los productos desde el servicio.
   */
  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (result) => {
        this.products = result.data; // Asigna los productos a la lista
      },
      error: (err) => {
        console.error('Error al cargar productos:', err); // Manejo de errores
      },
    });
  }

  /**
   * Agrega un producto al carrito.
   * @param product El producto que se va a agregar al carrito.
   */
  addToCart(product: Product): void {
    if (!product._id) {
      console.error('El producto no tiene un ID válido.');
      return;
    }

    // Llama al servicio para agregar el producto al carrito
    this.basketService.addToCart(product._id, 1);
  }
}
