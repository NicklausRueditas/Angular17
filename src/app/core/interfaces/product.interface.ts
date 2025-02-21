export interface Product {
  _id: string; // ID del producto en formato string
  code: string; // Código único del producto
  name: string; // Nombre del producto
  brand: string; // Marca del producto
  model: string; // Modelo del producto
  description?: string; // Descripción opcional del producto
  specifications?: Record<string, string>; // Especificaciones dinámicas del producto
  supplier: string; // Proveedor del producto
  color: string; // Color del producto
  size: string; // Tamaño del producto
  information?: string; // Información opcional del producto
  price: number; // Precio del producto
  discount: number; // Descuento del producto
  category: string[]; // Categorías a las que pertenece el producto
  gallery: string[]; // URLs de las imágenes del producto
  stock: number; // Cantidad disponible en inventario
}
