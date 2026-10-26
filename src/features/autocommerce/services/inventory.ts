
import { db } from "../../../lib";
import { getBusinessId } from "../config";
import type {
  InventoryRecord,
  StockLocation,
} from "../types";

export async function getStockLocations(): Promise<StockLocation[]> {
  const { data, error } = await db
    .from("business_stock_locations")
    .select("*")
    .eq("business_id", getBusinessId())
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []) as StockLocation[];
}

export async function getProductInventory(
  productId: string
): Promise<InventoryRecord[]> {
  const { data, error } = await db
    .from("ac_inventory")
    .select("*")
    .eq("business_id", getBusinessId())
    .eq("product_id", productId);

  if (error) throw error;
  return (data ?? []) as InventoryRecord[];
}

export async function saveInventory(
  productId: string,
  locationId: string,
  quantity: number,
  reorderLevel: number
): Promise<void> {
  if (
    !Number.isSafeInteger(quantity) ||
    !Number.isSafeInteger(reorderLevel) ||
    quantity < 0 ||
    reorderLevel < 0
  ) {
    throw new Error("Inventory values must be non-negative integers");
  }

  const { error } = await db
    .from("ac_inventory")
    .upsert(
      {
        business_id: getBusinessId(),
        product_id: productId,
        stock_location_id: locationId,
        quantity_on_hand: quantity,
        reorder_level: reorderLevel,
      },
      {
        onConflict: "product_id,stock_location_id",
      }
    );

  if (error) throw error;
}
