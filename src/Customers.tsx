
import { useMemo, useState, type FormEvent } from "react";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  X,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import "./Customers.css";
import { useTable } from "./lib/useTable";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  joined: string;
  status: "Active" | "Inactive";
};

type CustomerForm = Omit<Customer, "id">;

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  joined: new Date().toISOString().slice(0, 10),
  status: "Active",
};

function Customers() {
  const { rows: customers, insert, update, remove, error: loadError } =
    useTable<Customer>("customers");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const activeCount = customers.filter(
    (customer) => customer.status === "Active"
  ).length;

  const inactiveCount = customers.filter(
    (customer) => customer.status === "Inactive"
  ).length;

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const searchText = [
        customer.name,
        customer.email,
        customer.company,
        customer.phone,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || customer.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [customers, search, filter]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm({
      ...emptyForm,
      joined: new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      joined: customer.joined,
      status: customer.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const emailExists = customers.some(
      (customer) =>
        customer.email.toLowerCase() === form.email.trim().toLowerCase() &&
        customer.id !== editingCustomer?.id
    );

    if (emailExists) {
      alert("A customer with this email already exists.");
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
    };
    const result = editingCustomer
      ? await update(editingCustomer.id, payload)
      : await insert(payload);

    if (result.error) {
      alert(result.error);
      return;
    }

    setShowModal(false);
    setEditingCustomer(null);
  };

  const deleteCustomer = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      const { error } = await remove(id);
      if (error) {
        alert(error);
        return;
      }

      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    }
  };

  const toggleStatus = async (customer: Customer) => {
    const newStatus =
      customer.status === "Active" ? "Inactive" : "Active";

    const { error } = await update(customer.id, { status: newStatus });
    if (error) {
      alert(error);
      return;
    }

    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer({ ...customer, status: newStatus });
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="Customers-page">
      {loadError && <p role="alert" style={{ color: "#b91c1c" }}>{loadError}</p>}
      {/* Header */}
      <div className="Customers-header">
        <div>
          <span className="Customers-eyebrow">
            CUSTOMER MANAGEMENT
          </span>
          <h1>Customers</h1>
          <p>Manage your customers and their account information.</p>
        </div>

        <button
          className="Customer-primary-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {/* Statistics */}
      <div className="Customer-stats">
        <div className="Customer-stat-card">
          <div className="Customer-stat-icon purple">
            <Users size={21} />
          </div>
          <div>
            <span>Total Customers</span>
            <h2>{customers.length}</h2>
            <small>All registered customers</small>
          </div>
        </div>

        <div className="Customer-stat-card">
          <div className="Customer-stat-icon green">
            <UserCheck size={21} />
          </div>
          <div>
            <span>Active Customers</span>
            <h2>{activeCount}</h2>
            <small>Currently active accounts</small>
          </div>
        </div>

        <div className="Customer-stat-card">
          <div className="Customer-stat-icon orange">
            <UserX size={21} />
          </div>
          <div>
            <span>Inactive Customers</span>
            <h2>{inactiveCount}</h2>
            <small>Currently inactive accounts</small>
          </div>
        </div>
      </div>

      {/* Customer list */}
      <div className="Customers-content">
        <div className="Customers-toolbar">
          <div className="Customer-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search customers, email or company..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="Customer-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All Customers</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="Customers-table-heading">
          <div>
            <h3>Customer Directory</h3>
            <p>View and manage your customer accounts.</p>
          </div>
          <span>{filteredCustomers.length} customers</span>
        </div>

        <div className="Customers-table-wrap">
          <table className="Customers-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>COMPANY</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>JOINED DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="Customer-name-cell">
                      <div className="Customer-avatar">
                        {getInitials(customer.name)}
                      </div>
                      <strong>{customer.name}</strong>
                    </div>
                  </td>

                  <td>{customer.company || "—"}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone || "—"}</td>

                  <td>
                    {new Date(
                      `${customer.joined}T00:00:00`
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td>
                    <span
                      className={`Customer-status ${customer.status.toLowerCase()}`}
                    >
                      <span />
                      {customer.status}
                    </span>
                  </td>

                  <td>
                    <div className="Customer-actions">
                      <button
                        title="View customer"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        title="Edit customer"
                        onClick={() => openEditModal(customer)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        title="Delete customer"
                        onClick={() => deleteCustomer(customer.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="Customer-empty">
                      <Users size={30} />
                      <strong>No customers found</strong>
                      <span>Try changing your search or filter.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="Customer-modal-backdrop"
          onClick={() => setShowModal(false)}
        >
          <div
            className="Customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="Customer-modal-header">
              <div>
                <h2>
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h2>
                <p>
                  {editingCustomer
                    ? "Update customer information."
                    : "Enter the details of your new customer."}
                </p>
              </div>

              <button
                className="Customer-close-btn"
                type="button"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="Customer-form-grid">
                <label>
                  Customer Name *
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Enter full name"
                  />
                </label>

                <label>
                  Email Address *
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="example@email.com"
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="+91 98765 43210"
                  />
                </label>

                <label>
                  Company
                  <input
                    value={form.company}
                    onChange={(event) =>
                      setForm({ ...form, company: event.target.value })
                    }
                    placeholder="Enter company name"
                  />
                </label>

                <label className="Customer-full-width">
                  Address
                  <input
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                    placeholder="City, State"
                  />
                </label>

                <label>
                  Joined Date
                  <input
                    type="date"
                    value={form.joined}
                    onChange={(event) =>
                      setForm({ ...form, joined: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  Account Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as Customer["status"],
                      })
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="Customer-modal-actions">
                <button
                  type="button"
                  className="Customer-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="Customer-primary-btn"
                >
                  {editingCustomer ? "Save Changes" : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div
          className="Customer-modal-backdrop"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="Customer-modal Customer-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="Customer-modal-header">
              <div>
                <h2>Customer Details</h2>
                <p>Customer account information.</p>
              </div>

              <button
                className="Customer-close-btn"
                onClick={() => setSelectedCustomer(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="Customer-profile">
              <div className="Customer-profile-avatar">
                {getInitials(selectedCustomer.name)}
              </div>
              <h3>{selectedCustomer.name}</h3>
              <p>{selectedCustomer.company || "Individual Customer"}</p>
              <span
                className={`Customer-status ${selectedCustomer.status.toLowerCase()}`}
              >
                <span />
                {selectedCustomer.status}
              </span>
            </div>

            <div className="Customer-detail-list">
              <div>
                <Mail size={17} />
                <span>Email</span>
                <strong>{selectedCustomer.email}</strong>
              </div>

              <div>
                <Phone size={17} />
                <span>Phone</span>
                <strong>{selectedCustomer.phone || "Not provided"}</strong>
              </div>

              <div>
                <MapPin size={17} />
                <span>Address</span>
                <strong>{selectedCustomer.address || "Not provided"}</strong>
              </div>

              <div>
                <Users size={17} />
                <span>Joined</span>
                <strong>{selectedCustomer.joined}</strong>
              </div>
            </div>

            <div className="Customer-modal-actions">
              <button
                className="Customer-cancel-btn"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>

              <button
                className="Customer-primary-btn"
                onClick={() => {
                  const customer = selectedCustomer;
                  setSelectedCustomer(null);
                  openEditModal(customer);
                }}
              >
                <Pencil size={16} />
                Edit Customer
              </button>

              <button
                className="Customer-toggle-btn"
                onClick={() => toggleStatus(selectedCustomer)}
              >
                {selectedCustomer.status === "Active"
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
