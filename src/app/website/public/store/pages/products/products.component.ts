import { Component, OnInit } from '@angular/core';
import { Product } from '../../../../../core/interfaces/product.interface';
import { ProductsService } from '../../../../../core/services/products.service';
import { BasketService} from '../../../../../core/services/basket.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {

  products: Product[] = [];

  constructor(
    private productService: ProductsService,
    private basketService: BasketService // 📌 Servicio del carrito
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts()
      .subscribe(products => this.products = products);
  }

/** 🛒 Agregar producto al carrito */
addToCart(product: Product): void {
  // Llamamos al servicio para agregar el producto al carrito
  this.basketService.addToCart(product._id,1);
}
}
