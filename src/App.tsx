
import { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import Login from "./auth/Login";
import { supabase } from "./lib/supabase";

import Products from "./Products";
import Plans from "./Plans";
import Subscriptions from "./Subscriptions";
import Invoices from "./Invoices";
import Payments from "./Payments";
import Customers from "./Customers";
import Discounts from "./Discounts";
import Reports from "./Reports";
import SettingsPage from "./Settings";
import Team from "./Team";
import HelpSupport from "./HelpSupport";

import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  Repeat,
  FileText,
  BadgePercent,
  CreditCard,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Search,
  Bell,
  Plus,
  Wallet,
  Menu,
  HelpCircle,
  UsersRound,
  CheckCircle2,
  RefreshCw,
  Tag,
  Clock,
  LogOut,
} from "lucide-react";

import "./App.css";
import "./auth/Login.css";

const navigation = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Products", page: "Products", icon: Package },
  { label: "Plans", page: "Plans", icon: Layers },
  { label: "Subscriptions", page: "Subscriptions", icon: Repeat },
  { label: "Invoices", page: "Invoices", icon: FileText },
  { label: "Payments", page: "Payments", icon: CreditCard },
  { label: "Customers", page: "Customers", icon: Users },
  { label: "Discounts", page: "Discounts", icon: BadgePercent },
  { label: "Reports", page: "Reports", icon: ChartNoAxesCombined },
];

const stats = [
  {
    label: "Active Subscriptions",
    value: "248",
    change: "+12%",
    icon: Repeat,
    color: "purple",
    trend: [25, 35, 30, 48, 42, 65, 80],
  },
  {
    label: "Total Revenue",
    value: "₹4,85,320",
    change: "+18%",
    icon: Wallet,
    color: "green",
    trend: [30, 45, 35, 60, 52, 75, 90],
  },
  {
    label: "Payments Received",
    value: "₹4,12,840",
    change: "+16%",
    icon: CreditCard,
    color: "blue",
    trend: [20, 35, 30, 50, 45, 70, 85],
  },
  {
    label: "Overdue Invoices",
    value: "32",
    change: "+5%",
    icon: Clock,
    color: "orange",
    trend: [30, 25, 45, 35, 50, 42, 65],
  },
];

const activities = [
  {
    title: "New subscription #SUB-1048 created",
    time: "2 min ago",
    icon: FileText,
    color: "purple",
  },
  {
    title: "Invoice #INV-2032 paid ₹1,999",
    time: "5 min ago",
    icon: CheckCircle2,
    color: "green",
  },
  {
    title: "Subscription renewed #SUB-1047",
    time: "12 min ago",
    icon: RefreshCw,
    color: "blue",
  },
  {
    title: "Discount applied Flat ₹500 off",
    time: "18 min ago",
    icon: Tag,
    color: "orange",
  },
];

