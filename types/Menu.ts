export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  desc?: string;
  ingredients?: MenuInventoryItem[];
};

export type MenuInventoryItem = {
  id?: string;
  menuItemId?: string;
  inventoryItemId: string;
  quantityRequired: number;
};
