
import { db } from "../../../lib";
import { getBusinessId } from "../config";
import type { AutoProduct, ProductInput } from "../types";

const table = () => db.from("ac_products");
const business = () => getBusinessId();

export async function getOwnerProducts(): Promise<AutoProduct[]> {
  const { data, error } = await table()
    .select("*")
    .eq("business_id", business())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AutoProduct[];
}

export async function createProduct(
  input: ProductInput
): Promise<AutoProduct> {
  const { data, error } = await table()
    .insert({
      ...input,
      business_id: business(),
      is_published: false,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as AutoProduct;
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<AutoProduct> {
  const { data, error } = await table()
    .update(input)
    .eq("id", id)
    .eq("business_id", business())
    .select("*")
    .single();

  if (error) throw error;
  return data as AutoProduct;
}

export async function setProductPublished(
  id: string,
  published: boolean
): Promise<void> {
  const { data, error } = await table()
    .update({ is_published: published })
    .eq("id", id)
    .eq("business_id", business())
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Product was not updated");
}

export async function deactivateProduct(id: string): Promise<void> {
  const { data, error } = await table()
    .update({ is_active: false, is_published: false })
    .eq("id", id)
    .eq("business_id", business())
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Product was not updated");
}

// Public-facing fields only. Never use SELECT * here.
export async function getPublicProducts() {
  const { data, error } = await table()
    .select(`
      id,
      business_id,
      sku,
      name,
      description,
      category,
      brand,
      image_url,
      retail_price
    `)
    .eq("business_id", business())
    .eq("is_published", true)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}
