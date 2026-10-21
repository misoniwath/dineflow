export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: "Starters" | "Mains" | "Desserts" | "Beverages";
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
