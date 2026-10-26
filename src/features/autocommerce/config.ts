
const businessId = import.meta.env.VITE_ANSHUL_BUSINESS_ID;

export function getBusinessId(): string {
  if (
    !businessId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId)
  ) {
    throw new Error(
      "Configure a valid VITE_ANSHUL_BUSINESS_ID in .env.local"
    );
  }

  return businessId;
}

export const STORE_NAME = "Anshul Car Decor";
