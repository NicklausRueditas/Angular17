import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../interfaces/product.interface';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private apiUrl: string;

  constructor(private http: HttpClient) {
    
    this.apiUrl = environment.apiUrl; // Usamos la apiUrl definida en el entorno
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/product/all`);
  }
}
