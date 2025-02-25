export interface Product {
  discount: number;
  _id: string;
  code: string;
  name: string;
  brand: string;
  model: string;
  description: string;
  specifications: Record<string, string>; // Para manejar especificaciones dinámicas
  supplier: string;
  color: string;
  size: string;
  information: string;
  price: number;
  category: string[];
  gallery: string[];
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}
