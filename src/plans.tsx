
import { useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Layers,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import "./Plans.css";

type BillingCycle = "Daily" | "Weekly" | "Monthly" | "Yearly";

type Plan = {
  id: number;
  name: string;
  description: string;
  price: number;
  cycle: BillingCycle;
  minQuantity: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  allowPause: boolean;
  earlyClosure: boolean;
  active: boolean;
};

const initialPlans: Plan[] = [
  {
    id: 1,
    name: "Starter Monthly",
    description: "Essential tools for individuals and small teams.",
    price: 499,
    cycle: "Monthly",
    minQuantity: 1,
    startDate: "2026-01-01",
    endDate: "",
    autoRenew: true,
    allowPause: true,
    earlyClosure: true,
    active: true,
  },
  {
    id: 2,
    name: "Professional Yearly",
    description: "Advanced features for growing businesses.",
    price: 4999,
    cycle: "Yearly",
    minQuantity: 1,
    startDate: "2026-01-01",
    endDate: "",
    autoRenew: true,
    allowPause: false,
    earlyClosure: true,
    active: true,
  },
  {
    id: 3,
    name: "Cloud Weekly",
    description: "Flexible weekly cloud storage subscription.",
    price: 199,
    cycle: "Weekly",
    minQuantity: 2,
    startDate: "2026-02-01",
    endDate: "2027-02-01",
    autoRenew: false,
    allowPause: true,
    earlyClosure: false,
    active: false,
  },
];

const emptyPlan: Omit<Plan, "id"> = {
  name: "",
  description: "",
  price: 0,
  cycle: "Monthly",
  minQuantity: 1,
  startDate: "",
  endDate: "",
  autoRenew: true,
  allowPause: false,
  earlyClosure: false,
  active: true,
};

function Plans() {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Plan, "id">>(emptyPlan);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        plan.name.toLowerCase().includes(search.toLowerCase()) ||
        plan.cycle.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" ||
        (filter === "Active" && plan.active) ||
        (filter === "Inactive" && !plan.active);

      return matchesSearch && matchesFilter;
    });
  }, [plans, search, filter]);

  const activeCount = plans.filter((plan) => plan.active).length;
  const totalValue = plans.reduce((sum, plan) => sum + plan.price, 0);

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyPlan });
    setShowForm(true);
  }

  function openEditForm(plan: Plan) {
    setEditingId(plan.id);
    const { id, ...planDetails } = plan;
    setForm({ ...planDetails });
    setShowForm(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter a plan name.");
      return;
    }

    if (form.price <= 0 || form.minQuantity < 1) {
      alert("Enter a valid price and minimum quantity.");
      return;
    }

    if (
      form.endDate &&
      form.startDate &&
      form.endDate < form.startDate
    ) {
      alert("End date cannot be earlier than start date.");
      return;
    }

    if (editingId !== null) {
      setPlans((current) =>
        current.map((plan) =>
          plan.id === editingId ? { ...form, id: editingId } : plan
        )
      );
    } else {
      setPlans((current) => [
        ...current,
        { ...form, id: Date.now() },
      ]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyPlan });
  }

  function deletePlan(id: number) {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      setPlans((current) => current.filter((plan) => plan.id !== id));
    }
  }

  function toggleStatus(id: number) {
    setPlans((current) =>
      current.map((plan) =>
        plan.id === id ? { ...plan, active: !plan.active } : plan
      )
    );
  }

  return (
    <div className="plans-page">
      <section className="plans-heading">
        <div>
          <div className="plans-eyebrow">BRIGHTLOOP WORKSPACE</div>
          <h1>Subscription Plans</h1>
          <p>Create and manage the billing plans offered to your customers.</p>
        </div>

        <button className="plans-primary-btn" onClick={openAddForm}>
          <Plus size={18} />
          Create Plan
        </button>
      </section>

      <section className="plans-stats">
        <article className="plans-stat-card">
          <div className="plans-stat-icon purple">
            <Layers size={20} />
          </div>
          <div>
            <span>Total Plans</span>
            <h2>{plans.length}</h2>
          </div>
        </article>

        <article className="plans-stat-card">
          <div className="plans-stat-icon green">
            <RefreshCw size={20} />
          </div>
          <div>
            <span>Active Plans</span>
            <h2>{activeCount}</h2>
          </div>
        </article>

        <article className="plans-stat-card">
          <div className="plans-stat-icon blue">
            <CalendarDays size={20} />
          </div>
          <div>
            <span>Combined Plan Prices</span>
            <h2>₹{totalValue.toLocaleString("en-IN")}</h2>
          </div>
        </article>
      </section>

      <section className="plans-table-panel">
        <div className="plans-toolbar">
          <div>
            <h3>All Plans</h3>
            <p>Manage your subscription pricing and settings.</p>
          </div>

          <div className="plans-controls">
            <div className="plans-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search plans..."
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter plans"
            >
              <option value="All">All Plans</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="plans-table-scroll">
          <table className="plans-table">
            <thead>
              <tr>
                <th>PLAN NAME</th>
                <th>PRICE</th>
                <th>BILLING CYCLE</th>
                <th>MIN. QTY</th>
                <th>AVAILABILITY</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <div className="plan-name-cell">
                      <strong>{plan.name}</strong>
                      <span>{plan.description || "No description"}</span>
                    </div>
                  </td>
                  <td className="plan-price">
                    ₹{plan.price.toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className="billing-cycle">{plan.cycle}</span>
                  </td>
                  <td>{plan.minQuantity}</td>
                  <td>
                    <div className="plan-date">
                      {plan.startDate || "Not set"}
                      <span>
                        {plan.endDate ? `Until ${plan.endDate}` : "No end date"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      className={`plan-status ${plan.active ? "active" : "inactive"}`}
                      onClick={() => toggleStatus(plan.id)}
                      title="Click to change status"
                    >
                      {plan.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <div className="plan-actions">
                      <button
                        onClick={() => openEditForm(plan)}
                        aria-label={`Edit ${plan.name}`}
                        title="Edit plan"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        aria-label={`Delete ${plan.name}`}
                        title="Delete plan"
                        className="delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredPlans.length === 0 && (
                <tr>
                  <td colSpan={7} className="plans-empty">
                    No plans found. Try another search or create a plan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div
          className="plans-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <section className="plans-modal">
            <div className="plans-modal-header">
              <div>
                <h2>{editingId !== null ? "Edit Plan" : "Create New Plan"}</h2>
                <p>Enter the pricing and subscription rules.</p>
              </div>
              <button
                className="plans-close"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="plans-form-grid">
                <label className="plans-field full">
                  Plan Name *
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="e.g. Premium Monthly"
                  />
                </label>

                <label className="plans-field full">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    placeholder="Describe what this plan includes..."
                    rows={2}
                  />
                </label>

                <label className="plans-field">
                  Price (₹) *
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price || ""}
                    onChange={(event) =>
                      setForm({ ...form, price: Number(event.target.value) })
                    }
                    placeholder="499"
                  />
                </label>

                <label className="plans-field">
                  Billing Cycle *
                  <select
                    value={form.cycle}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        cycle: event.target.value as BillingCycle,
                      })
                    }
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Yearly</option>
                  </select>
                </label>

                <label className="plans-field">
                  Minimum Quantity *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.minQuantity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        minQuantity: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="plans-field">
                  Start Date *
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                  />
                </label>

                <label className="plans-field">
                  End Date
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm({ ...form, endDate: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="plans-options">
                <h3>Subscription Settings</h3>

                <label>
                  <input
                    type="checkbox"
                    checked={form.autoRenew}
                    onChange={(event) =>
                      setForm({ ...form, autoRenew: event.target.checked })
                    }
                  />
                  <span>
                    <strong>Automatic Renewal</strong>
                    <small>Allow subscriptions to renew automatically.</small>
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={form.allowPause}
                    onChange={(event) =>
                      setForm({ ...form, allowPause: event.target.checked })
                    }
                  />
                  <span>
                    <strong>Allow Pause</strong>
                    <small>Allow customers or staff to pause subscriptions.</small>
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={form.earlyClosure}
                    onChange={(event) =>
                      setForm({ ...form, earlyClosure: event.target.checked })
                    }
                  />
                  <span>
                    <strong>Allow Early Closure</strong>
                    <small>Allow subscriptions to close before expiry.</small>
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm({ ...form, active: event.target.checked })
                    }
                  />
                  <span>
                    <strong>Plan Active</strong>
                    <small>Make this plan available for new subscriptions.</small>
                  </span>
                </label>
              </div>

              <div className="plans-form-actions">
                <button
                  type="button"
                  className="plans-cancel-btn"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="plans-primary-btn">
                  {editingId !== null ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Plans;
