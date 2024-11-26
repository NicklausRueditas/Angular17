import { Component } from '@angular/core';
import { ProductsComponent } from './pages/products/products.component';

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [ProductsComponent],
  templateUrl: './store.component.html',
  styleUrl: './store.component.css'
})
export class StoreComponent{

}
