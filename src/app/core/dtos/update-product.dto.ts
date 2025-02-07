export interface UpdateProductDto {
  [key: string]: string | number | string[] | Record<string, string>; // Valores que se pueden actualizar
}
