import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  take,
  tap,
  toArray,
} from 'rxjs';

import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment.development';
import { SesionService } from './sesion.service';
import { ProductsService } from './products.service';
import { Basket } from '../interfaces/basket.interface';
import { Product } from '../interfaces/product.interface';

@Injectable({
  providedIn: 'root',
})
export class BasketService {
  private readonly apiUrl = `${environment.apiUrl}/basket`; // URL base del backend en NestJS

  private cartItemsSubject = new BehaviorSubject<Basket | null>(null);
  cartItems$ = this.cartItemsSubject.asObservable(); // Observable para suscriptores

  private productsSubject = new BehaviorSubject<Product[]>([]); // Almacena los productos completos
  product$ = this.productsSubject.asObservable(); // Observable para suscriptores

  constructor(
    private http: HttpClient,
    private sesionService: SesionService,
    private productsService: ProductsService
  ) {
    this.loadCart();
  }

  /**
   * 🔄 Carga el carrito desde localStorage o la base de datos si el usuario está autenticado.
   */
  loadCart(): void {
    const localCart = localStorage.getItem('basket');

    this.sesionService.user$
      .pipe(
        filter((user) => user !== null), // Ignorar valores nulos
        take(1), // Tomar el primer valor no nulo
        switchMap((user) => {
          console.log(user)
          if (user) {
            // Usuario autenticado: Verificar si hay un carrito en el localStorage
            if (localCart) {
              const parsedLocalCart = JSON.parse(localCart);

              // Migrar los productos del localStorage al carrito del backend
              return this.migrateLocalCartToBackend(
                user._id,
                parsedLocalCart.items
              );
            } else {
              // No hay carrito en el localStorage: Cargar el carrito desde el backend
              return this.http.get<Basket>(`${this.apiUrl}/${user._id}`);
            }
          } else {
            // Usuario no autenticado: Cargar el carrito desde el localStorage
            if (localCart) {
              this.cartItemsSubject.next(JSON.parse(localCart));
            }
            return of(null);
          }
        }),
        switchMap((basket) => {
          if (basket) {
            const productIds = basket.items.map((item) =>
              item.product.toString()
            );

            // Verifica si productIds está vacío
            if (productIds.length === 0) {
              // Si está vacío, devuelve un observable con un valor predeterminado o null
              return of({ basket, products: [] });
            }

            // Si productIds no está vacío, realiza la solicitud HTTP
            return this.productsService
              .getProductsByIds(productIds)
              .pipe(map((products) => ({ basket, products })));
          } else {
            return of(null);
          }
        })
      )
      .subscribe({
        next: (result) => {
          if (result) {
            this.cartItemsSubject.next(result.basket);
            this.productsSubject.next(result.products);
          }
        },
        error: (err) => console.error('Error al obtener el carrito:', err),
      });
  }

  /**
   * Migra los productos del localStorage al carrito del backend.
   * @param userId ID del usuario autenticado
   * @param items Productos del localStorage
   */
  migrateLocalCartToBackend(userId: string, items: any[]): Observable<Basket> {
    // Agregar cada producto del localStorage al carrito del backend
    return from(items).pipe(
      mergeMap((item) =>
        this.http.post(`${this.apiUrl}/${userId}/add`, {
          productId: item.product,
          quantity: item.quantity,
        })
      ),
      toArray(), // Convertir las respuestas en un array
      switchMap(() => this.http.get<Basket>(`${this.apiUrl}/${userId}`)), // Obtener el carrito actualizado
      tap(() => localStorage.removeItem('basket')) // Eliminar el carrito del localStorage
    );
  }

