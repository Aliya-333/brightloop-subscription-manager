
import { useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Tag,
  Percent,
  IndianRupee,
  CalendarDays,
  Users,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import "./Discounts.css";

type DiscountType = "Percentage" | "Fixed";
type AppliesTo = "Products" | "Subscriptions" | "Both";
type DiscountStatus = "Active" | "Scheduled" | "Expired" | "Inactive";

type Discount = {
  id: number;
  code: string;
  name: string;
  type: DiscountType;
  value: number;
  minPurchase: number;
  minQuantity: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  appliesTo: AppliesTo;
  status: DiscountStatus;
};

const initialDiscounts: Discount[] = [
  {
    id: 1,
    code: "WELCOME20",
    name: "Welcome Offer",
    type: "Percentage",
    value: 20,
    minPurchase: 500,
    minQuantity: 1,
    startDate: "2026-01-01",
    endDate: "2027-01-31",
    usageLimit: 500,
    usedCount: 125,
    appliesTo: "Both",
    status: "Active",
  },
  {
    id: 2,
    code: "SAVE500",
    name: "Flat Savings",
    type: "Fixed",
    value: 500,
    minPurchase: 2000,
    minQuantity: 1,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    usageLimit: 200,
    usedCount: 48,
    appliesTo: "Subscriptions",
    status: "Active",
  },
  {
    id: 3,
    code: "NEWYEAR15",
    name: "New Year Special",
    type: "Percentage",
    value: 15,
    minPurchase: 1000,
    minQuantity: 2,
    startDate: "2027-01-01",
    endDate: "2027-01-31",
    usageLimit: 300,
    usedCount: 0,
    appliesTo: "Products",
    status: "Scheduled",
  },
  {
    id: 4,
    code: "EARLYBIRD",
    name: "Early Bird Offer",
    type: "Percentage",
    value: 10,
    minPurchase: 0,
    minQuantity: 1,
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    usageLimit: 100,
    usedCount: 100,
    appliesTo: "Both",
    status: "Expired",
  },
];

const emptyForm = {
  code: "",
  name: "",
  type: "Percentage" as DiscountType,
  value: "",
  minPurchase: "0",
  minQuantity: "1",
  startDate: "",
  endDate: "",
  usageLimit: "",
  appliesTo: "Both" as AppliesTo,
};

function getStatus(discount: Discount): DiscountStatus {
  if (discount.status === "Inactive") return "Inactive";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(`${discount.startDate}T00:00:00`);
  const end = new Date(`${discount.endDate}T23:59:59`);

  if (discount.usedCount >= discount.usageLimit) return "Expired";
  if (today < start) return "Scheduled";
  if (today > end) return "Expired";

  return "Active";
}

function formatDate(date: string) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function Discounts() {
  const [discounts, setDiscounts] = useState<Discount[]>(initialDiscounts);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const currentDiscounts = useMemo(
    () =>
      discounts.map((discount) => ({
        ...discount,
        status: getStatus(discount),
      })),
    [discounts]
  );

  const filteredDiscounts = currentDiscounts.filter((discount) => {
    const matchesSearch =
      discount.name.toLowerCase().includes(search.toLowerCase()) ||
      discount.code.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || discount.status === filter;

    return matchesSearch && matchesFilter;
  });

  const activeCount = currentDiscounts.filter(
    (discount) => discount.status === "Active"
  ).length;

  const scheduledCount = currentDiscounts.filter(
    (discount) => discount.status === "Scheduled"
  ).length;

  const totalUsed = discounts.reduce(
    (sum, discount) => sum + discount.usedCount,
    0
  );

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEditModal(discount: Discount) {
    setEditingId(discount.id);
    setForm({
      code: discount.code,
      name: discount.name,
      type: discount.type,
      value: String(discount.value),
      minPurchase: String(discount.minPurchase),
      minQuantity: String(discount.minQuantity),
      startDate: discount.startDate,
      endDate: discount.endDate,
      usageLimit: String(discount.usageLimit),
      appliesTo: discount.appliesTo,
    });
    setError("");
    setShowModal(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const value = Number(form.value);
    const minPurchase = Number(form.minPurchase);
    const minQuantity = Number(form.minQuantity);
    const usageLimit = Number(form.usageLimit);

    if (
      !form.code.trim() ||
      !form.name.trim() ||
      !form.startDate ||
      !form.endDate
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      (form.type === "Percentage" && value > 100)
    ) {
      setError(
        form.type === "Percentage"
          ? "Enter a percentage between 1 and 100."
          : "Enter a valid discount amount."
      );
      return;
    }

    if (
      !Number.isFinite(minPurchase) ||
      minPurchase < 0 ||
      !Number.isInteger(minQuantity) ||
      minQuantity < 1 ||
      !Number.isInteger(usageLimit) ||
      usageLimit < 1
    ) {
      setError("Check the minimum purchase, quantity, and usage limit.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date must be after the start date.");
      return;
    }

    const normalizedCode = form.code.trim().toUpperCase();

    const duplicate = discounts.some(
      (discount) =>
        discount.code.toUpperCase() === normalizedCode &&
        discount.id !== editingId
    );

    if (duplicate) {
      setError("This discount code already exists.");
      return;
    }

    if (editingId !== null) {
      setDiscounts((previous) =>
        previous.map((discount) =>
          discount.id === editingId
            ? {
                ...discount,
                code: normalizedCode,
                name: form.name.trim(),
                type: form.type,
                value,
                minPurchase,
                minQuantity,
                startDate: form.startDate,
                endDate: form.endDate,
                usageLimit,
                appliesTo: form.appliesTo,
              }
            : discount
        )
      );
    } else {
      const newDiscount: Discount = {
        id: Date.now(),
        code: normalizedCode,
        name: form.name.trim(),
        type: form.type,
        value,
        minPurchase,
        minQuantity,
        startDate: form.startDate,
        endDate: form.endDate,
        usageLimit,
        usedCount: 0,
        appliesTo: form.appliesTo,
        status: "Active",
      };

      setDiscounts((previous) => [newDiscount, ...previous]);
    }

    setShowModal(false);
    setForm(emptyForm);
  }

  function toggleStatus(id: number) {
    setDiscounts((previous) =>
      previous.map((discount) =>
        discount.id === id
          ? {
              ...discount,
              status:
                getStatus(discount) === "Inactive" ? "Active" : "Inactive",
            }
          : discount
      )
    );
  }

  function deleteDiscount(id: number) {
    if (!window.confirm("Are you sure you want to delete this discount?")) {
      return;
    }

    setDiscounts((previous) =>
      previous.filter((discount) => discount.id !== id)
    );
  }

  return (
    <div className="discounts-page">
      <div className="discounts-header">
        <div>
          <p className="discounts-eyebrow">REVENUE MANAGEMENT</p>
          <h1>Discounts</h1>
          <p className="discounts-subtitle">
            Create and manage promotional offers and discount codes.
          </p>
        </div>

        <button className="discount-primary-btn" onClick={openAddModal}>
          <Plus size={18} />
          Create Discount
        </button>
      </div>

      <div className="discount-stats">
        <div className="discount-stat-card">
          <div className="discount-stat-icon purple">
            <Tag size={20} />
          </div>
          <div>
            <p>Total Discounts</p>
            <h2>{discounts.length}</h2>
          </div>
        </div>

        <div className="discount-stat-card">
          <div className="discount-stat-icon green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p>Active Discounts</p>
            <h2>{activeCount}</h2>
          </div>
        </div>

        <div className="discount-stat-card">
          <div className="discount-stat-icon orange">
            <Clock size={20} />
          </div>
          <div>
            <p>Scheduled Discounts</p>
            <h2>{scheduledCount}</h2>
          </div>
        </div>

        <div className="discount-stat-card">
          <div className="discount-stat-icon blue">
            <Users size={20} />
          </div>
          <div>
            <p>Total Redemptions</p>
            <h2>{totalUsed.toLocaleString("en-IN")}</h2>
          </div>
        </div>
      </div>

      <section className="discounts-content">
        <div className="discounts-toolbar">
          <div className="discount-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by discount name or code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="discount-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All Discounts</option>
            <option value="Active">Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="discounts-table-heading">
          <div>
            <h3>All Discounts</h3>
            <p>Manage your promotional campaigns</p>
          </div>
          <span>{filteredDiscounts.length} results</span>
        </div>

        <div className="discounts-table-wrap">
          <table className="discounts-table">
            <thead>
              <tr>
                <th>DISCOUNT</th>
                <th>CODE</th>
                <th>VALUE</th>
                <th>APPLIES TO</th>
                <th>VALIDITY</th>
                <th>USAGE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredDiscounts.map((discount) => (
                <tr key={discount.id}>
                  <td>
                    <div className="discount-name-cell">
                      <div className="discount-row-icon">
                        {discount.type === "Percentage" ? (
                          <Percent size={17} />
                        ) : (
                          <IndianRupee size={17} />
                        )}
                      </div>
                      <div>
                        <strong>{discount.name}</strong>
                        <small>
                          Min. purchase: {formatMoney(discount.minPurchase)}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="discount-code">{discount.code}</span>
                  </td>

                  <td>
                    <strong>
                      {discount.type === "Percentage"
                        ? `${discount.value}%`
                        : formatMoney(discount.value)}
                    </strong>
                    <small className="discount-value-type">
                      {discount.type}
                    </small>
                  </td>

                  <td>{discount.appliesTo}</td>

                  <td>
                    <div className="discount-date-cell">
                      <CalendarDays size={15} />
                      <span>
                        {formatDate(discount.startDate)}
                        <small>to {formatDate(discount.endDate)}</small>
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="discount-usage">
                      <strong>
                        {discount.usedCount} / {discount.usageLimit}
                      </strong>
                      <div className="discount-progress">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              (discount.usedCount / discount.usageLimit) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`discount-status ${discount.status.toLowerCase()}`}
                    >
                      {discount.status === "Active" && (
                        <CheckCircle2 size={13} />
                      )}
                      {discount.status === "Scheduled" && (
                        <Clock size={13} />
                      )}
                      {(discount.status === "Expired" ||
                        discount.status === "Inactive") && <Ban size={13} />}
                      {discount.status}
                    </span>
                  </td>

                  <td>
                    <div className="discount-actions">
                      <button
                        title="Edit discount"
                        onClick={() => openEditModal(discount)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title={
                          discount.status === "Inactive"
                            ? "Activate discount"
                            : "Deactivate discount"
                        }
                        onClick={() => toggleStatus(discount.id)}
                      >
                        {discount.status === "Inactive" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Ban size={16} />
                        )}
                      </button>
                      <button
                        title="Delete discount"
                        className="delete"
                        onClick={() => deleteDiscount(discount.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDiscounts.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="discount-empty">
                      <Tag size={28} />
                      <strong>No discounts found</strong>
                      <span>Try another search or create a new discount.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="discount-demo-note">
          Demo mode: discount data is stored in component state and resets
          when the page is refreshed. Connect Supabase for permanent storage.
        </p>
      </section>

      {showModal && (
        <div
          className="discount-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="discount-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discount-modal-title"
          >
            <div className="discount-modal-header">
              <div>
                <p className="discounts-eyebrow">
                  PROMOTIONAL CAMPAIGN
                </p>
                <h2 id="discount-modal-title">
                  {editingId ? "Edit Discount" : "Create Discount"}
                </h2>
              </div>
              <button
                className="discount-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="discount-form-grid">
                <label>
                  Discount Name *
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="e.g. Welcome Offer"
                    required
                  />
                </label>

                <label>
                  Discount Code *
                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        code: event.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. WELCOME20"
                    required
                  />
                </label>

                <label>
                  Discount Type *
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as DiscountType,
                      })
                    }
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </label>

                <label>
                  Discount Value *
                  <input
                    type="number"
                    min="0.01"
                    max={form.type === "Percentage" ? 100 : undefined}
                    step="0.01"
                    value={form.value}
                    onChange={(event) =>
                      setForm({ ...form, value: event.target.value })
                    }
                    placeholder={
                      form.type === "Percentage" ? "e.g. 20" : "e.g. 500"
                    }
                    required
                  />
                </label>

                <label>
                  Minimum Purchase (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minPurchase}
                    onChange={(event) =>
                      setForm({ ...form, minPurchase: event.target.value })
                    }
                  />
                </label>

                <label>
                  Minimum Quantity
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.minQuantity}
                    onChange={(event) =>
                      setForm({ ...form, minQuantity: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  Start Date *
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  End Date *
                  <input
                    type="date"
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={(event) =>
                      setForm({ ...form, endDate: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  Usage Limit *
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.usageLimit}
                    onChange={(event) =>
                      setForm({ ...form, usageLimit: event.target.value })
                    }
                    placeholder="e.g. 100"
                    required
                  />
                </label>

                <label>
                  Applies To *
                  <select
                    value={form.appliesTo}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        appliesTo: event.target.value as AppliesTo,
                      })
                    }
                  >
                    <option value="Both">Products & Subscriptions</option>
                    <option value="Products">Products only</option>
                    <option value="Subscriptions">Subscriptions only</option>
                  </select>
                </label>
              </div>

              {error && <p className="discount-form-error">{error}</p>}

              <div className="discount-modal-actions">
                <button
                  type="button"
                  className="discount-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="discount-primary-btn">
                  {editingId ? "Save Changes" : "Create Discount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

