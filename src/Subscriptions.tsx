
import { useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Repeat,
  Users,
  CheckCircle2,
  Clock3,
  Ban,
  CalendarDays,
  Pause,
  Play,
  Eye,
} from "lucide-react";
import "./Subscriptions.css";

type SubscriptionStatus = "Active" | "Pending" | "Paused" | "Closed";

type Subscription = {
  id: string;
  customer: string;
  email: string;
  plan: string;
  amount: number;
  cycle: string;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  status: SubscriptionStatus;
};

const initialSubscriptions: Subscription[] = [
  {
    id: "SUB-2026-001",
    customer: "Aarav Technologies",
    email: "aarav@example.com",
    plan: "Professional",
    amount: 4999,
    cycle: "Yearly",
    startDate: "2026-01-15",
    endDate: "2027-01-14",
    paymentTerms: "Due immediately",
    status: "Active",
  },
  {
    id: "SUB-2026-002",
    customer: "Nova Solutions",
    email: "nova@example.com",
    plan: "Starter",
    amount: 499,
    cycle: "Monthly",
    startDate: "2026-03-01",
    endDate: "2026-11-01",
    paymentTerms: "Net 15",
    status: "Active",
  },
  {
    id: "SUB-2026-003",
    customer: "PixelCraft Studio",
    email: "pixel@example.com",
    plan: "Cloud Weekly",
    amount: 199,
    cycle: "Weekly",
    startDate: "2026-10-20",
    endDate: "2026-11-20",
    paymentTerms: "Due immediately",
    status: "Pending",
  },
  {
    id: "SUB-2026-004",
    customer: "Vertex Systems",
    email: "vertex@example.com",
    plan: "Professional",
    amount: 4999,
    cycle: "Yearly",
    startDate: "2026-02-10",
    endDate: "2027-02-09",
    paymentTerms: "Net 30",
    status: "Paused",
  },
  {
    id: "SUB-2026-005",
    customer: "Bluewave Digital",
    email: "bluewave@example.com",
    plan: "Starter",
    amount: 499,
    cycle: "Monthly",
    startDate: "2025-08-01",
    endDate: "2026-08-01",
    paymentTerms: "Net 15",
    status: "Closed",
  },
];

const emptyForm = {
  customer: "",
  email: "",
  plan: "Starter",
  amount: "499",
  cycle: "Monthly",
  startDate: "",
  endDate: "",
  paymentTerms: "Due immediately",
  status: "Pending" as SubscriptionStatus,
};

function formatDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => {
      const matchesSearch = [
        subscription.id,
        subscription.customer,
        subscription.email,
        subscription.plan,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || subscription.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [subscriptions, search, filter]);

  const activeCount = subscriptions.filter((s) => s.status === "Active").length;
  const pendingCount = subscriptions.filter((s) => s.status === "Pending").length;
  const closedCount = subscriptions.filter(
    (s) => s.status === "Closed"
  ).length;

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      startDate: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (subscription: Subscription) => {
    setEditingId(subscription.id);
    setForm({
      customer: subscription.customer,
      email: subscription.email,
      plan: subscription.plan,
      amount: String(subscription.amount),
      cycle: subscription.cycle,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      paymentTerms: subscription.paymentTerms,
      status: subscription.status,
    });
    setError("");
    setShowModal(true);
  };

  const updateField = (
    field: keyof typeof emptyForm,
    value: string
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const saveSubscription = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.customer.trim() || !form.email.trim()) {
      setError("Please enter the customer name and email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Please select both subscription dates.");
      return;
    }

    if (form.endDate <= form.startDate) {
      setError("End date must be after the start date.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid subscription amount.");
      return;
    }

    const subscriptionData = {
      customer: form.customer.trim(),
      email: form.email.trim(),
      plan: form.plan,
      amount,
      cycle: form.cycle,
      startDate: form.startDate,
      endDate: form.endDate,
      paymentTerms: form.paymentTerms,
      status: form.status,
    };

    if (editingId) {
      setSubscriptions((previous) =>
        previous.map((subscription) =>
          subscription.id === editingId
            ? { ...subscription, ...subscriptionData }
            : subscription
        )
      );
    } else {
      const nextNumber =
        subscriptions.length + 1;

      const newSubscription: Subscription = {
        id: `SUB-2026-${String(nextNumber).padStart(3, "0")}`,
        ...subscriptionData,
      };

      setSubscriptions((previous) => [newSubscription, ...previous]);
    }

    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const changeStatus = (
    id: string,
    status: SubscriptionStatus
  ) => {
    setSubscriptions((previous) =>
      previous.map((subscription) =>
        subscription.id === id
          ? { ...subscription, status }
          : subscription
      )
    );
  };

  const deleteSubscription = (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subscription?"
    );

    if (confirmed) {
      setSubscriptions((previous) =>
        previous.filter((subscription) => subscription.id !== id)
      );
    }
  };

  const viewingSubscription = subscriptions.find(
    (subscription) => subscription.id === viewingId
  );

  return (
    <div className="subscriptions-page">
      <div className="subscriptions-heading">
        <div>
          <span className="subscriptions-eyebrow">RECURRING REVENUE</span>
          <h1>Subscriptions</h1>
          <p>Manage customer subscriptions and recurring plans.</p>
        </div>

        <button
          className="subscription-primary-btn"
          onClick={openCreateModal}
        >
          <Plus size={17} />
          Create Subscription
        </button>
      </div>

      <div className="subscription-metrics">
        <div className="subscription-metric">
          <div className="subscription-metric-icon purple">
            <Repeat size={19} />
          </div>
          <span>Total Subscriptions</span>
          <strong>{subscriptions.length}</strong>
          <small>All subscription records</small>
        </div>

        <div className="subscription-metric">
          <div className="subscription-metric-icon green">
            <CheckCircle2 size={19} />
          </div>
          <span>Active Subscriptions</span>
          <strong>{activeCount}</strong>
          <small>Currently running</small>
        </div>

        <div className="subscription-metric">
          <div className="subscription-metric-icon orange">
            <Clock3 size={19} />
          </div>
          <span>Pending Subscriptions</span>
          <strong>{pendingCount}</strong>
          <small>Awaiting activation</small>
        </div>

        <div className="subscription-metric">
          <div className="subscription-metric-icon blue">
            <Ban size={19} />
          </div>
          <span>Closed Subscriptions</span>
          <strong>{closedCount}</strong>
          <small>Ended subscriptions</small>
        </div>
      </div>

      <div className="subscription-catalogue">
        <div className="subscription-catalogue-heading">
          <div>
            <h2>Subscription List</h2>
            <p>View and manage all customer subscriptions.</p>
          </div>
          <span className="subscription-count">
            {filteredSubscriptions.length} Records
          </span>
        </div>

        <div className="subscription-toolbar">
          <div className="subscription-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search customer, plan or ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="subscription-filter">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter subscriptions by status"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Paused">Paused</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="subscription-table-wrap">
          <table className="subscription-table">
            <thead>
              <tr>
                <th>SUBSCRIPTION</th>
                <th>CUSTOMER</th>
                <th>PLAN</th>
                <th>AMOUNT</th>
                <th>BILLING</th>
                <th>START DATE</th>
                <th>END DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredSubscriptions.length > 0 ? (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>
                      <strong className="subscription-id">
                        {subscription.id}
                      </strong>
                    </td>

                    <td>
                      <div className="subscription-customer">
                        <div className="subscription-avatar">
                          <Users size={16} />
                        </div>
                        <div>
                          <strong>{subscription.customer}</strong>
                          <small>{subscription.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>{subscription.plan}</td>

                    <td className="subscription-price">
                      {formatCurrency(subscription.amount)}
                    </td>

                    <td>{subscription.cycle}</td>
                    <td>{formatDate(subscription.startDate)}</td>
                    <td>{formatDate(subscription.endDate)}</td>

                    <td>
                      <span
                        className={`subscription-status status-${subscription.status.toLowerCase()}`}
                      >
                        {subscription.status}
                      </span>
                    </td>

                    <td>
                      <div className="subscription-actions">
                        <button
                          title="View subscription"
                          onClick={() => setViewingId(subscription.id)}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          title="Edit subscription"
                          onClick={() => openEditModal(subscription)}
                        >
                          <Pencil size={15} />
                        </button>

                        {subscription.status === "Active" && (
                          <button
                            title="Pause subscription"
                            onClick={() =>
                              changeStatus(subscription.id, "Paused")
                            }
                          >
                            <Pause size={15} />
                          </button>
                        )}

                        {subscription.status === "Paused" && (
                          <button
                            title="Resume subscription"
                            onClick={() =>
                              changeStatus(subscription.id, "Active")
                            }
                          >
                            <Play size={15} />
                          </button>
                        )}

                        {subscription.status !== "Closed" && (
                          <button
                            title="Close subscription"
                            onClick={() =>
                              changeStatus(subscription.id, "Closed")
                            }
                          >
                            <Ban size={15} />
                          </button>
                        )}

                        <button
                          className="subscription-delete-btn"
                          title="Delete subscription"
                          onClick={() => deleteSubscription(subscription.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="subscription-empty">
                    No subscriptions found. Try another search or create a
                    subscription.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="subscriptions-demo-note">
          <CalendarDays size={14} />
          Demo data is stored locally and resets when the page is refreshed.
        </div>
      </div>

      {showModal && (
        <div
          className="subscription-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="subscription-modal">
            <div className="subscription-modal-heading">
              <div>
                <span>SUBSCRIPTION MANAGEMENT</span>
                <h2>
                  {editingId ? "Edit Subscription" : "Create Subscription"}
                </h2>
                <p>
                  Enter the customer and subscription details below.
                </p>
              </div>

              <button
                className="subscription-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveSubscription}>
              <div className="subscription-form-grid">
                <label className="subscription-field">
                  Customer Name *
                  <input
                    value={form.customer}
                    onChange={(event) =>
                      updateField("customer", event.target.value)
                    }
                    placeholder="Enter customer name"
                    required
                  />
                </label>

                <label className="subscription-field">
                  Customer Email *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="customer@example.com"
                    required
                  />
                </label>

                <label className="subscription-field">
                  Subscription Plan
                  <select
                    value={form.plan}
                    onChange={(event) => {
                      const plan = event.target.value;
                      const amounts: Record<string, string> = {
                        Starter: "499",
                        Professional: "4999",
                        "Cloud Weekly": "199",
                      };
                      const cycles: Record<string, string> = {
                        Starter: "Monthly",
                        Professional: "Yearly",
                        "Cloud Weekly": "Weekly",
                      };
                      setForm((previous) => ({
                        ...previous,
                        plan,
                        amount: amounts[plan],
                        cycle: cycles[plan],
                      }));
                    }}
                  >
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Cloud Weekly">Cloud Weekly</option>
                  </select>
                </label>

                <label className="subscription-field">
                  Subscription Amount (₹) *
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      updateField("amount", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="subscription-field">
                  Billing Cycle
                  <select
                    value={form.cycle}
                    onChange={(event) =>
                      updateField("cycle", event.target.value)
                    }
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Yearly</option>
                  </select>
                </label>

                <label className="subscription-field">
                  Payment Terms
                  <select
                    value={form.paymentTerms}
                    onChange={(event) =>
                      updateField("paymentTerms", event.target.value)
                    }
                  >
                    <option>Due immediately</option>
                    <option>Net 7</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                  </select>
                </label>

                <label className="subscription-field">
                  Start Date *
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      updateField("startDate", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="subscription-field">
                  End Date *
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      updateField("endDate", event.target.value)
                    }
                    min={form.startDate || undefined}
                    required
                  />
                </label>

                <label className="subscription-field full">
                  Initial Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value as SubscriptionStatus
                      )
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Closed">Closed</option>
                  </select>
                </label>
              </div>

              {error && (
                <div className="subscription-form-error">{error}</div>
              )}

              <div className="subscription-modal-actions">
                <button
                  type="button"
                  className="subscription-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="subscription-primary-btn"
                >
                  {editingId ? "Save Changes" : "Create Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingSubscription && (
        <div
          className="subscription-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewingId(null);
            }
          }}
        >
          <div className="subscription-modal subscription-details-modal">
            <div className="subscription-modal-heading">
              <div>
                <span>SUBSCRIPTION DETAILS</span>
                <h2>{viewingSubscription.id}</h2>
                <p>Full subscription information.</p>
              </div>

              <button
                className="subscription-modal-close"
                onClick={() => setViewingId(null)}
                aria-label="Close details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="subscription-details-grid">
              <div>
                <small>Customer</small>
                <strong>{viewingSubscription.customer}</strong>
              </div>
              <div>
                <small>Email</small>
                <strong>{viewingSubscription.email}</strong>
              </div>
              <div>
                <small>Plan</small>
                <strong>{viewingSubscription.plan}</strong>
              </div>
              <div>
                <small>Amount</small>
                <strong>{formatCurrency(viewingSubscription.amount)}</strong>
              </div>
              <div>
                <small>Billing Cycle</small>
                <strong>{viewingSubscription.cycle}</strong>
              </div>
              <div>
                <small>Payment Terms</small>
                <strong>{viewingSubscription.paymentTerms}</strong>
              </div>
              <div>
                <small>Start Date</small>
                <strong>{formatDate(viewingSubscription.startDate)}</strong>
              </div>
              <div>
                <small>End Date</small>
                <strong>{formatDate(viewingSubscription.endDate)}</strong>
              </div>
              <div>
                <small>Status</small>
                <strong>{viewingSubscription.status}</strong>
              </div>
            </div>

            <div className="subscription-modal-actions">
              <button
                className="subscription-cancel-btn"
                onClick={() => setViewingId(null)}
              >
                Close
              </button>
              <button
                className="subscription-primary-btn"
                onClick={() => {
                  setViewingId(null);
                  openEditModal(viewingSubscription);
                }}
              >
                <Pencil size={15} />
                Edit Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscriptions;
