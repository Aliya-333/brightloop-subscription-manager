
import { useMemo, useState, type FormEvent } from "react";
import {
  UsersRound,
  UserPlus,
  Search,
  ShieldCheck,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  UserCheck,
  UserX,
} from "lucide-react";
import "./Team.css";

type TeamRole = "Admin" | "Staff" | "Viewer";
type TeamStatus = "Active" | "Inactive";

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
  joined: string;
};

const initialMembers: TeamMember[] = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@brightloop.com",
    role: "Admin",
    status: "Active",
    joined: "01 Oct 2026",
  },
  {
    id: 2,
    name: "Alex Johnson",
    email: "alex@brightloop.com",
    role: "Staff",
    status: "Active",
    joined: "05 Oct 2026",
  },
  {
    id: 3,
    name: "Sarah Williams",
    email: "sarah@brightloop.com",
    role: "Staff",
    status: "Active",
    joined: "10 Oct 2026",
  },
  {
    id: 4,
    name: "David Miller",
    email: "david@brightloop.com",
    role: "Viewer",
    status: "Inactive",
    joined: "15 Oct 2026",
  },
];

const emptyForm = {
  name: "",
  email: "",
  role: "Staff" as TeamRole,
};

function Team() {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [menuId, setMenuId] = useState<number | null>(null);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchMatch =
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase());

      const roleMatch =
        roleFilter === "All" || member.role === roleFilter;

      const statusMatch =
        statusFilter === "All" || member.status === statusFilter;

      return searchMatch && roleMatch && statusMatch;
    });
  }, [members, search, roleFilter, statusFilter]);

  const activeCount = members.filter(
    (member) => member.status === "Active"
  ).length;

  const inactiveCount = members.filter(
    (member) => member.status === "Inactive"
  ).length;

  const adminCount = members.filter(
    (member) => member.role === "Admin"
  ).length;

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      role: member.role,
    });
    setModalOpen(true);
    setMenuId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = form.email.trim().toLowerCase();

    const emailExists = members.some(
      (member) =>
        member.email.toLowerCase() === normalizedEmail &&
        member.id !== editingId
    );

    if (emailExists) {
      alert("A team member with this email already exists.");
      return;
    }

    if (editingId !== null) {
      setMembers((previous) =>
        previous.map((member) =>
          member.id === editingId
            ? {
                ...member,
                name: form.name.trim(),
                email: normalizedEmail,
                role: member.id === 1 ? "Admin" : form.role,
              }
            : member
        )
      );
    } else {
      const newMember: TeamMember = {
        id: Date.now(),
        name: form.name.trim(),
        email: normalizedEmail,
        role: form.role,
        status: "Active",
        joined: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };

      setMembers((previous) => [...previous, newMember]);
    }

    setModalOpen(false);
    setForm(emptyForm);
  };

  const toggleStatus = (id: number) => {
    if (id === 1) {
      alert("The primary administrator cannot be deactivated.");
      return;
    }

    setMembers((previous) =>
      previous.map((member) =>
        member.id === id
          ? {
              ...member,
              status:
                member.status === "Active" ? "Inactive" : "Active",
            }
          : member
      )
    );

    setMenuId(null);
  };

  const deleteMember = (id: number) => {
    if (id === 1) {
      alert("The primary administrator cannot be removed.");
      return;
    }

    const member = members.find((item) => item.id === id);
    if (!member) return;

    if (
      window.confirm(`Are you sure you want to remove ${member.name}?`)
    ) {
      setMembers((previous) =>
        previous.filter((item) => item.id !== id)
      );
    }

    setMenuId(null);
  };

  return (
    <div className="team-page">
      <div className="team-header">
        <div>
          <span className="team-eyebrow">WORKSPACE MANAGEMENT</span>
          <h1>Team Members</h1>
          <p>Manage your team, roles and access permissions.</p>
        </div>

        <button className="team-primary-btn" onClick={openAddModal}>
          <UserPlus size={17} />
          Add Team Member
        </button>
      </div>

      <section className="team-stats">
        <article className="team-stat-card">
          <div className="team-stat-icon purple">
            <UsersRound size={21} />
          </div>
          <div>
            <span>Total Members</span>
            <h2>{members.length}</h2>
          </div>
        </article>

        <article className="team-stat-card">
          <div className="team-stat-icon green">
            <UserCheck size={21} />
          </div>
          <div>
            <span>Active Members</span>
            <h2>{activeCount}</h2>
          </div>
        </article>

        <article className="team-stat-card">
          <div className="team-stat-icon orange">
            <UserX size={21} />
          </div>
          <div>
            <span>Inactive Members</span>
            <h2>{inactiveCount}</h2>
          </div>
        </article>

        <article className="team-stat-card">
          <div className="team-stat-icon blue">
            <ShieldCheck size={21} />
          </div>
          <div>
            <span>Administrators</span>
            <h2>{adminCount}</h2>
          </div>
        </article>
      </section>

      <section className="team-content">
        <div className="team-content-heading">
          <div>
            <h2>All Team Members</h2>
            <p>View and manage your workspace members.</p>
          </div>
          <span className="team-member-count">
            {filteredMembers.length} members
          </span>
        </div>

        <div className="team-toolbar">
          <div className="team-search">
            <Search size={17} />
            <input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="Viewer">Viewer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>TEAM MEMBER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>JOINED DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="team-member-cell">
                      <div className="team-avatar">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{member.name}</strong>
                        <span>
                          <Mail size={12} />
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={`team-role ${member.role.toLowerCase()}`}>
                      {member.role === "Admin" && (
                        <ShieldCheck size={13} />
                      )}
                      {member.role}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`team-status ${member.status.toLowerCase()}`}
                    >
                      <i />
                      {member.status}
                    </span>
                  </td>

                  <td className="team-date">{member.joined}</td>

                  <td>
                    <div className="team-action-wrap">
                      <button
                        className="team-action-btn"
                        aria-label={`Actions for ${member.name}`}
                        onClick={() =>
                          setMenuId(
                            menuId === member.id ? null : member.id
                          )
                        }
                      >
                        <MoreHorizontal size={19} />
                      </button>

                      {menuId === member.id && (
                        <div className="team-action-menu">
                          <button onClick={() => openEditModal(member)}>
                            <Pencil size={14} />
                            Edit Member
                          </button>

                          <button onClick={() => toggleStatus(member.id)}>
                            {member.status === "Active" ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                            {member.status === "Active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            className="delete"
                            onClick={() => deleteMember(member.id)}
                          >
                            <Trash2 size={14} />
                            Remove Member
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="team-empty">
                      <UsersRound size={30} />
                      <strong>No team members found</strong>
                      <span>Try changing your search or filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="team-note">
          <ShieldCheck size={17} />
          <p>
            Only administrators should manage team access and permissions.
            Role enforcement will be handled by the authentication system.
          </p>
        </div>
      </section>

      {modalOpen && (
        <div
          className="team-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <form className="team-modal" onSubmit={handleSubmit}>
            <div className="team-modal-header">
              <div>
                <span className="team-eyebrow">TEAM MANAGEMENT</span>
                <h2>{editingId ? "Edit Team Member" : "Add Team Member"}</h2>
                <p>
                  {editingId
                    ? "Update this member's information."
                    : "Add a new member to your workspace."}
                </p>
              </div>

              <button
                type="button"
                className="team-close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <div className="team-form-fields">
              <label>
                Full Name
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  required
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="name@company.com"
                  required
                />
              </label>

              <label>
                Team Role
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as TeamRole,
                    })
                  }
                  disabled={editingId === 1}
                >
                  <option value="Staff">Staff</option>
                  <option value="Viewer">Viewer</option>
                  <option value="Admin">Admin</option>
                </select>
                <span className="team-field-hint">
                  Admin: full access · Staff: operational access · Viewer: read-only access
                </span>
              </label>
            </div>

            <div className="team-modal-footer">
              <button
                type="button"
                className="team-cancel-btn"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>

              <button type="submit" className="team-primary-btn">
                <CheckCircle2 size={16} />
                {editingId ? "Save Changes" : "Add Member"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Team;
