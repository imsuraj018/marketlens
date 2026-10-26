
import type { AutoProduct } from "../types";

type Props = {
  products: AutoProduct[];
  busy: boolean;
  onEdit: (product: AutoProduct) => void;
  onInventory: (product: AutoProduct) => void;
  onPublish: (product: AutoProduct) => void;
  onDeactivate: (product: AutoProduct) => void;
};

export default function ProductTable({
  products,
  busy,
  onEdit,
  onInventory,
  onPublish,
  onDeactivate,
}: Props) {
  if (!products.length) {
    return (
      <div className="ac-panel">
        <p>No products found. Add your first product to get started.</p>
      </div>
    );
  }

  return (
    <div className="ac-panel ac-table-wrap">
      <table className="ac-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Retail price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <strong>{product.name}</strong>
                <small>{product.category}</small>
              </td>

              <td>{product.sku}</td>

              <td>
                ₹{Number(product.retail_price).toLocaleString("en-IN")}
              </td>

              <td>
                {!product.is_active
                  ? "Inactive"
                  : product.is_published
                    ? "Published"
                    : "Draft"}
              </td>

              <td>
                <div className="ac-actions">
                  <button
                    disabled={busy}
                    onClick={() => onEdit(product)}
                  >
                    Edit
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => onInventory(product)}
                  >
                    Inventory
                  </button>

                  <button
                    disabled={busy || !product.is_active}
                    onClick={() => onPublish(product)}
                  >
                    {product.is_published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    disabled={busy || !product.is_active}
                    onClick={() => onDeactivate(product)}
                  >
                    Deactivate
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