function Shell() {
  const { profile, signOut } = useAuth();
  const displayName = profile?.name || profile?.email || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const [activePage, setActivePage] = useState("Dashboard");
  const [live, setLive] = useState<string[] | null>(null);

  // Live dashboard figures (RLS limits this to signed-in active members)
  useEffect(() => {
    if (activePage !== "Dashboard") return;
    let cancelled = false;
    (async () => {
      const [subs, inv, pay] = await Promise.all([
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "Active"),
        supabase.from("invoices").select("amount,status"),
        supabase.from("payments").select("amount,status").eq("status", "Completed"),
      ]);
      if (cancelled) return;
      const money = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
      const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((a, r) => a + Number(r.amount), 0);
      const invoices = (inv.data ?? []) as { amount: number; status: string }[];
      setLive([
        String(subs.count ?? 0),
        money(sum(invoices.filter((r) => r.status === "Paid"))),
        money(sum(pay.data as { amount: number }[] | null)),
        String(invoices.filter((r) => r.status === "Overdue").length),
      ]);
    })();
    return () => { cancelled = true; };
  }, [activePage]);

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol">∞</div>
          <div className="brand-name">Brightloop</div>
        </div>

        <div className="nav-section-title">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`nav-item ${
                  activePage === item.page ? "active" : ""
                }`}
                onClick={() => setActivePage(item.page)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => setActivePage("Settings")}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Team" ? "active" : ""
            }`}
            onClick={() => setActivePage("Team")}
          >
            <UsersRound size={18} />
            <span>Team</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Help & Support" ? "active" : ""
            }`}
            onClick={() => setActivePage("Help & Support")}
          >
            <HelpCircle size={18} />
            <span>Help & Support</span>
          </button>

          <div className="profile-card">
            <div className="profile-avatar">{initial}</div>
            <div className="profile-info">
              <strong>{displayName}</strong>
              <span>{profile?.role}</span>
            </div>
            <button className="icon-button" aria-label="Sign out" title="Sign out"
              onClick={() => void signOut()}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu">
            <Menu size={21} />
          </button>

          <div className="search-box">
            <Search size={17} />
            <input placeholder="Search anything..." />
          </div>

          <div className="topbar-right">
            <div className="event-brand">
              <strong>odoo</strong>
              <span>
                Odoo x Make-A-Ton 9.0
                <small>Kochi 2026</small>
              </span>
            </div>

            <button className="icon-button" aria-label="Notifications">
              <Bell size={20} />
              <i className="notification-dot" />
            </button>

            <div className="top-avatar">{initial}</div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        {activePage === "Dashboard" ? (
          <div className="dashboard-content">
            {/* WELCOME SECTION */}
            <section className="welcome-section">
              <div>
                <div className="welcome-label">
                  SATURDAY, OCTOBER 31, 2026
                </div>
                <h1>Welcome back, {displayName.split(" ")[0]}!</h1>
                <p>
                  Here's what's happening with your subscriptions today.
                </p>
              </div>

              <button className="create-button">
                <Plus size={18} />
                Create Subscription
              </button>
            </section>

            {/* STATISTICS */}
            <section className="stats-grid">
              {stats.map((stat, statIndex) => {
                const Icon = stat.icon;

                return (
                  <article
                    className={`stat-card ${stat.color}`}
                    key={stat.label}
                  >
                    <div className="stat-heading">
                      <div>
                        <span>{stat.label}</span>
                        <h2>{live ? live[statIndex] : "…"}</h2>

                      </div>

                      <div className="stat-icon">
                        <Icon size={21} />
                      </div>
                    </div>

                    <div className="mini-chart">
                      {stat.trend.map((height, index) => (
                        <div
                          key={index}
                          className="mini-chart-bar"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>

            {/* DASHBOARD PANELS */}
            <section className="dashboard-grid">
              {/* REVENUE OVERVIEW */}
              <article className="panel revenue-panel">
                <div className="panel-header">
                  <div>
                    <h3>Revenue Overview</h3>
                    <p>Monthly revenue performance</p>
                  </div>

                  <select defaultValue="month">
                    <option value="month">This Month</option>
                    <option value="week">This Week</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                <div className="revenue-total">₹4,85,320</div>
                <div className="revenue-growth">
                  ↑ 18% compared to last month
                </div>

                <div className="chart">
                  <div className="chart-grid">
                    <span>5L</span>
                    <span>4L</span>
                    <span>3L</span>
                    <span>2L</span>
                    <span>1L</span>
                    <span>0</span>
                  </div>

                  <svg
                    className="revenue-svg"
                    viewBox="0 0 600 220"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Illustrative revenue trend chart"
                  >
                    <defs>
                      <linearGradient
                        id="areaFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#9db9ff"
                          stopOpacity=".38"
                        />
                        <stop
                          offset="100%"
                          stopColor="#9db9ff"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {[25, 65, 105, 145, 185].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="600"
                        y2={y}
                        stroke="rgba(255,255,255,.15)"
                        strokeDasharray="4 5"
                      />
                    ))}

                    <path
                      d="M0 170 L90 168 L155 135 L220 143 L290 110 L350 120 L420 90 L490 75 L550 50 L600 25 L600 220 L0 220 Z"
                      fill="url(#areaFill)"
                    />

                    <path
                      d="M0 170 L90 168 L155 135 L220 143 L290 110 L350 120 L420 90 L490 75 L550 50 L600 25"
                      fill="none"
                      stroke="#b9ccff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {[
                      [0, 170],
                      [155, 135],
                      [220, 143],
                      [290, 110],
                      [350, 120],
                      [420, 90],
                      [490, 75],
                      [550, 50],
                      [600, 25],
                    ].map(([x, y], index) => (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#fff"
                        stroke="#6c8cff"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>

                  <div className="chart-months">
                    <span>1 Oct</span>
                    <span>7 Oct</span>
                    <span>14 Oct</span>
                    <span>21 Oct</span>
                    <span>31 Oct</span>
                  </div>
                </div>

                <p className="sample-note">
                  Illustrative figures — live financial data will be
                  connected later.
                </p>
              </article>

              {/* SUBSCRIPTION STATUS */}
              <article className="panel subscription-panel">
                <div className="panel-header">
                  <div>
                    <h3>Subscription Status</h3>
                    <p>Overview of all subscriptions</p>
                  </div>
                </div>

                <div className="donut-area">
                  <div className="donut-chart">
                    <div className="donut-center">
                      <strong>248</strong>
                      <span>Total</span>
                    </div>
                  </div>
                </div>

                <div className="status-list">
                  <div>
                    <span>
                      <i className="status-dot active-dot" /> Active
                    </span>
                    <strong>72%</strong>
                  </div>

                  <div>
                    <span>
                      <i className="status-dot paused-dot" /> Paused
                    </span>
                    <strong>12%</strong>
                  </div>

                  <div>
                    <span>
                      <i className="status-dot cancelled-dot" /> Cancelled
                    </span>
                    <strong>8%</strong>
                  </div>

                  <div>
                    <span>
                      <i className="status-dot expired-dot" /> Expired
                    </span>
                    <strong>8%</strong>
                  </div>
                </div>
              </article>

              {/* RECENT ACTIVITY */}
              <article className="panel activity-panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Activity</h3>
                    <p>Latest updates</p>
                  </div>

                  <button className="view-all">View All →</button>
                </div>

                <div className="activity-list">
                  {activities.map((activity) => {
                    const Icon = activity.icon;

                    return (
                      <div
                        className="activity-item"
                        key={activity.title}
                      >
                        <div
                          className={`activity-icon ${activity.color}`}
                        >
                          <Icon size={17} />
                        </div>

                        <div className="activity-info">
                          <strong>{activity.title}</strong>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <footer className="dashboard-footer">
              Brightloop Subscription Manager
              <span>•</span> Odoo x Make-A-Ton 9.0 Kochi 2026
            </footer>
          </div>
        ) : activePage === "Products" ? (
          <Products />
        ) : activePage === "Plans" ? (
          <Plans />
        ) : activePage === "Subscriptions" ? (
          <Subscriptions />
        ) : activePage === "Invoices" ? (
          <Invoices />
        ) : activePage === "Payments" ? (
          <Payments />
        ) : activePage === "Customers" ? (
          <Customers />
        ) : activePage === "Discounts" ? (
          <Discounts />
        ) : activePage === "Reports" ? (
          <Reports />
        ) : activePage === "Settings" ? (
          <SettingsPage />
        ) : activePage === "Team" ? (
          <Team />
        ) : activePage === "Help & Support" ? (
          <HelpSupport />
        ) : (
          /* OTHER PAGES */
          <div className="dashboard-content">
            <section className="welcome-section">
              <div>
                <div className="welcome-label">
                  BRIGHTLOOP WORKSPACE
                </div>
                <h1>{activePage}</h1>
                <p>
                  Manage your {activePage.toLowerCase()} here.
                </p>
              </div>
            </section>

            <section className="panel">
              <h3>{activePage} Management</h3>
              <p>
                This page is ready for its module integration.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) return <div className="login-wrap">Loading…</div>;
  if (!session) return <Login />;

  // Signed in but not (yet) authorised: new accounts start Inactive until an admin approves them.
  if (!profile || profile.status !== "Active") {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Access pending</h1>
          <p>
            Your account ({session.user.email}) is not active yet. Ask a Brightloop
            administrator to activate it.
          </p>
          <button className="login-link" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>
    );
  }
  return <Shell />;
}

export default App;

