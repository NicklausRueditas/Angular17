import { Component, OnInit } from '@angular/core';
import { BasketService } from '../../../core/services/basket.service';
import { Basket, Item } from '../../../core/interfaces/basket.interface';
import { Product } from '../../../core/interfaces/product.interface';

@Component({
  selector: 'app-basket',
  templateUrl: './basket.component.html',
  styleUrls: ['./basket.component.css'],
})
export class BasketComponent implements OnInit {
  basket: Basket | null = null;
  products: Product[] = []; 

  constructor(private basketService: BasketService) {}

  ngOnInit(): void {
    this.basketService.cartItems$.subscribe((cartItems) => {
      this.basket = cartItems;
    });
    this.basketService.product$.subscribe((cartItems) => {
      this.products
       = cartItems;
    });
  }

  get totalItems(): number {
    return this.basket?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }
  
  get discountCount(): number {
    return this.products.filter((product) => {
      const basketItem = this.basket?.items.find((item) => item.product === product._id);
      return basketItem && product.discount && product.discount > 0;
    }).length;
  }
  
  get totalPrice(): number {
    return this.products.reduce((sum, product) => {
      const basketItem = this.basket?.items.find((item) => item.product === product._id);
      return basketItem ? sum + product.price * basketItem.quantity : sum;
    }, 0);
  }
  
  get discountTotal(): number {
    return this.products.reduce((sum, product) => {
      const basketItem = this.basket?.items.find((item) => item.product === product._id);
      if (basketItem && product.discount) {
        const originalPrice = product.price / (1 - product.discount / 100);
        const discountAmount = originalPrice - product.price;
        return sum + discountAmount * basketItem.quantity;
      }
      return sum;
    }, 0);
  }
  
  get finalTotal(): number {
    return this.totalPrice - this.discountTotal;
  }

  increaseQuantity(item: Item): void {
    item.quantity++;
    this.basketService.updateQuantity(item.product, item.quantity);
  }

  decreaseQuantity(item: Item): void {
    if (item.quantity > 1) {
      item.quantity--;
      this.basketService.updateQuantity(item.product, item.quantity);
    }
  }

  /**
   * 🗑️ Elimina un producto del carrito utilizando `removeFromCart`.
   * @param itemId ID del producto a eliminar
   */
  removeItem(itemId: string): void {
    this.basketService.removeFromCart(itemId); // Llama a la función `removeFromCart` para realizar la eliminación
  }

  getProductById(productId: string): Product | undefined {
    return this.products.find(p => p._id === productId);
  }
}
