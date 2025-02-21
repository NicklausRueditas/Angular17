import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../interfaces/product.interface';
import { environment } from '../../../environments/environment.development';
import { UpdateProductDto } from '../dtos/update-product.dto';

/**
 * Servicio para gestionar operaciones CRUD relacionadas con productos.
 * Este servicio sigue principios de arquitectura limpia.
 */
@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  // URL base para la API de productos. Ajustar según el entorno de la aplicación.
  private readonly apiUrl = `${environment.apiUrl}/product`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene un solo producto por su ID.
   * @param productId ID del producto a obtener.
   * @returns Un Observable con el producto solicitado.
   */
  getProductById(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${productId}`);
  }

  /** 📥 Obtener productos por un array de IDs */
  getProductsByIds(ids: string[]): Observable<Product[]> {
    const query = ids.join(',');
    return this.http.get<Product[]>(`${this.apiUrl}/byIds?ids=${query}`);
  }

  /**
   * Obtiene todos los productos de la API.
   * @returns Un Observable con una lista de productos.
   */
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/all`);
  }

  /**
   * Agrega un nuevo producto a la API.
   * @param product Objeto que representa el producto a agregar.
   * @returns Un Observable con el producto agregado.
   */
  addProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  /**
   * Actualiza un producto existente en la API.
   * @param productId ID del producto a actualizar.
   * @param product Objeto con los datos actualizados del producto.
   * @returns Un Observable con el producto actualizado.
   */
  updateProduct(
    productId: string,
    changes: UpdateProductDto
  ): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${productId}`, changes);
  }

  /**
   * Elimina un producto existente en la API.
   * @param productId ID del producto a eliminar.
   * @returns Un Observable vacío cuando el producto se elimina correctamente.
   */
  deleteProduct(productId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${productId}`);
  }
}