  /**
   * 🛒 Agrega un producto al carrito y lo guarda.
   * @param productId ID del producto a añadir
   * @param quantity Cantidad del producto (por defecto 1)
   */
  addToCart(productId: string, quantity: number = 1): void {
    this.sesionService.user$
      .pipe(
        take(1), // Tomar solo la última emisión del observable
        switchMap((user) => {
          if (user) {
            // Usuario autenticado: Agrega el producto al carrito en el backend
            return this.productsService.getProductById(productId).pipe(
              take(1),
              switchMap((product) => {
                if (product) {
                  return this.http.post(`${this.apiUrl}/${user._id}/add`, {
                    productId: product._id,
                    quantity,
                  });
                } else {
                  throw new Error('Producto no encontrado');
                }
              })
            );
          } else {
            // Usuario no autenticado: Manejo del carrito en localStorage
            const currentCart = this.cartItemsSubject.value || {
              items: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Buscar si el producto ya está en el carrito
            const existingItem = currentCart.items.find(
              (item) => item.product === productId
            );

            if (existingItem) {
              existingItem.quantity += quantity; // Aumentar cantidad si ya existe
            } else {
              // Obtener el producto y agregarlo al carrito
              return this.productsService.getProductById(productId).pipe(
                take(1),
                switchMap((product) => {
                  if (product) {
                    currentCart.items.push({
                      product: product._id,
                      quantity,
                    });

                    currentCart.updatedAt = new Date(); // Actualizar la fecha de modificación
                    this.cartItemsSubject.next(currentCart);
                    localStorage.setItem('basket', JSON.stringify(currentCart));
                  }
                  return of(null); // Devuelve un observable nulo para completar el flujo
                })
              );
            }

            this.cartItemsSubject.next(currentCart);
            localStorage.setItem('basket', JSON.stringify(currentCart));
            return of(null); // Devuelve un observable nulo para completar el flujo
          }
        })
      )
      .subscribe({
        next: () => {
          this.loadCart(); // Recargar carrito después de agregar el producto
        },
        error: (err) => {
          console.error('Error al agregar el producto al carrito:', err);
        },
      });
  }

  /**
   * 🛒 Actualiza la cantidad de un producto en el carrito.
   * @param productId ID del producto a actualizar
   * @param change Cantidad a añadir o restar (puede ser negativo o positivo)
   */
  updateQuantity(productId: string, change: number): void {
    this.sesionService.user$.subscribe((user) => {
      if (user) {
        // Usuario autenticado: Actualiza la cantidad en el backend
        this.http
          .patch(`${this.apiUrl}/${user._id}/update`, {
            productId,
            quantityChange: change,
          })
          .subscribe(() => this.loadCart()); // Recarga el carrito tras la actualización
      } else {
        // Usuario no autenticado: Actualiza la cantidad en localStorage
        const currentCart = this.cartItemsSubject.value || {
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Buscar el producto en el carrito
        const itemToUpdate = currentCart.items.find(
          (item) => item.product === productId
        );

        if (itemToUpdate) {
          // Actualiza la cantidad del producto
          itemToUpdate.quantity = Math.max(1, itemToUpdate.quantity + change); // Asegura que la cantidad no sea menor que 1
          currentCart.updatedAt = new Date(); // Actualiza la fecha de modificación

          // Actualiza el carrito en la vista y en localStorage
          this.cartItemsSubject.next(currentCart);
          localStorage.setItem('basket', JSON.stringify(currentCart));
        }
      }
    });
  }

  /**
   * 🗑️ Elimina un producto del carrito.
   * @param productId ID del producto a eliminar
   */
  removeFromCart(productId: string): void {
    this.sesionService.user$.subscribe((user) => {
      if (user) {
        // Usuario autenticado: Elimina el producto del carrito en el backend
        this.http
          .delete(`${this.apiUrl}/${user._id}/remove/${productId}`)
          .subscribe(() => this.loadCart()); // Recarga el carrito tras la eliminación
      } else {
        // Usuario no autenticado: Elimina el producto del carrito en localStorage
        const currentCart = this.cartItemsSubject.value || {
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Filtra el producto a eliminar
        const updatedItems = currentCart.items.filter(
          (item) => item.product !== productId
        );

        // Actualiza el carrito
        currentCart.items = updatedItems;
        currentCart.updatedAt = new Date(); // Actualiza la fecha de modificación

        this.cartItemsSubject.next(currentCart);
        localStorage.setItem('basket', JSON.stringify(currentCart));
      }
    });
  }

  /**
   * 💾 Guarda el carrito en localStorage o en la base de datos según el estado de autenticación.
   */
  private saveCart(): void {
    this.sesionService.user$.subscribe((user) => {
      if (user) {
        this.http.post(this.apiUrl, this.cartItemsSubject.value).subscribe();
      } else {
        localStorage.setItem(
          'basket',
          JSON.stringify(this.cartItemsSubject.value)
        );
      }
    });
  }

  /**
   * 🛍️ Obtiene los productos del carrito.
   * @returns Lista de productos en el carrito
   */
  getCartItems(): Basket | null {
    return this.cartItemsSubject.value || null;
  }

  /**
   * 🗑️ Vacía el carrito y actualiza el almacenamiento.
   */
  clearCart(): void {
    this.cartItemsSubject.next(null);
    this.saveCart();
  }
}
