
import { db } from "../../../lib";
import { getBusinessId } from "../config";
import type { AutoProduct, ProductInput } from "../types";

const table = () => db.from("ac_products");
const business = () => getBusinessId();

export type ProductTemplate = {
  sku: string; name: string; category: string; description: string; brand: string | null;
};
export async function getProductTemplates(): Promise<ProductTemplate[]> {
  const { data, error } = await db.from("ac_product_templates")
    .select("sku,name,category,description,brand").eq("is_active", true).order("category").order("name");
  if (error) throw error;
  return (data ?? []) as ProductTemplate[];
}
async function requireManager(): Promise<void> {
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Sign in as the store owner or admin");
  const { data: profile, error } = await db.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (error) throw error;
  if (!profile?.is_active) throw new Error("Account inactive");
  if (profile.role === "admin") return;
  if (profile.role !== "business_owner") throw new Error("Owner or admin access required");
  const { data: store, error: storeError } = await db.from("businesses")
    .select("id").eq("id", business()).eq("owner_id", user.id).maybeSingle();
  if (storeError) throw storeError;
  if (!store) throw new Error("You do not own this store");
}


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
  await requireManager();
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
  await requireManager();
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
  await requireManager();
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
  await requireManager();
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
