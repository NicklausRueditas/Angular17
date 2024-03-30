export interface Product {
    _id: {
      $oid: string;
    };
    code: string;
    name: string;
    brand: string;
    model: string;
    description: string;
    specifications: {
      color: string;
      size: string;
      characteristics: string[];
      material: string;
      dimension: string[];
      weight: string;
      ability: string;
      _id: {
        $oid: string;
      };
    };
    price: {
      $numberDouble: string;
    };
    category: string[];
    stock: {
      $numberInt: string;
    };
    createdAt: {
      $date: {
        $numberLong: string;
      };
    };
    updatedAt: {
      $date: {
        $numberLong: string;
      };
    };
    __v: {
      $numberInt: string;
    };
  }
