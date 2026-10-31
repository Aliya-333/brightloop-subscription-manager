
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./auth/AuthProvider";
import { errorMessage } from "./lib/useTable";
import type React from "react";

import {
  Building2,
  User,
  Bell,
  ShieldCheck,
  Palette,
  Save,
  Lock,
  Mail,
  Globe,
  Check,
  FileText as FileTextIcon,
  CreditCard as CreditCardIcon,
  RefreshCw as RefreshIcon,
} from "lucide-react";

import "./Settings.css";

type SettingsTab =
  | "General"
  | "Profile"
  | "Preferences"
  | "Notifications"
  | "Security";

function Settings() {
  const { profile: me, isAdmin, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [saved, setSaved] = useState(false);

  const [general, setGeneral] = useState({
    workspace: "Brightloop",
    company: "Brightloop Software",
    email: "admin@brightloop.com",
    timezone: "Asia/Kolkata",
  });

  const [profile, setProfile] = useState({
    name: me?.name ?? "",
    email: me?.email ?? "",
    phone: "",
    role: me?.role ?? "",
  });

  const [preferences, setPreferences] = useState({
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    language: "English",
    theme: "Light",
  });

  const [notifications, setNotifications] = useState({
    invoices: true,
    payments: true,
    subscriptions: true,
    discounts: false,
    reports: false,
  });

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactor: false,
  });

  useEffect(() => {
    (async () => {
      const [ws, own] = await Promise.all([
        supabase.from("workspace_settings").select("general,preferences,notifications").maybeSingle(),
        me ? supabase.from("profiles").select("phone").eq("id", me.id).maybeSingle() : null,
      ]);
      if (ws.data) {
        setGeneral((g) => ({ ...g, ...ws.data.general }));
        setPreferences((p) => ({ ...p, ...ws.data.preferences }));
        setNotifications((n) => ({ ...n, ...ws.data.notifications }));
      }
      if (own?.data) setProfile((p) => ({ ...p, phone: own.data.phone ?? "" }));
    })();
  }, [me]);

  const tabs = [
    { name: "General" as const, icon: Building2 },
    { name: "Profile" as const, icon: User },
    { name: "Preferences" as const, icon: Palette },
    { name: "Notifications" as const, icon: Bell },
    { name: "Security" as const, icon: ShieldCheck },
  ];

  const fail = (message: string) => {
    setSaving(false);
    alert(message);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    if (activeTab === "Security") {
      if (!security.newPassword) return fail("Enter a new password.");
      if (security.newPassword !== security.confirmPassword)
        return fail("New password and confirm password do not match.");
      if (security.newPassword.length < 10)
        return fail("New password must contain at least 10 characters.");
      if (!security.currentPassword)
        return fail("Enter your current password first.");

      // re-authenticate with the current password before allowing a change
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: me?.email ?? "",
        password: security.currentPassword,
      });
      if (authError) return fail("Current password is incorrect.");

      const { error } = await supabase.auth.updateUser({
        password: security.newPassword,
      });
      if (error) return fail(error.message);
      setSecurity({ ...security, currentPassword: "", newPassword: "", confirmPassword: "" });
    } else if (activeTab === "Profile") {
      const { error } = await supabase
        .from("profiles")
        .update({ name: profile.name.trim(), phone: profile.phone.trim() })
        .eq("id", me?.id ?? "");
      if (error) return fail(errorMessage(error));
      await refreshProfile();
    } else {
      if (!isAdmin) return fail("Only administrators can change workspace settings.");
      const { data, error } = await supabase
        .from("workspace_settings")
        .update({ general, preferences, notifications })
        .eq("id", true)
        .select();
      if (error) return fail(errorMessage(error));
      if (!data?.length) return fail("You don't have permission to do that.");
    }

    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const updateNotification = (
    key: keyof typeof notifications
  ) => {
    setNotifications((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
    setSaved(false);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <span className="settings-eyebrow">WORKSPACE</span>
          <h1>Settings</h1>
          <p>
            Manage your workspace, preferences and account settings.
          </p>
        </div>
      </div>

      <div className="settings-layout">
        {/* SETTINGS SIDEBAR */}
        <aside className="settings-sidebar">
          <h3>SETTINGS MENU</h3>

          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                type="button"
                key={tab.name}
                className={`settings-tab ${
                  activeTab === tab.name ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab(tab.name);
                  setSaved(false);
                }}
              >
                <Icon size={18} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </aside>

        {/* SETTINGS FORM */}
        <form className="settings-card" onSubmit={handleSave}>
          {/* GENERAL SETTINGS */}
          {activeTab === "General" && (
            <>
              <div className="settings-section-heading">
                <div className="settings-heading-icon">
                  <Building2 size={21} />
                </div>
                <div>
                  <h2>General Settings</h2>
                  <p>Manage your workspace information.</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <label>
                  Workspace Name
                  <input
                    value={general.workspace}
                    onChange={(e) =>
                      setGeneral({
                        ...general,
                        workspace: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Company Name
                  <input
                    value={general.company}
                    onChange={(e) =>
                      setGeneral({
                        ...general,
                        company: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Contact Email
                  <input
                    type="email"
                    value={general.email}
                    onChange={(e) =>
                      setGeneral({
                        ...general,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Timezone
                  <select
                    value={general.timezone}
                    onChange={(e) =>
                      setGeneral({
                        ...general,
                        timezone: e.target.value,
                      })
                    }
                  >
                    <option value="Asia/Kolkata">
                      India Standard Time (IST)
                    </option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">London</option>
                    <option value="America/New_York">New York</option>
                    <option value="Asia/Dubai">Dubai</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {/* PROFILE SETTINGS */}
          {activeTab === "Profile" && (
            <>
              <div className="settings-section-heading">
                <div className="settings-heading-icon">
                  <User size={21} />
                </div>
                <div>
                  <h2>Profile Settings</h2>
                  <p>Manage your personal account information.</p>
                </div>
              </div>

              <div className="settings-profile-preview">
                <div className="settings-profile-avatar">
                  {profile.name.charAt(0).toUpperCase() || "A"}
                </div>

                <div>
                  <strong>{profile.name || "Admin User"}</strong>
                  <span>{profile.role}</span>
                </div>
              </div>

              <div className="settings-form-grid">
                <label>
                  Full Name
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Email Address
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    readOnly
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        phone: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Role
                  <input value={profile.role} disabled />
                </label>
              </div>
            </>
          )}

          {/* PREFERENCES */}
          {activeTab === "Preferences" && (
            <>
              <div className="settings-section-heading">
                <div className="settings-heading-icon">
                  <Palette size={21} />
                </div>
                <div>
                  <h2>Preferences</h2>
                  <p>Customize how Brightloop works for you.</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <label>
                  Currency
                  <select
                    value={preferences.currency}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        currency: e.target.value,
                      })
                    }
                  >
                    <option value="INR">Indian Rupee (₹ INR)</option>
                    <option value="USD">US Dollar ($ USD)</option>
                    <option value="EUR">Euro (€ EUR)</option>
                    <option value="GBP">British Pound (£ GBP)</option>
                    <option value="AED">UAE Dirham (AED)</option>
                  </select>
                </label>

                <label>
                  Date Format
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        dateFormat: e.target.value,
                      })
                    }
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </label>

                <label>
                  Language
                  <select
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        language: e.target.value,
                      })
                    }
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Malayalam</option>
                  </select>
                </label>

                <label>
                  Appearance
                  <select
                    value={preferences.theme}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        theme: e.target.value,
                      })
                    }
                  >
                    <option>Light</option>
                    <option>Dark</option>
                    <option>System Default</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {/* NOTIFICATION SETTINGS */}
          {activeTab === "Notifications" && (
            <>
              <div className="settings-section-heading">
                <div className="settings-heading-icon">
                  <Bell size={21} />
                </div>
                <div>
                  <h2>Notification Settings</h2>
                  <p>Choose which email notifications you receive.</p>
                </div>
              </div>

              <div className="notification-list">
                {[
                  {
                    key: "invoices" as const,
                    title: "Invoice Notifications",
                    description:
                      "Receive alerts when invoices are created or overdue.",
                    icon: FileTextIcon,
                  },
                  {
                    key: "payments" as const,
                    title: "Payment Notifications",
                    description:
                      "Get notified when payments are received or fail.",
                    icon: CreditCardIcon,
                  },
                  {
                    key: "subscriptions" as const,
                    title: "Subscription Updates",
                    description:
                      "Receive subscription renewal and cancellation alerts.",
                    icon: RefreshIcon,
                  },
                  {
                    key: "discounts" as const,
                    title: "Discount Notifications",
                    description:
                      "Get alerts about discount usage and expiry.",
                    icon: Mail,
                  },
                  {
                    key: "reports" as const,
                    title: "Report Notifications",
                    description:
                      "Receive periodic financial report updates.",
                    icon: Globe,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="notification-row" key={item.key}>
                      <div className="notification-icon">
                        <Icon size={19} />
                      </div>

                      <div className="notification-info">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifications[item.key]}
                        className={`toggle-switch ${
                          notifications[item.key] ? "enabled" : ""
                        }`}
                        onClick={() =>
                          updateNotification(item.key)
                        }
                      >
                        <span />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* SECURITY SETTINGS */}
          {activeTab === "Security" && (
            <>
              <div className="settings-section-heading">
                <div className="settings-heading-icon">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h2>Security Settings</h2>
                  <p>Manage your password and account protection.</p>
                </div>
              </div>

              <div className="security-notice">
                <Lock size={20} />
                <div>
                  <strong>Password Security</strong>
                  <p>
                    Use a strong password with at least 8 characters.
                    Actual password changes require authentication
                    integration.
                  </p>
                </div>
              </div>

              <div className="settings-form-grid single-column">
                <label>
                  Current Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={security.currentPassword}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="Enter current password"
                  />
                </label>

                <label>
                  New Password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={security.newPassword}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Enter new password"
                  />
                </label>

                <label>
                  Confirm New Password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={security.confirmPassword}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm new password"
                  />
                </label>
              </div>

              <div className="security-option">
                <div className="notification-icon">
                  <ShieldCheck size={20} />
                </div>

                <div className="notification-info">
                  <strong>Two-Factor Authentication</strong>
                  <span>
                    Add an additional layer of account security.
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={security.twoFactor}
                  disabled
                  title="Two-factor authentication is not available yet"
                  className={`toggle-switch ${
                    security.twoFactor ? "enabled" : ""
                  }`}
                  onClick={() =>
                    setSecurity({
                      ...security,
                      twoFactor: !security.twoFactor,
                    })
                  }
                >
                  <span />
                </button>
              </div>
            </>
          )}

          {/* SAVE BUTTON */}
          <div className="settings-footer">
            <span className="settings-save-message">
              {saved && (
                <>
                  <Check size={16} />
                  Changes saved
                </>
              )}
            </span>

            <button type="submit" className="settings-save-button" disabled={saving}>
              <Save size={17} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;

