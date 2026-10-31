
import { useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react";
import "./Invoices.css";
import { useTable } from "./lib/useTable";

type InvoiceStatus = "Draft" | "Confirmed" | "Paid" | "Overdue";

type Invoice = {
  id: string;
  customer: string;
  email: string;
  subscription: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function Invoices() {
  const { rows: invoices, insert, update, remove, error: loadError } =
    useTable<Invoice>("invoices", "created_at");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customer: "",
    email: "",
    subscription: "",
    issueDate: "2026-10-31",
    dueDate: "2026-11-30",
    amount: "",
  });

  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter((invoice) => invoice.status === "Paid");
    const unpaid = invoices.filter(
      (invoice) =>
        invoice.status === "Confirmed" || invoice.status === "Draft"
    );
    const overdue = invoices.filter(
      (invoice) => invoice.status === "Overdue"
    );

    return {
      total,
      paid: paid.length,
      unpaid: unpaid.length,
      overdue: overdue.length,
      paidAmount: paid.reduce((sum, invoice) => sum + invoice.amount, 0),
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const searchMatch = [
        invoice.id,
        invoice.customer,
        invoice.email,
        invoice.subscription,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const statusMatch = filter === "All" || invoice.status === filter;

      return searchMatch && statusMatch;
    });
  }, [invoices, search, filter]);

  const openCreateModal = () => {
    setEditingInvoice(null);
    setForm({
      customer: "",
      email: "",
      subscription: "",
      issueDate: "2026-10-31",
      dueDate: "2026-11-30",
      amount: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setForm({
      customer: invoice.customer,
      email: invoice.email,
      subscription: invoice.subscription,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      amount: String(invoice.amount),
    });
    setError("");
    setShowModal(true);
  };

  const saveInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (
      !form.customer.trim() ||
      !form.email.trim() ||
      !form.subscription.trim() ||
      !form.issueDate ||
      !form.dueDate ||
      !form.amount
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Invoice amount must be greater than zero.");
      return;
    }

    if (form.dueDate < form.issueDate) {
      setError("Due date cannot be before the issue date.");
      return;
    }

    // the INV-YYYY-NNN code is assigned by the database
    const result = editingInvoice
      ? await update(editingInvoice.id, { ...form, amount })
      : await insert({ ...form, amount, status: "Draft" });

    if (result.error) {
      setError(result.error);
      return;
    }

    setShowModal(false);
    setError("");
  };

  const updateStatus = async (id: string, status: InvoiceStatus) => {
    const { error } = await update(id, { status });
    if (error) alert(error);
  };

  const deleteInvoice = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      const { error } = await remove(id);
      if (error) alert(error);
    }
  };

  const statusClass = (status: InvoiceStatus) => {
    switch (status) {
      case "Paid":
        return "invoice-status status-paid";
      case "Confirmed":
        return "invoice-status status-confirmed";
      case "Overdue":
        return "invoice-status status-overdue";
      default:
        return "invoice-status status-draft";
    }
  };

  const downloadInvoice = (invoice: Invoice) => {
    const content = [
      "BRIGHTLOOP SOFTWARE",
      "INVOICE",
      "",
      `Invoice Number: ${invoice.id}`,
      `Customer: ${invoice.customer}`,
      `Email: ${invoice.email}`,
      `Subscription: ${invoice.subscription}`,
      `Issue Date: ${formatDate(invoice.issueDate)}`,
      `Due Date: ${formatDate(invoice.dueDate)}`,
      `Amount: ${formatCurrency(invoice.amount)}`,
      `Status: ${invoice.status}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="invoices-page">
      <div className="invoices-heading">
        <div>
          <span className="invoices-eyebrow">BILLING MANAGEMENT</span>
          <h1>Invoices</h1>
          <p>Create, track and manage customer invoices.</p>
        </div>

        <button className="invoice-primary-btn" onClick={openCreateModal}>
          <Plus size={17} />
          Create Invoice
        </button>
      </div>

      {loadError && <p role="alert" style={{ color: "#b91c1c" }}>{loadError}</p>}

      <div className="invoice-metrics">
        <div className="invoice-metric">
          <div className="invoice-metric-icon purple">
            <FileText size={20} />
          </div>
          <span>Total Invoices</span>
          <strong>{stats.total}</strong>
          <small>All invoice records</small>
        </div>

        <div className="invoice-metric">
          <div className="invoice-metric-icon green">
            <CheckCircle size={20} />
          </div>
          <span>Paid Invoices</span>
          <strong>{stats.paid}</strong>
          <small>{formatCurrency(stats.paidAmount)} collected</small>
        </div>

        <div className="invoice-metric">
          <div className="invoice-metric-icon orange">
            <Clock size={20} />
          </div>
          <span>Unpaid Invoices</span>
          <strong>{stats.unpaid}</strong>
          <small>Draft and confirmed</small>
        </div>

        <div className="invoice-metric">
          <div className="invoice-metric-icon red">
            <AlertCircle size={20} />
          </div>
          <span>Overdue Invoices</span>
          <strong>{stats.overdue}</strong>
          <small>Require attention</small>
        </div>
      </div>

      <section className="invoice-catalogue">
        <div className="invoice-catalogue-heading">
          <div>
            <h2>Invoice List</h2>
            <p>View and manage all customer invoices.</p>
          </div>
          <span className="invoice-count">
            {filteredInvoices.length} Records
          </span>
        </div>

        <div className="invoice-toolbar">
          <div className="invoice-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search invoice, customer or subscription..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="invoice-filter">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>INVOICE</th>
                <th>CUSTOMER</th>
                <th>SUBSCRIPTION</th>
                <th>AMOUNT</th>
                <th>ISSUE DATE</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="invoice-empty">
                    No invoices found. Try another search or create an invoice.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong className="invoice-id">{invoice.id}</strong>
                    </td>

                    <td>
                      <div className="invoice-customer">
                        <div className="invoice-avatar">
                          <FileText size={17} />
                        </div>
                        <div>
                          <strong>{invoice.customer}</strong>
                          <small>{invoice.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>{invoice.subscription}</td>

                    <td className="invoice-price">
                      {formatCurrency(invoice.amount)}
                    </td>

                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>

                    <td>
                      <span className={statusClass(invoice.status)}>
                        {invoice.status}
                      </span>
                    </td>

                    <td>
                      <div className="invoice-actions">
                        <button
                          title="View invoice"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          title="Edit invoice"
                          onClick={() => openEditModal(invoice)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          title="Download invoice details"
                          onClick={() => downloadInvoice(invoice)}
                        >
                          <Download size={15} />
                        </button>

                        <button
                          title="Delete invoice"
                          className="invoice-delete-btn"
                          onClick={() => deleteInvoice(invoice.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </section>

      {showModal && (
        <div
          className="invoice-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="invoice-modal">
            <div className="invoice-modal-heading">
              <div>
                <span>INVOICE MANAGEMENT</span>
                <h2>{editingInvoice ? "Edit Invoice" : "Create Invoice"}</h2>
                <p>Enter the customer and billing information.</p>
              </div>

              <button
                className="invoice-modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveInvoice}>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Customer Name *
                  <input
                    value={form.customer}
                    onChange={(event) =>
                      setForm({ ...form, customer: event.target.value })
                    }
                    placeholder="Enter customer name"
                  />
                </label>

                <label className="invoice-field">
                  Customer Email *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="customer@example.com"
                  />
                </label>

                <label className="invoice-field full">
                  Subscription ID *
                  <input
                    value={form.subscription}
                    onChange={(event) =>
                      setForm({ ...form, subscription: event.target.value })
                    }
                    placeholder="Example: SUB-2026-001"
                  />
                </label>

                <label className="invoice-field">
                  Issue Date *
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(event) =>
                      setForm({ ...form, issueDate: event.target.value })
                    }
                  />
                </label>

                <label className="invoice-field">
                  Due Date *
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm({ ...form, dueDate: event.target.value })
                    }
                  />
                </label>

                <label className="invoice-field full">
                  Invoice Amount (₹) *
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    placeholder="Enter amount"
                  />
                </label>
              </div>

              {error && <p className="invoice-form-error">{error}</p>}

              <div className="invoice-modal-actions">
                <button
                  type="button"
                  className="invoice-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="invoice-primary-btn">
                  {editingInvoice ? "Save Changes" : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div
          className="invoice-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedInvoice(null);
            }
          }}
        >
          <div className="invoice-modal invoice-details-modal">
            <div className="invoice-modal-heading">
              <div>
                <span>INVOICE DETAILS</span>
                <h2>{selectedInvoice.id}</h2>
                <p>Customer billing information.</p>
              </div>

              <button
                className="invoice-modal-close"
                onClick={() => setSelectedInvoice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="invoice-details-grid">
              <div>
                <small>Customer</small>
                <strong>{selectedInvoice.customer}</strong>
              </div>
              <div>
                <small>Email</small>
                <strong>{selectedInvoice.email}</strong>
              </div>
              <div>
                <small>Subscription</small>
                <strong>{selectedInvoice.subscription}</strong>
              </div>
              <div>
                <small>Amount</small>
                <strong>{formatCurrency(selectedInvoice.amount)}</strong>
              </div>
              <div>
                <small>Issue Date</small>
                <strong>{formatDate(selectedInvoice.issueDate)}</strong>
              </div>
              <div>
                <small>Due Date</small>
                <strong>{formatDate(selectedInvoice.dueDate)}</strong>
              </div>
              <div>
                <small>Current Status</small>
                <strong>{selectedInvoice.status}</strong>
              </div>
            </div>

            <div className="invoice-status-controls">
              <span>Update invoice status</span>
              <select
                value={selectedInvoice.status}
                onChange={(event) => {
                  const status = event.target.value as InvoiceStatus;
                  updateStatus(selectedInvoice.id, status);
                  setSelectedInvoice({ ...selectedInvoice, status });
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div className="invoice-modal-actions">
              <button
                className="invoice-cancel-btn"
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>
              <button
                className="invoice-primary-btn"
                onClick={() => downloadInvoice(selectedInvoice)}
              >
                <Download size={15} />
                Download Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices;
