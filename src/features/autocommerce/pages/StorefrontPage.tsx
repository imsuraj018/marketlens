
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicProducts } from "../services/products";
import { submitProductEnquiry } from "../services/enquiries";
import { STORE_NAME } from "../config";

type PublicProduct = Awaited<
  ReturnType<typeof getPublicProducts>
>[number];

export default function StorefrontPage() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    getPublicProducts()
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Catalogue unavailable");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function sendEnquiry(productId: string) {
    setError("");
    setSuccess("");
    setSending(true);

    try {
      await submitProductEnquiry(productId, message);
      setSuccess("Your enquiry has been submitted.");
      setMessage("");
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enquiry failed");
    } finally {
      setSending(false);
    }
  }

  const filtered = products.filter((product) =>
    [product.name, product.category, product.brand ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="ac-page">
      <header className="ac-store-hero">
        <p className="ac-eyebrow">MARKETLENS AUTOCOMMERCE</p>
        <h1>{STORE_NAME}</h1>
        <p>Explore car accessories and enquire about products.</p>
        <Link to="/stores">Explore other MarketLens businesses</Link>
      </header>

      <div className="ac-heading">
        <h2>Product catalogue</h2>
        <input
          aria-label="Search catalogue"
          placeholder="Search accessories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p>Loading catalogue...</p>}
      {error && <p className="ac-error" role="alert">{error}</p>}
      {success && <p className="ac-success" role="status">{success}</p>}

      {!loading && filtered.length === 0 && (
        <p>No published products found.</p>
      )}

      <div className="ac-product-grid">
        {filtered.map((product) => (
          <article className="ac-panel ac-product-card" key={product.id}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} />
            ) : (
              <div className="ac-image-placeholder">Car accessory</div>
            )}

            <small>{product.category}</small>
            <h3>{product.name}</h3>
            <p>{product.description}</p>

            <strong className="ac-price">
              ₹{Number(product.retail_price).toLocaleString("en-IN")}
            </strong>

            {selected === product.id ? (
              <div className="ac-enquiry">
                <textarea
                  aria-label={`Enquiry about ${product.name}`}
                  rows={3}
                  maxLength={2000}
                  placeholder="Ask about availability, fitment or installation..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />

                <div className="ac-actions">
                  <button
                    className="ac-primary"
                    disabled={sending || message.trim().length < 5}
                    onClick={() => sendEnquiry(product.id)}
                  >
                    {sending ? "Sending..." : "Submit enquiry"}
                  </button>

                  <button onClick={() => setSelected(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="ac-primary"
                onClick={() => {
                  setSelected(product.id);
                  setMessage("");
                  setError("");
                }}
              >
                Enquire now
              </button>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
