
import { useEffect, useState } from "react";
import {
  getProductInventory,
  getStockLocations,
  saveInventory,
} from "../services/inventory";
import type {
  AutoProduct,
  InventoryRecord,
  StockLocation,
} from "../types";

type Props = {
  product: AutoProduct;
  onClose: () => void;
};

export default function InventoryEditor({ product, onClose }: Props) {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [values, setValues] = useState<
    Record<string, { quantity: number; reorder: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [stockLocations, inventory] = await Promise.all([
        getStockLocations(),
        getProductInventory(product.id),
      ]);

      setLocations(stockLocations);
      setRecords(inventory);

      const next: typeof values = {};

      stockLocations.forEach((location) => {
        const record = inventory.find(
          (item) => item.stock_location_id === location.id
        );

        next[location.id] = {
          quantity: record?.quantity_on_hand ?? 0,
          reorder: record?.reorder_level ?? 5,
        };
      });

      setValues(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inventory load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [product.id]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      for (const location of locations) {
        const value = values[location.id];

        await saveInventory(
          product.id,
          location.id,
          value.quantity,
          value.reorder
        );
      }

      setMessage("Inventory saved successfully");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inventory save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ac-panel">
      <div className="ac-heading">
        <h2>Inventory: {product.name}</h2>
        <button onClick={onClose}>Close</button>
      </div>

      {loading && <p>Loading inventory...</p>}
      {error && <p role="alert" className="ac-error">{error}</p>}
      {message && <p role="status" className="ac-success">{message}</p>}

      {!loading && (
        <>
          {locations.length === 0 && (
            <p>No active stock locations are configured.</p>
          )}

          {locations.map((location) => (
            <div className="ac-stock-row" key={location.id}>
              <div>
                <strong>{location.name}</strong>
                <small>{location.kind}</small>
              </div>

              <label>
                Quantity
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={values[location.id]?.quantity ?? 0}
                  onChange={(e) =>
                    setValues((previous) => ({
                      ...previous,
                      [location.id]: {
                        ...previous[location.id],
                        quantity: Number(e.target.value),
                      },
                    }))
                  }
                />
              </label>

              <label>
                Reorder level
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={values[location.id]?.reorder ?? 5}
                  onChange={(e) =>
                    setValues((previous) => ({
                      ...previous,
                      [location.id]: {
                        ...previous[location.id],
                        reorder: Number(e.target.value),
                      },
                    }))
                  }
                />
              </label>
            </div>
          ))}

          <p className="ac-muted">
            Existing stock records: {records.length}
          </p>

          <button
            className="ac-primary"
            disabled={saving || !locations.length}
            onClick={save}
          >
            {saving ? "Saving..." : "Save inventory"}
          </button>
        </>
      )}
    </section>
  );
}
