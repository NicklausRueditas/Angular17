export interface Basket {
  _id?: string;
  items: Item[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  product: string;
  quantity: number;
}