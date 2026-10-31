import { useMemo, useState } from "react";
import {
  Download,
  IndianRupee,
  CreditCard,
  FileText,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";
import "./Reports.css";

type Period = "7 days" | "30 days" | "90 days" | "This year";

const monthlyRevenue = [
  { month: "Jan", revenue: 42000, previous: 35000 },
  { month: "Feb", revenue: 51000, previous: 39000 },
  { month: "Mar", revenue: 47000, previous: 43000 },
  { month: "Apr", revenue: 63000, previous: 48000 },
  { month: "May", revenue: 58000, previous: 52000 },
  { month: "Jun", revenue: 74000, previous: 56000 },
  { month: "Jul", revenue: 68000, previous: 61000 },
  { month: "Aug", revenue: 82000, previous: 65000 },
  { month: "Sep", revenue: 76000, previous: 69000 },
  { month: "Oct", revenue: 91000, previous: 73000 },
  { month: "Nov", revenue: 85000, previous: 78000 },
  { month: "Dec", revenue: 105000, previous: 84000 },
];

const paymentMethods = [
  { name: "UPI", amount: 145000, percentage: 42 },
  { name: "Credit / Debit Card", amount: 103000, percentage: 30 },
  { name: "Bank Transfer", amount: 69000, percentage: 20 },
  { name: "Cash", amount: 28000, percentage: 8 },
];

const transactions = [
  { id: "PAY-1042", customer: "Aarav Technologies", date: "28 Oct 2026", method: "UPI", amount: 4999, status: "Completed" },
  { id: "PAY-1041", customer: "Nova Solutions", date: "27 Oct 2026", method: "Card", amount: 2499, status: "Completed" },
  { id: "PAY-1040", customer: "Pixel Studio", date: "26 Oct 2026", method: "Bank Transfer", amount: 7999, status: "Pending" },
  { id: "PAY-1039", customer: "GreenLeaf Systems", date: "25 Oct 2026", method: "UPI", amount: 1499, status: "Completed" },
  { id: "PAY-1038", customer: "CloudNine Media", date: "24 Oct 2026", method: "Card", amount: 3999, status: "Failed" },
];

const invoiceSummary = [
  { label: "Paid Invoices", count: 186, amount: 285000, status: "paid" },
  { label: "Outstanding", count: 24, amount: 42000, status: "pending" },
  { label: "Overdue", count: 8, amount: 18000, status: "overdue" },
];

const subscriptionGrowth = [
  { month: "Jan", newSubs: 18, cancelled: 4 },
  { month: "Feb", newSubs: 24, cancelled: 5 },
  { month: "Mar", newSubs: 21, cancelled: 3 },
  { month: "Apr", newSubs: 30, cancelled: 6 },
  { month: "May", newSubs: 27, cancelled: 4 },
  { month: "Jun", newSubs: 36, cancelled: 7 },
];

function money(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>("30 days");

  const metrics = useMemo(() => {
    const multiplier =
      period === "7 days" ? 0.25 :
      period === "30 days" ? 1 :
      period === "90 days" ? 2.8 : 9.5;

    return {
      revenue: Math.round(348000 * multiplier),
      collected: Math.round(285000 * multiplier),
      outstanding: Math.round(42000 * multiplier),
      overdue: Math.round(18000 * multiplier),
      activeSubscriptions: 248,
      collectionRate: 91.2,
    };
  }, [period]);

  const maxRevenue = Math.max(
    ...monthlyRevenue.map((item) => item.revenue)
  );

  const maxGrowth = Math.max(
    ...subscriptionGrowth.map((item) => item.newSubs)
  );

  function exportCSV() {
    const rows = [
      ["Payment ID", "Customer", "Date", "Method", "Amount", "Status"],
      ...transactions.map((item) => [
        item.id,
        item.customer,
        item.date,
        item.method,
        String(item.amount),
        item.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "brightloop-reports.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <p className="reports-eyebrow">BUSINESS INTELLIGENCE</p>
          <h1>Reports & Analytics</h1>
          <p className="reports-subtitle">
            Track revenue, subscriptions, invoices, and payment performance.
          </p>
        </div>

        <button className="reports-export-btn" onClick={exportCSV}>
          <Download size={17} />
          Export CSV
        </button>
      </header>

      <div className="reports-filter-row">
        <div className="reports-period-label">
          <CalendarDays size={17} />
          Reporting period
        </div>

        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value as Period)}
          className="reports-period-select"
        >
          <option value="7 days">Last 7 days</option>
          <option value="30 days">Last 30 days</option>
          <option value="90 days">Last 90 days</option>
          <option value="This year">This year</option>
        </select>
      </div>

      <section className="reports-kpi-grid">
        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Total Revenue</span>
            <span className="reports-kpi-icon purple"><IndianRupee size={19} /></span>
          </div>
          <h2>{money(metrics.revenue)}</h2>
          <p className="reports-positive"><ArrowUpRight size={15} /> 12.8% <span>vs previous period</span></p>
        </article>

        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Collected Payments</span>
            <span className="reports-kpi-icon green"><Wallet size={19} /></span>
          </div>
          <h2>{money(metrics.collected)}</h2>
          <p className="reports-positive"><ArrowUpRight size={15} /> 8.4% <span>vs previous period</span></p>
        </article>

        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Outstanding Amount</span>
            <span className="reports-kpi-icon orange"><CreditCard size={19} /></span>
          </div>
          <h2>{money(metrics.outstanding)}</h2>
          <p className="reports-neutral">Awaiting payment</p>
        </article>

        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Overdue Amount</span>
            <span className="reports-kpi-icon red"><FileText size={19} /></span>
          </div>
          <h2>{money(metrics.overdue)}</h2>
          <p className="reports-negative"><ArrowDownRight size={15} /> 3.2% <span>overdue invoices</span></p>
        </article>
      </section>

      <section className="reports-main-grid">
        <article className="reports-panel reports-revenue-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Revenue Overview</h3>
              <p>Monthly revenue performance</p>
            </div>
            <span className="reports-chart-legend">
              <i className="legend-current" /> Current year
              <i className="legend-previous" /> Previous year
            </span>
          </div>

          <div className="reports-bar-chart">
            {monthlyRevenue.map((item) => (
              <div className="reports-bar-group" key={item.month}>
                <div className="reports-bars">
                  <div
                    className="reports-bar previous"
                    style={{ height: `${(item.previous / maxRevenue) * 100}%` }}
                    title={`Previous: ${money(item.previous)}`}
                  />
                  <div
                    className="reports-bar current"
                    style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                    title={`Current: ${money(item.revenue)}`}
                  />
                </div>
                <span>{item.month}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Payment Methods</h3>
              <p>Collection by payment type</p>
            </div>
          </div>

          <div className="reports-payment-list">
            {paymentMethods.map((method) => (
              <div className="reports-payment-item" key={method.name}>
                <div className="reports-payment-info">
                  <strong>{method.name}</strong>
                  <span>{money(method.amount)} · {method.percentage}%</span>
                </div>
                <div className="reports-progress-track">
                  <span style={{ width: `${method.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="reports-bottom-grid">
        <article className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Subscription Growth</h3>
              <p>New subscriptions and cancellations</p>
            </div>
          </div>

          <div className="reports-growth-list">
            {subscriptionGrowth.map((item) => (
              <div className="reports-growth-row" key={item.month}>
                <span className="reports-growth-month">{item.month}</span>
                <div className="reports-growth-bars">
                  <span
                    className="reports-growth-new"
                    style={{ width: `${(item.newSubs / maxGrowth) * 100}%` }}
                  />
                  <span
                    className="reports-growth-cancelled"
                    style={{ width: `${(item.cancelled / maxGrowth) * 100}%` }}
                  />
                </div>
                <strong>{item.newSubs}</strong>
                <small>-{item.cancelled}</small>
              </div>
            ))}
          </div>

          <div className="reports-growth-legend">
            <span><i className="legend-current" /> New subscriptions</span>
            <span><i className="legend-previous" /> Cancelled</span>
          </div>
        </article>

        <article className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Invoice Summary</h3>
              <p>Current invoice status</p>
            </div>
          </div>

          <div className="reports-invoice-list">
            {invoiceSummary.map((invoice) => (
              <div className="reports-invoice-item" key={invoice.label}>
                <div>
                  <span className={`reports-invoice-dot ${invoice.status}`} />
                  <strong>{invoice.label}</strong>
                  <small>{invoice.count} invoices</small>
                </div>
                <b>{money(invoice.amount)}</b>
              </div>
            ))}
          </div>

          <div className="reports-collection-rate">
            <div>
              <span>Payment collection rate</span>
              <strong>{metrics.collectionRate}%</strong>
            </div>
            <div className="reports-progress-track">
              <span style={{ width: `${metrics.collectionRate}%` }} />
            </div>
          </div>
        </article>
      </section>

      <section className="reports-panel reports-transactions-panel">
        <div className="reports-panel-heading">
          <div>
            <h3>Recent Transactions</h3>
            <p>Latest payment activity</p>
          </div>
          <button className="reports-text-btn" onClick={exportCSV}>
            <Download size={15} /> Download
          </button>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>PAYMENT ID</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>METHOD</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td><strong>{transaction.id}</strong></td>
                  <td>{transaction.customer}</td>
                  <td>{transaction.date}</td>
                  <td>{transaction.method}</td>
                  <td><strong>{money(transaction.amount)}</strong></td>
                  <td>
                    <span className={`reports-transaction-status ${transaction.status.toLowerCase()}`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="reports-demo-note">
        Demo mode: these reports use sample data. Connect Supabase to display
        real-time figures from your subscriptions, invoices, and payments.
      </p>
    </div>
  );
}

