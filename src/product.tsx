import { useMemo, useState } from "react";
import {
  Plus, Search, Package, Boxes, CheckCircle2,
  Pencil, Trash2, X, TrendingUp, Filter,
} from "lucide-react";
import "./Products.css";

type Product = {
  id: number;
  name: string;
  type: string;
  category: string;
  salesPrice: number;
  costPrice: number;
  variant: string;
  extraPrice: number;
  notes: string;
  active: boolean;
};

const initialProducts: Product[] = [
  {
    id: 1, name: "Odoo Standard", type: "Service",
    category: "Software", salesPrice: 2000, costPrice: 800,
    variant: "Standard", extraPrice: 0,
    notes: "Standard subscription package", active: true,
  },
  {
    id: 2, name: "Odoo Premium", type: "Service",
    category: "Software", salesPrice: 3500, costPrice: 1500,
    variant: "Premium", extraPrice: 560,
    notes: "Premium features and support", active: true,
  },
  {
    id: 3, name: "Cloud Storage", type: "Digital",
    category: "Cloud", salesPrice: 999, costPrice: 350,
    variant: "100 GB", extraPrice: 0,
    notes: "Cloud storage subscription", active: true,
  },
];

const emptyForm = {
  name: "",
  type: "Service",
  category: "Software",
  salesPrice: "",
  costPrice: "",
  variant: "",
  extraPrice: "0",
  notes: "",
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Products() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" ||
        (filter === "Active" && product.active) ||
        (filter === "Inactive" && !product.active);

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const activeCount = products.filter((p) => p.active).length;
  const totalValue = products.reduce((sum, p) => sum + p.salesPrice, 0);
  const averageMargin = products.length
    ? products.reduce(
        (sum, p) => sum + (p.salesPrice > 0
          ? ((p.salesPrice - p.costPrice) / p.salesPrice) * 100
          : 0),
        0
      ) / products.length
    : 0;

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      type: product.type,
      category: product.category,
      salesPrice: String(product.salesPrice),
      costPrice: String(product.costPrice),
      variant: product.variant,
      extraPrice: String(product.extraPrice),
      notes: product.notes,
    });
    setError("");
    setShowForm(true);
  }

  function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const salesPrice = Number(form.salesPrice);
    const costPrice = Number(form.costPrice);
    const extraPrice = Number(form.extraPrice);

    if (!form.name.trim()) {
      setError("Please enter a product name.");
      return;
    }

    if (form.salesPrice === "" || salesPrice <= 0) {
      setError("Sales price must be greater than zero.");
      return;
    }

    if (form.costPrice === "" || costPrice < 0) {
      setError("Please enter a valid cost price.");
      return;
    }

    if (costPrice > salesPrice) {
      setError("Cost price cannot exceed sales price in this demo.");
      return;
    }

    const product: Product = {
      id: editingId ?? Date.now(),
      name: form.name.trim(),
      type: form.type,
      category: form.category,
      salesPrice,
      costPrice,
      variant: form.variant.trim() || "Default",
      extraPrice: Math.max(0, extraPrice),
      notes: form.notes.trim(),
      active: editingId
        ? products.find((p) => p.id === editingId)?.active ?? true
        : true,
    };

    if (editingId !== null) {
      setProducts((current) =>
        current.map((p) => p.id === editingId ? product : p)
      );
    } else {
      setProducts((current) => [product, ...current]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function deleteProduct(id: number) {
    const confirmed = window.confirm(
      "Delete this product from the catalogue?"
    );

    if (confirmed) {
      setProducts((current) => current.filter((p) => p.id !== id));
    }
  }

  function toggleStatus(id: number) {
    setProducts((current) =>
      current.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p
      )
    );
  }

  return (
    <div className="products-page">
      <section className="products-heading">
        <div>
          <div className="products-eyebrow">CATALOGUE MANAGEMENT</div>
          <h1>Products</h1>
          <p>Manage your products, pricing, variants and profitability.</p>
        </div>

        <button className="product-primary-btn" onClick={openAddForm}>
          <Plus size={18} /> Add Product
        </button>
      </section>

      <section className="product-metrics">
        <article className="product-metric">
          <div className="metric-icon violet"><Package size={20} /></div>
          <span>Total Products</span>
          <strong>{products.length}</strong>
          <small>Products in catalogue</small>
        </article>

        <article className="product-metric">
          <div className="metric-icon green"><CheckCircle2 size={20} /></div>
          <span>Active Products</span>
          <strong>{activeCount}</strong>
          <small>Available for subscriptions</small>
        </article>

        <article className="product-metric">
          <div className="metric-icon blue"><Boxes size={20} /></div>
          <span>Catalogue Value</span>
          <strong>{money(totalValue)}</strong>
          <small>Sum of listed sales prices</small>
        </article>

        <article className="product-metric">
          <div className="metric-icon orange"><TrendingUp size={20} /></div>
          <span>Average Margin</span>
          <strong>{averageMargin.toFixed(1)}%</strong>
          <small>Based on listed products</small>
        </article>
      </section>

      <section className="product-catalogue">
        <div className="catalogue-heading">
          <div>
            <h2>Product Catalogue</h2>
            <p>Search, review and manage your products.</p>
          </div>
          <span className="catalogue-count">
            {filteredProducts.length} products
          </span>
        </div>

        <div className="product-toolbar">
          <div className="product-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or categories..."
            />
          </div>

          <div className="product-filter">
            <Filter size={16} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>TYPE</th>
                <th>SALES PRICE</th>
                <th>COST PRICE</th>
                <th>MARGIN</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const margin = product.salesPrice > 0
                  ? ((product.salesPrice - product.costPrice) /
                      product.salesPrice) * 100
                  : 0;

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name-cell">
                        <div className="product-avatar">
                          <Package size={19} />
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <small>{product.category} · {product.variant}</small>
                        </div>
                      </div>
                    </td>
                    <td>{product.type}</td>
                    <td className="price-cell">{money(product.salesPrice)}</td>
                    <td>{money(product.costPrice)}</td>
                    <td>
                      <span className="margin-value">{margin.toFixed(1)}%</span>
                    </td>
                    <td>
                      <button
                        className={`product-status ${product.active ? "is-active" : "is-inactive"}`}
                        onClick={() => toggleStatus(product.id)}
                        title="Click to change status"
                      >
                        {product.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <div className="product-actions">
                        <button
                          aria-label={`Edit ${product.name}`}
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label={`Delete ${product.name}`}
                          onClick={() => deleteProduct(product.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-products">
                    No products found. Try another search or add a product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="products-demo-note">
        Demo catalogue · Data is currently stored in page state and will reset
        when the page reloads. Supabase persistence comes next.
      </p>

      {showForm && (
        <div className="product-modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <section className="product-modal" role="dialog" aria-modal="true">
            <div className="product-modal-heading">
              <div>
                <span>CATALOGUE</span>
                <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
                <p>Enter the product details below.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div className="product-form-grid">
                <label className="form-field full">
                  Product Name *
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Odoo Premium"
                  />
                </label>

                <label className="form-field">
                  Product Type *
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option>Service</option>
                    <option>Physical</option>
                    <option>Digital</option>
                  </select>
                </label>

                <label className="form-field">
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option>Software</option>
                    <option>Cloud</option>
                    <option>Support</option>
                    <option>Other</option>
                  </select>
                </label>

                <label className="form-field">
                  Sales Price (₹) *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.salesPrice}
                    onChange={(e) => setForm({ ...form, salesPrice: e.target.value })}
                    placeholder="2000"
                  />
                </label>

                <label className="form-field">
                  Cost Price (₹) *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    placeholder="800"
                  />
                </label>

                <label className="form-field">
                  Variant Name
                  <input
                    value={form.variant}
                    onChange={(e) => setForm({ ...form, variant: e.target.value })}
                    placeholder="e.g. Premium"
                  />
                </label>

                <label className="form-field">
                  Variant Extra Price (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.extraPrice}
                    onChange={(e) => setForm({ ...form, extraPrice: e.target.value })}
                    placeholder="560"
                  />
                </label>

                <label className="form-field full">
                  Internal Notes
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Add product details or internal notes..."
                  />
                </label>
              </div>

              {error && <p className="product-form-error">{error}</p>}

              <div className="product-modal-actions">
                <button
                  type="button"
                  className="product-cancel-btn"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="product-primary-btn">
                  <Plus size={17} />
                  {editingId ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
