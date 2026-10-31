
import { useMemo, useState, type FormEvent } from "react";
import {
  Search,
  Plus,
  CreditCard,
  IndianRupee,
  CheckCircle,
  Clock,
  X,
  Eye,
  Trash2,
} from "lucide-react";
import "./Payments.css";
import { useTable } from "./lib/useTable";

type Payment = {
  id: number;
  paymentId: string;
  customer: string;
  invoice: string;
  method: string;
  amount: number;
  date: string;
  status: "Completed" | "Pending" | "Failed";
  note: string;
};

function Payments() {
  const { rows: payments, insert, remove, error: loadError } =
    useTable<Payment>("payments", "created_at");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [form, setForm] = useState({
    customer: "",
    invoice: "",
    method: "UPI",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    status: "Completed" as Payment["status"],
    note: "",
  });

  const completedTotal = payments
    .filter((payment) => payment.status === "Completed")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingTotal = payments
    .filter((payment) => payment.status === "Pending")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const completedCount = payments.filter(
    (payment) => payment.status === "Completed"
  ).length;

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch = [
        payment.paymentId,
        payment.customer,
        payment.invoice,
        payment.method,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || payment.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [payments, search, filter]);

  const openModal = () => {
    setForm({
      customer: "",
      invoice: "",
      method: "UPI",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      status: "Completed",
      note: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.customer.trim() || !form.invoice.trim() || amount <= 0) {
      alert("Please enter valid payment details.");
      return;
    }

    // the PAY-YYYY-NNN code is assigned by the database
    const { error } = await insert({
      customer: form.customer.trim(),
      invoice: form.invoice.trim(),
      method: form.method,
      amount,
      date: form.date,
      status: form.status,
      note: form.note.trim(),
    });

    if (error) {
      alert(error);
      return;
    }

    setShowModal(false);
  };

  const deletePayment = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      const { error } = await remove(id);
      if (error) alert(error);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <span className="payments-eyebrow">FINANCE MANAGEMENT</span>
          <h1>Payments</h1>
          <p>Track, manage and review all customer payments.</p>
        </div>

        <button className="payment-primary-btn" onClick={openModal}>
          <Plus size={18} />
          Record Payment
        </button>
      </div>

      {loadError && <p role="alert" style={{ color: "#b91c1c" }}>{loadError}</p>}

      <div className="payment-stats">
        <div className="payment-stat-card">
          <div className="payment-stat-icon purple">
            <IndianRupee size={21} />
          </div>
          <div>
            <span>Total Collected</span>
            <h2>{formatCurrency(completedTotal)}</h2>
            <small>Successfully received</small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon green">
            <CheckCircle size={21} />
          </div>
          <div>
            <span>Completed Payments</span>
            <h2>{completedCount}</h2>
            <small>Successful transactions</small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon orange">
            <Clock size={21} />
          </div>
          <div>
            <span>Pending Amount</span>
            <h2>{formatCurrency(pendingTotal)}</h2>
            <small>Awaiting confirmation</small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon blue">
            <CreditCard size={21} />
          </div>
          <div>
            <span>Total Transactions</span>
            <h2>{payments.length}</h2>
            <small>All recorded payments</small>
          </div>
        </div>
      </div>

      <div className="payments-content">
        <div className="payments-toolbar">
          <div className="payment-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search payments, customers or invoices..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="payment-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All Payments</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div className="payments-table-heading">
          <div>
            <h3>Payment History</h3>
            <p>View and manage your recorded transactions.</p>
          </div>
          <span>{filteredPayments.length} payments</span>
        </div>

        <div className="payments-table-wrap">
          <table className="payments-table">
            <thead>
              <tr>
                <th>PAYMENT ID</th>
                <th>CUSTOMER</th>
                <th>INVOICE</th>
                <th>METHOD</th>
                <th>DATE</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong className="payment-id">
                      {payment.paymentId}
                    </strong>
                  </td>
                  <td>
                    <strong>{payment.customer}</strong>
                  </td>
                  <td>
                    <span className="payment-invoice">
                      {payment.invoice}
                    </span>
                  </td>
                  <td>{payment.method}</td>
                  <td>
                    {new Date(
                      `${payment.date}T00:00:00`
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <strong>{formatCurrency(payment.amount)}</strong>
                  </td>
                  <td>
                    <span
                      className={`payment-status ${payment.status.toLowerCase()}`}
                    >
                      <span />
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <div className="payment-actions">
                      <button
                        title="View payment"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        title="Delete payment"
                        onClick={() => deletePayment(payment.id)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="payment-empty">
                      <CreditCard size={30} />
                      <strong>No payments found</strong>
                      <span>Try changing your search or filter.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {showModal && (
        <div
          className="payment-modal-backdrop"
          onClick={() => setShowModal(false)}
        >
          <div
            className="payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <div>
                <h2>Record Payment</h2>
                <p>Add a new customer payment transaction.</p>
              </div>
              <button
                className="payment-close-btn"
                onClick={() => setShowModal(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="payment-form-grid">
                <label>
                  Customer Name *
                  <input
                    required
                    value={form.customer}
                    onChange={(event) =>
                      setForm({ ...form, customer: event.target.value })
                    }
                    placeholder="Enter customer name"
                  />
                </label>

                <label>
                  Invoice Number *
                  <input
                    required
                    value={form.invoice}
                    onChange={(event) =>
                      setForm({ ...form, invoice: event.target.value })
                    }
                    placeholder="e.g. INV-2026-005"
                  />
                </label>

                <label>
                  Payment Amount (₹) *
                  <input
                    required
                    min="1"
                    type="number"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    placeholder="Enter amount"
                  />
                </label>

                <label>
                  Payment Method
                  <select
                    value={form.method}
                    onChange={(event) =>
                      setForm({ ...form, method: event.target.value })
                    }
                  >
                    <option>UPI</option>
                    <option>Credit Card</option>
                    <option>Debit Card</option>
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Payment Date *
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm({ ...form, date: event.target.value })
                    }
                  />
                </label>

                <label>
                  Payment Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as Payment["status"],
                      })
                    }
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </label>

                <label className="payment-full-width">
                  Notes
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                    placeholder="Add a payment note..."
                  />
                </label>
              </div>

              <div className="payment-modal-actions">
                <button
                  type="button"
                  className="payment-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="payment-primary-btn">
                  <Plus size={17} />
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div
          className="payment-modal-backdrop"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="payment-modal payment-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <div>
                <h2>Payment Details</h2>
                <p>{selectedPayment.paymentId}</p>
              </div>
              <button
                className="payment-close-btn"
                onClick={() => setSelectedPayment(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="payment-detail-list">
              <div>
                <span>Customer</span>
                <strong>{selectedPayment.customer}</strong>
              </div>
              <div>
                <span>Invoice</span>
                <strong>{selectedPayment.invoice}</strong>
              </div>
              <div>
                <span>Payment Method</span>
                <strong>{selectedPayment.method}</strong>
              </div>
              <div>
                <span>Payment Date</span>
                <strong>{selectedPayment.date}</strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>{formatCurrency(selectedPayment.amount)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedPayment.status}</strong>
              </div>
              <div>
                <span>Notes</span>
                <strong>{selectedPayment.note || "No notes added"}</strong>
              </div>
            </div>

            <div className="payment-modal-actions">
              <button
                className="payment-cancel-btn"
                onClick={() => setSelectedPayment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
