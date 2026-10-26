
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import {
  BUSINESS_ID,
  addProduct,
  getOwnerProducts,
  setProductPublished,
  type Product,
} from "../services/api";

type Enquiry = {
  id: string;
  message: string;
  status: string;
  created_at: string;
};

export default function OwnerProductsPage() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    description: "",
    brand: "",
    image_url: "",
    retail_price: "",
  });

  async function loadProducts() {
    setProducts(await getOwnerProducts());
  }

  async function loadEnquiries() {
    const { data, error } = await supabase
      .from("ac_product_enquiries")
      .select("id,message,status,created_at")
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setEnquiries(data ?? []);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;
        if (!auth.user) {
          setFeedback("Please sign in with the owner account.");
          return;
        }

        const { data: membership, error } = await supabase
          .from("business_memberships")
          .select("role")
          .eq("business_id", BUSINESS_ID)
          .eq("user_id", auth.user.id)
          .eq("is_active", true)
          .in("role", ["owner", "manager"])
          .maybeSingle();

        if (error) throw error;

        if (!membership) {
          setFeedback("You do not have owner or manager access.");
          return;
        }

        setAllowed(true);
        await Promise.all([loadProducts(), loadEnquiries()]);
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Loading failed"
        );
      } finally {
        setChecking(false);
      }
    }

    void initialize();
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback("");

    try {
      await addProduct({
        business_id: BUSINESS_ID,
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        brand: form.brand.trim(),
        image_url: form.image_url.trim() || null,
        retail_price: Number(form.retail_price),
        is_published: false,
      });

      setForm({
        sku: "",
        name: "",
        category: "",
        description: "",
        brand: "",
        image_url: "",
        retail_price: "",
      });

      await loadProducts();
      setFeedback("Product saved as a draft.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Could not save product"
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(product: Product) {
    try {
      await setProductPublished(product.id, !product.is_published);
      await loadProducts();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Update failed"
      );
    }
  }

  if (checking) return <main className="ac-container">Checking access...</main>;

  if (!allowed) {
    return (
      <main className="ac-container">
        <h1>Dealer access</h1>
        <p>{feedback}</p>
        <Link to="/auth">Sign in</Link>
      </main>
    );
  }

  return (
    <main className="ac-container">
      <header className="ac-header">
        <h2>Anshul Car Decor · Workspace</h2>
        <Link to="/store">View public store</Link>
      </header>

      <section className="ac-hero">
        <span>OWNER WORKSPACE</span>
        <h1>Product management</h1>
        <p>Manage the products shown to MarketLens customers.</p>
      </section>

      <div className="ac-dashboard">
        <section className="ac-panel">
          <h2>Add product</h2>

          <form onSubmit={createProduct} className="ac-form">
            {(
              [
                ["sku", "SKU"],
                ["name", "Product name"],
                ["category", "Category"],
                ["brand", "Brand"],
                ["image_url", "Image URL"],
                ["retail_price", "Retail price (₹)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required={["sku", "name", "category", "retail_price"].includes(key)}
                  type={key === "retail_price" ? "number" : "text"}
                  min={key === "retail_price" ? "0" : undefined}
                  step={key === "retail_price" ? "0.01" : undefined}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}

            <label>
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </label>

            <button disabled={saving} type="submit">
              {saving ? "Saving..." : "Save product draft"}
            </button>
          </form>
        </section>

        <section className="ac-panel">
          <h2>Products ({products.length})</h2>

          {products.length === 0 && <p>No products added yet.</p>}

          {products.map((product) => (
            <div className="ac-list-item" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <p>
                  {product.sku} · ₹{product.retail_price}
                </p>
                <small>
                  {product.is_published ? "Published" : "Draft"}
                </small>
              </div>

              <button
                className="ac-secondary"
                onClick={() => togglePublished(product)}
              >
                {product.is_published ? "Unpublish" : "Publish"}
              </button>
            </div>
          ))}
        </section>
      </div>

      <section className="ac-panel ac-section">
        <h2>Customer enquiries ({enquiries.length})</h2>

        {enquiries.length === 0 && <p>No enquiries yet.</p>}

        {enquiries.map((enquiry) => (
          <div className="ac-list-item" key={enquiry.id}>
            <div>
              <strong>{enquiry.status}</strong>
              <p>{enquiry.message}</p>
              <small>
                {new Date(enquiry.created_at).toLocaleString("en-IN")}
              </small>
            </div>
          </div>
        ))}
      </section>

      {feedback && <p role="status" className="ac-feedback">{feedback}</p>}
    </main>
  );
}

