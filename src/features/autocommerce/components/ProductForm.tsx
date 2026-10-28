
import { useEffect, useState, type FormEvent } from "react";
import type { AutoProduct, ProductInput } from "../types";
import { getProductTemplates, type ProductTemplate } from "../services/products";

type Props = {
  product?: AutoProduct | null;
  saving: boolean;
  onSave: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
};

const emptyForm: ProductInput = {
  sku: "",
  name: "",
  description: "",
  category: "",
  brand: "",
  image_url: "",
  hsn_code: "",
  gst_rate: 18,
  retail_price: 0,
  wholesale_reference_price: null,
};

export default function ProductForm({
  product,
  saving,
  onSave,
  onCancel,
}: Props) {
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  useEffect(() => { getProductTemplates().then(setTemplates).catch(e => setError(e instanceof Error ? e.message : "Catalogue unavailable")); }, []);

  useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        brand: product.brand,
        image_url: product.image_url,
        hsn_code: product.hsn_code,
        gst_rate: product.gst_rate,
        retail_price: product.retail_price,
        wholesale_reference_price:
          product.wholesale_reference_price,
      });
    } else {
      setForm({ ...emptyForm });
    }
    setError("");
  }, [product]);

  function change<K extends keyof ProductInput>(
    key: K,
    value: ProductInput[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!product && !templates.some(t => t.sku === form.sku)) { setError("Select an approved product"); return; }
    if (!form.sku.trim() || !form.name.trim() || !form.category.trim()) {
      setError("SKU, product name and category are required");
      return;
    }

    if (
      !Number.isFinite(form.retail_price) ||
      form.retail_price < 0 ||
      (form.gst_rate !== null &&
        (!Number.isFinite(form.gst_rate) ||
          form.gst_rate < 0 ||
          form.gst_rate > 100)) ||
      (form.wholesale_reference_price !== null &&
        (!Number.isFinite(form.wholesale_reference_price) ||
          form.wholesale_reference_price < 0))
    ) {
      setError("Enter valid prices and GST percentage");
      return;
    }

    try {
      await onSave({
        ...form,
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <form className="ac-panel ac-form" onSubmit={submit}>
      <h2>{product ? "Edit product" : "Add new product"}</h2>

      {error && <p role="alert" className="ac-error">{error}</p>}

      <div className="ac-form-grid">
        <label className="ac-wide">
          Predefined product *
          <select required disabled={Boolean(product)} value={form.sku} onChange={e => {
            const t = templates.find(t => t.sku === e.target.value);
            if (t) setForm(previous => ({ ...previous, sku: t.sku, name: t.name, category: t.category, description: t.description, brand: t.brand }));
          }}>
            <option value="">Select a catalogue product</option>
            {templates.map(t => <option key={t.sku} value={t.sku}>{t.category} — {t.name} ({t.sku})</option>)}
            {product && !templates.some(t => t.sku === product.sku) && <option value={product.sku}>{product.name} ({product.sku})</option>}
          </select>
        </label>
        <label>SKU<input readOnly value={form.sku} /></label>
        <label>Product name<input readOnly value={form.name} /></label>
        <label>Category<input readOnly value={form.category} /></label>

        <label>
          Brand
          <input
            value={form.brand ?? ""}
            onChange={(e) => change("brand", e.target.value)}
          />
        </label>

        <label>
          Retail price (₹) *
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.retail_price}
            onChange={(e) =>
              change("retail_price", Number(e.target.value))
            }
          />
        </label>

        <label>
          Wholesale reference price (₹)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.wholesale_reference_price ?? ""}
            onChange={(e) =>
              change(
                "wholesale_reference_price",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </label>

        <label>
          GST rate (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.gst_rate ?? ""}
            onChange={(e) =>
              change(
                "gst_rate",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </label>

        <label>
          HSN code
          <input
            value={form.hsn_code ?? ""}
            onChange={(e) => change("hsn_code", e.target.value)}
          />
        </label>

        <label className="ac-wide">
          Image URL
          <input
            type="url"
            value={form.image_url ?? ""}
            onChange={(e) => change("image_url", e.target.value)}
            placeholder="https://..."
          />
        </label>

        <label className="ac-wide">
          Description
          <textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
      </div>

      <div className="ac-actions">
        <button className="ac-primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : product ? "Save changes" : "Create product"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
