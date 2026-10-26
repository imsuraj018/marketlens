
import { useCallback, useEffect, useMemo, useState } from "react";
import ProductForm from "../components/ProductForm";
import ProductTable from "../components/ProductTable";
import InventoryEditor from "../components/InventoryEditor";

import {
  createProduct,
  deactivateProduct,
  getOwnerProducts,
  setProductPublished,
  updateProduct,
} from "../services/products";

import type { AutoProduct, ProductInput } from "../types";
import { STORE_NAME } from "../config";

export default function OwnerProductsPage() {
  const [products, setProducts] = useState<AutoProduct[]>([]);
  const [selected, setSelected] = useState<AutoProduct | null>(null);
  const [inventoryProduct, setInventoryProduct] =
    useState<AutoProduct | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      const rows = await getOwnerProducts();
      setProducts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) =>
      [product.name, product.sku, product.category, product.brand ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [products, search]);

  async function saveProduct(input: ProductInput) {
    setBusy(true);
    try {
      if (selected) {
        await updateProduct(selected.id, input);
      } else {
        await createProduct(input);
      }

      setShowForm(false);
      setSelected(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function publish(product: AutoProduct) {
    setBusy(true);
    setError("");

    try {
      await setProductPublished(product.id, !product.is_published);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(product: AutoProduct) {
    if (!window.confirm(`Deactivate "${product.name}"?`)) return;

    setBusy(true);
    setError("");

    try {
      await deactivateProduct(product.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ac-page">
      <header className="ac-heading">
        <div>
          <p className="ac-eyebrow">MARKETLENS / AUTOCOMMERCE</p>
          <h1>{STORE_NAME}</h1>
          <p className="ac-muted">Product catalogue and inventory management</p>
        </div>

        <button
          className="ac-primary"
          onClick={() => {
            setSelected(null);
            setInventoryProduct(null);
            setShowForm(true);
          }}
        >
          + Add product
        </button>
      </header>

      <div className="ac-stats">
        <div className="ac-panel">
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>

        <div className="ac-panel">
          <span>Published</span>
          <strong>
            {products.filter((p) => p.is_published && p.is_active).length}
          </strong>
        </div>

        <div className="ac-panel">
          <span>Draft products</span>
          <strong>
            {products.filter((p) => !p.is_published && p.is_active).length}
          </strong>
        </div>

        <div className="ac-panel">
          <span>Inactive products</span>
          <strong>{products.filter((p) => !p.is_active).length}</strong>
        </div>
      </div>

      {error && <p className="ac-error" role="alert">{error}</p>}

      {showForm && (
        <ProductForm
          product={selected}
          saving={busy}
          onSave={saveProduct}
          onCancel={() => {
            setShowForm(false);
            setSelected(null);
          }}
        />
      )}

      {inventoryProduct && (
        <InventoryEditor
          product={inventoryProduct}
          onClose={() => setInventoryProduct(null)}
        />
      )}

      <section>
        <div className="ac-heading">
          <h2>Products</h2>
          <input
            aria-label="Search products"
            placeholder="Search name, SKU or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : (
          <ProductTable
            products={filtered}
            busy={busy}
            onEdit={(product) => {
              setSelected(product);
              setInventoryProduct(null);
              setShowForm(true);
            }}
            onInventory={(product) => {
              setShowForm(false);
              setInventoryProduct(product);
            }}
            onPublish={publish}
            onDeactivate={deactivate}
          />
        )}
      </section>
    </div>
  );
}
