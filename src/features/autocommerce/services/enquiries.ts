
import { db } from "../../../lib";
import { getBusinessId } from "../config";

export async function submitProductEnquiry(
  productId: string,
  message: string
) {
  const cleanMessage = message.trim();

  if (cleanMessage.length < 5 || cleanMessage.length > 2000) {
    throw new Error("Message must contain 5–2000 characters");
  }

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Please sign in before enquiring");

  const { error } = await db.from("ac_product_enquiries").insert({
    business_id: getBusinessId(),
    product_id: productId,
    customer_id: user.id,
    message: cleanMessage,
    enquiry_type: "general",
  });

  if (error) throw error;
}

export async function getOwnerEnquiries() {
  const { data, error } = await db
    .from("ac_product_enquiries")
    .select(`
      id,
      product_id,
      customer_id,
      message,
      enquiry_type,
      status,
      created_at
    `)
    .eq("business_id", getBusinessId())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
