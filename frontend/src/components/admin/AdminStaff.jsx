// src/components/admin/AdminStaff.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/api/staff/`);
      // normalize: expect array
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      setStaff(data);
    } catch (err) {
      console.error("Failed to load staff:", err);
      setError("Could not fetch staff. Check API and CORS.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStaff(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    // Validate username
    if (!username || username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Validate password
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { username, password, email, phone, address };
      const res = await axios.post(`${API_BASE}/api/staff/`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      const created = res?.data;
      setMsg("✅ Staff added successfully.");
      // clear form
      setUsername("");
      setPassword("");
      setEmail("");
      setPhone("");
      setAddress("");

      // Refresh list
      fetchStaff();
    } catch (err) {
      console.error("Add staff failed:", err);
      const text = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message || "Failed to add staff";
      setError("❌ " + text);
    } finally {
      setSubmitting(false);
    }
  }

  // mark staff as resigned by setting resign_date to today
  async function handleRemove(id) {
    if (!window.confirm("Remove this staff? This will set their resign date.")) return;

    try {
      const resign_date = new Date().toISOString().slice(0, 10);
      await axios.patch(`${API_BASE}/api/staff/${id}/`, { resign_date }, {
        headers: { "Content-Type": "application/json" },
      });

      setMsg("❌ Staff removed (resign_date set).");
      setStaff((prev) => prev.map((s) => (s.id === id || s.pk === id ? { ...s, resign_date } : s)));
    } catch (err) {
      console.error("Remove staff failed:", err);
      setError("Failed to remove staff.");
    }
  }

  // simple client-side search
  const filtered = staff.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      String(s.username ?? s.user ?? "").toLowerCase().includes(q) ||
      String(s.email ?? "").toLowerCase().includes(q) ||
      String(s.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#181818", color: "#f1f1f1" }}>
      <style>{`
        :root{--bg-sidebar:#202020;--card:#2a2a2a;--accent:#c89d5c;--muted:#aaa}
        *{box-sizing:border-box;font-family:"Segoe UI",sans-serif}
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;display:block}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{background:rgba(200,157,92,0.15);color:var(--accent)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .sidebar-logout .sidebar-link:hover{background:rgba(200,157,92,0.1)}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .form-box{background:var(--card);padding:16px;border-radius:8px;margin-bottom:20px}
        input, textarea{width:100%;padding:10px;margin-top:8px;border-radius:6px;border:none;background:#2e2e2e;color:#fff}
        .btn{background:var(--accent);color:#111;padding:10px 14px;border-radius:6px;border:none;cursor:pointer}
        .btn:disabled{opacity:0.6;cursor:not-allowed}
        table{width:100%;border-collapse:collapse;background:var(--card);border-radius:8px;overflow:hidden}
        th,td{padding:12px;border-bottom:1px solid #333;text-align:left;vertical-align:middle}
        th{color:var(--accent)}
        .remove-btn{background:transparent;border:none;color:#ff6b6b;cursor:pointer;font-weight:700}
        .muted{color:var(--muted)}
        @media(max-width:900px){ .sidebar-container{display:none} .main-content{padding:16px;margin-left:0} }
      `}</style>

      <aside className="sidebar-container">
        <h2 className="sidebar-title">Admin</h2>
        <nav className="sidebar-nav">
          <a href="/admin" className="sidebar-link">Dashboard</a>
          <a href="/admin/reservations" className="sidebar-link">Reservations</a>
          <a href="/admin/rooms" className="sidebar-link">Rooms</a>
          <a href="/admin/customers" className="sidebar-link">Customers</a>
          <a href="/admin/calendar" className="sidebar-link">Calendar</a>
          <a href="/admin/staff" className="sidebar-link active">Staff</a>
          <a href="/admin/gallery" className="sidebar-link">Gallery</a>
          <a href="/admin/reviews" className="sidebar-link">Reviews</a>
        </nav>
        <div className="sidebar-logout">
          <a href="/login" className="sidebar-link">Logout</a>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <h1 style={{ color: "var(--accent)" }}>Manage Staff</h1>
          <input
            className="muted"
            placeholder="Search staff..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ padding: 10, borderRadius: 6, border: "none", background: "#2a2a2a", color: "#ddd", width: 250 }}
          />
        </div>

        <div className="form-box">
          <h2 style={{ color: "var(--accent)", marginBottom: 8 }}>Add Staff</h2>
          {msg && <div style={{ marginBottom: 8, color: msg.startsWith("❌") ? "#ff8a8a" : "#9ef59e" }}>{msg}</div>}
          {error && <div style={{ marginBottom: 8, color: "#ff8a8a" }}>{error}</div>}
          <form onSubmit={handleAddStaff}>
            <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <textarea placeholder="Address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Staff"}</button>
            </div>
          </form>
        </div>

        <h2 style={{ marginBottom: 12 }}>Current Staff</h2>

        {loading ? (
          <div className="muted">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="muted">No staff members yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Entry Date</th>
                <th>Resign Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const id = s.id ?? s.pk ?? s.staff_id;
                return (
                  <tr key={id ?? JSON.stringify(s)}>
                    <td>{id}</td>
                    <td>{s.username ?? s.user ?? "-"}</td>
                    <td>{s.email ?? "-"}</td>
                    <td>{s.phone ?? "-"}</td>
                    <td style={{ maxWidth: 300 }}>{s.address ?? "-"}</td>
                    <td>{(s.entry_date ?? s.created_at ?? "").slice(0, 10) || "-"}</td>
                    <td>{(s.resign_date ?? "-") || "-"}</td>
                    <td>
                      {!s.resign_date ? (
                        <button className="remove-btn" onClick={() => handleRemove(id)}>Remove</button>
                      ) : (
                        <span style={{ color: "#aaa" }}>Resigned</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
