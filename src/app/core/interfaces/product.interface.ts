export interface Product {
  _id: string; // ID único del producto
  code: string; // Código del producto
  name: string; // Nombre del producto
  brand: string; // Marca del producto
  model: string; // Modelo del producto
  description: string; // Descripción detallada del producto
  supplier: string;
  specifications: string[]; // Lista de especificaciones del producto
  color: string; // Color del producto
  size: string; // Tamaño o formato del producto
  information: string;
  price: number; // Precio del producto
  category: string[]; // Categorías a las que pertenece el producto
  gallery: string[]; // URLs de las imágenes del producto
  stock: number; // Cantidad disponible en inventario
  createdAt: Date; // Fecha de creación del producto
  updatedAt: Date; // Fecha de la última actualización del producto
  __v: number; // Versión del documento (propiedad interna de MongoDB)
}
