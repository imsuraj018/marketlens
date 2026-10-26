
export interface AutoProduct {
  id: string;
  business_id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  brand: string | null;
  image_url: string | null;
  hsn_code: string | null;
  gst_rate: number | null;
  retail_price: number;
  wholesale_reference_price: number | null;
  is_published: boolean;
  is_active: boolean;
  created_at: string;
}

export type ProductInput = Pick<
  AutoProduct,
  | "sku"
  | "name"
  | "description"
  | "category"
  | "brand"
  | "image_url"
  | "hsn_code"
  | "gst_rate"
  | "retail_price"
  | "wholesale_reference_price"
>;

export interface StockLocation {
  id: string;
  business_id: string;
  name: string;
  kind: "store" | "warehouse";
  is_active: boolean;
}

export interface InventoryRecord {
  id: string;
  business_id: string;
  product_id: string;
  stock_location_id: string;
  quantity_on_hand: number;
  reorder_level: number;
  updated_at: string;
}
