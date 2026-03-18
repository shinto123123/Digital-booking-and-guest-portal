// src/components/admin/AdminBookings.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReservations() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/reservations/`);
      setReservations(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
      setError("Could not fetch reservations. Check API and CORS.");
    } finally {
      setLoading(false);
    }
  }

  // Filter and search logic
  const filteredReservations = reservations.filter((r) => {
    // Search by customer name
    const matchesSearch = searchTerm
      ? r.name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    // Filter by status
    const matchesStatus =
      statusFilter === "all"
        ? true
        : r.status?.toLowerCase() === statusFilter.toLowerCase();

    // Filter by date (check-in date)
    const matchesDate = dateFilter
      ? r.check_in?.startsWith(dateFilter)
      : true;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  async function changeStatus(id, toStatus) {
    setActionLoading(true);
    try {
      await axios.patch(`${API_BASE}/api/reservations/${id}/`, { status: toStatus });
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: toStatus } : r)));
      setSelected((s) => (s && s.id === id ? { ...s, status: toStatus } : s));
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  function withRefundNote(existingText, refundType) {
    const base = String(existingText || "")
      .split("\n")
      .filter((line) => !line.toLowerCase().startsWith("refund policy:"))
      .join("\n")
      .trim();
    const refundLabel =
      refundType === "full" ? "Full Refund" : refundType === "half" ? "Half Refund" : "No Refund";
    return [base, `Refund Policy: ${refundLabel}`].filter(Boolean).join("\n");
  }

  async function cancelBooking(id, refundType) {
    setCancelConfirm(null);
    setActionLoading(true);
    try {
      const current = reservations.find((r) => r.id === id) || selected || {};
      const existingMessage = current.message ?? current.notes ?? "";
      const nextMessage = withRefundNote(existingMessage, refundType);
      await axios.patch(`${API_BASE}/api/reservations/${id}/`, {
        status: "Cancelled",
        message: nextMessage,
      });
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "Cancelled", message: nextMessage, notes: nextMessage } : r
        )
      );
      setSelected((s) =>
        s && s.id === id ? { ...s, status: "Cancelled", message: nextMessage, notes: nextMessage } : s
      );
      alert("Booking has been cancelled with selected refund option.");
    } catch (err) {
      console.error(err);
      alert("Failed to cancel booking");
    } finally {
      setActionLoading(false);
    }
  }

  async function sendConfirmationEmail(id) {
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/reservations/${id}/send-confirmation/`);
      alert(res.data.message || "Email sent successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to send email");
    } finally {
      setActionLoading(false);
    }
  }

  function prettyDate(s) {
    if (!s) return "-";
    try {
      const d = new Date(s);
      if (isNaN(d)) return s;
      return d.toLocaleDateString();
    } catch {
      return s;
    }
  }

  function formatDateTime(s) {
    if (!s) return "-";
    try {
      const d = new Date(s);
      if (isNaN(d)) return s;
      return d.toLocaleString();
    } catch {
      return s;
    }
  }

  function getStatusBadge(status) {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "confirmed") {
      return <span className="badge badge-confirmed">Confirmed</span>;
    } else if (statusLower === "cancelled") {
      return <span className="badge badge-cancelled">Cancelled</span>;
    } else if (statusLower === "pending") {
      return <span className="badge badge-pending">Pending</span>;
    }
    return <span className="badge">{status}</span>;
  }

  function getPaymentBadge(paymentStatus) {
    const statusLower = (paymentStatus || "").toLowerCase();
    if (statusLower === "paid") {
      return <span className="badge badge-paid">Paid</span>;
    }
    return <span className="badge badge-unpaid">Unpaid</span>;
  }

  function getAddonNames(reservation) {
    if (Array.isArray(reservation?.add_ons) && reservation.add_ons.length > 0) {
      return reservation.add_ons
        .map((it) => (typeof it === "string" ? it : it?.name || ""))
        .filter(Boolean);
    }
    const msg = reservation?.message || reservation?.notes || "";
    const line = String(msg)
      .split("\n")
      .find((l) => l.toLowerCase().startsWith("add-ons:"));
    if (!line) return [];
    const text = line.split(":").slice(1).join(":").trim();
    if (!text || text.toLowerCase() === "skipped") return [];
    return text.split(",").map((s) => s.trim()).filter(Boolean);
  }

  function formatAddons(reservation) {
    const names = getAddonNames(reservation);
    return names.length > 0 ? names.join(", ") : "-";
  }

  function getAddonTotal(reservation) {
    const explicit = Number(reservation?.addon_total || 0);
    if (!Number.isNaN(explicit) && explicit > 0) return explicit;
    const addonPriceMap = {
      "campfire setup": 1500,
      "room decoration": 2500,
      "candle light dinner": 3500,
    };
    return getAddonNames(reservation).reduce(
      (sum, name) => sum + Number(addonPriceMap[String(name).toLowerCase()] || 0),
      0
    );
  }

  return (
    <div>
      <style>{`
        :root {
          --bg-dark: #181818;
          --bg-sidebar: #202020;
          --text-light: #f1f1f1;
          --text-muted: #aaa;
          --accent: #c89d5c;
          --card-bg: #2a2a2a;
        }
        *{box-sizing:border-box;font-family:"Segoe UI",sans-serif}
        body,html,#root{height:100%}
        .page{display:flex;min-height:100vh;background:var(--bg-dark);color:var(--text-light)}
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;display:block}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{background:rgba(200,157,92,0.15);color:var(--accent)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .sidebar-logout .sidebar-link:hover{background:rgba(200,157,92,0.1)}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        h1{color:var(--accent);margin-bottom:16px}
        
        /* Controls */
        .controls{display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
        .search-input{padding:10px 14px;border-radius:6px;border:1px solid #333;background:#1e1e1e;color:#fff;width:220px;font-size:14px}
        .search-input:focus{outline:none;border-color:var(--accent)}
        .filter-select{padding:10px 14px;border-radius:6px;border:1px solid #333;background:#1e1e1e;color:#fff;font-size:14px;cursor:pointer}
        .filter-select:focus{outline:none;border-color:var(--accent)}
        .date-input{padding:10px 14px;border-radius:6px;border:1px solid #333;background:#1e1e1e;color:#fff;font-size:14px}
        .date-input:focus{outline:none;border-color:var(--accent)}
        .btn{padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-size:13px;transition:all 0.2s}
        .btn-refresh{background:#333;color:#fff}
        .btn-refresh:hover{background:#444}
        
        /* Table */
        .table-container{background:var(--card-bg);border-radius:12px;overflow:hidden}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px 14px;border-bottom:1px solid #333;text-align:left;vertical-align:middle;font-size:13px}
        th{background:#252525;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-size:12px}
        tr:hover{background:#252525}
        .table-scroll{overflow-x:auto}
        
        /* Badges */
        .badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500}
        .badge-confirmed{background:rgba(76,175,80,0.2);color:#4caf50}
        .badge-cancelled{background:rgba(229,57,53,0.2);color:#e53935}
        .badge-pending{background:rgba(230,195,77,0.2);color:#e6c34d}
        .badge-paid{background:rgba(76,175,80,0.2);color:#4caf50}
        .badge-unpaid{background:rgba(255,152,0,0.2);color:#ff9800}
        
        /* Action Buttons */
        .btn-view{background:#3b82f6;color:white}
        .btn-view:hover{background:#2563eb}
        .btn-cancel{background:#e53935;color:white}
        .btn-cancel:hover{background:#c62828}
        
        /* Pagination */
        .pagination{display:flex;gap:8px;align-items:center;justify-content:center;margin-top:20px}
        .page-btn{padding:8px 14px;border-radius:6px;border:1px solid #333;background:#252525;color:#fff;cursor:pointer}
        .page-btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}
        .page-btn:disabled{opacity:0.5;cursor:not-allowed}
        .page-info{color:var(--text-muted);font-size:13px}
        
        /* Modal */
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:60}
        .modal{background:#1a1a1a;padding:24px;border-radius:12px;max-width:700px;width:94%;color:var(--text-light);box-shadow:0 8px 30px rgba(0,0,0,0.6);max-height:90vh;overflow-y:auto}
        .modal h3{margin:0 0 16px;color:var(--accent);font-size:20px}
        .modal-section{margin-bottom:20px}
        .modal-section h4{color:var(--accent);margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #333;padding-bottom:6px}
        .detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .detail-item{display:flex;flex-direction:column}
        .detail-label{color:var(--text-muted);font-size:12px;margin-bottom:2px}
        .detail-value{font-size:14px}
        .modal-actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
        
        /* Confirm Popup */
        .confirm-popup{background:#2a1a1a;border:1px solid #e53935;border-radius:8px;padding:16px;margin-top:12px}
        .confirm-popup p{margin:0 0 12px;color:#ff6b6b}
        .confirm-popup .btn-confirm{background:#e53935;color:white}
        .confirm-popup .btn-confirm:hover{background:#c62828}
        
        .muted{color:var(--text-muted)}
        .empty-state{padding:60px 20px;text-align:center;color:var(--text-muted)}
        
        @media (max-width:900px){
          .sidebar-container{display:none}
          .main-content{padding:16px;margin-left:0}
          .controls{flex-direction:column;align-items:stretch}
          .search-input,.filter-select,.date-input{width:100%}
          .detail-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="page">
        <aside className="sidebar-container">
          <h2 className="sidebar-title">Admin</h2>
          <nav className="sidebar-nav">
            <a href="/admin" className="sidebar-link">Dashboard</a>
            <a href="/admin/reservations" className="sidebar-link active">Reservations</a>
            <a href="/admin/rooms" className="sidebar-link">Rooms</a>
            <a href="/admin/customers" className="sidebar-link">Customers</a>
            <a href="/admin/calendar" className="sidebar-link">Calendar</a>
            <a href="/admin/staff" className="sidebar-link">Staff</a>
            <a href="/admin/gallery" className="sidebar-link">Gallery</a>
            <a href="/admin/reviews" className="sidebar-link">Reviews</a>
          </nav>
          <div className="sidebar-logout">
            <a href="/login" className="sidebar-link">Logout</a>
          </div>
        </aside>

        <main className="main-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <h1>Reservations</h1>
            <button className="btn btn-refresh" onClick={fetchReservations} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Filters */}
          <div className="controls">
            <input
              type="text"
              className="search-input"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              className="date-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by check-in date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer" }}
              >
                Clear Date
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <p className="muted">Loading...</p>
          ) : error ? (
            <p className="muted">{error}</p>
          ) : filteredReservations.length === 0 ? (
            <div className="empty-state">
              {searchTerm || statusFilter !== "all" || dateFilter
                ? "No reservations match your filters."
                : "No reservations found."}
            </div>
          ) : (
            <>
              <div className="table-container">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Room</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Guests</th>
                        <th>Add-ons</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReservations.map((r) => (
                        <tr key={r.id}>
                          <td>#{r.id}</td>
                          <td style={{ fontWeight: 500 }}>{r.name}</td>
                          <td>
                            <div style={{ fontSize: 12 }}>
                              <div>{r.email || "-"}</div>
                              <div className="muted">{r.phone || "-"}</div>
                            </div>
                          </td>
                          <td>{r.room_type || "-"}</td>
                          <td>{prettyDate(r.check_in)}</td>
                          <td>{prettyDate(r.check_out)}</td>
                          <td>
                            {r.adults || 0} Adult{r.adults !== 1 ? "s" : ""}
                            {r.children > 0 ? `, ${r.children} Child` : ""}
                          </td>
                          <td>{formatAddons(r)}</td>
                          <td style={{ fontWeight: 600 }}>₹{Number(r.total_amount || 0).toLocaleString()}</td>
                          <td>{getPaymentBadge(r.payment_status)}</td>
                          <td>{getStatusBadge(r.status)}</td>
                          <td>
                            <button
                              className="btn btn-view"
                              onClick={() => setSelected(r)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}

              <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredReservations.length)} of{" "}
                {filteredReservations.length} reservations
              </div>
            </>
          )}
        </main>
      </div>

      {/* Details Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Booking #{selected.id} — {selected.name}</h3>

            <div className="modal-section">
              <h4>Contact Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{selected.email || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{selected.phone || "-"}</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h4>Stay Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Room Type</span>
                  <span className="detail-value">{selected.room_type || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Number of Rooms</span>
                  <span className="detail-value">{selected.rooms || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Check-in Date</span>
                  <span className="detail-value">{prettyDate(selected.check_in)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Check-out Date</span>
                  <span className="detail-value">{prettyDate(selected.check_out)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Adults</span>
                  <span className="detail-value">{selected.adults || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Children</span>
                  <span className="detail-value">{selected.children || 0}</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h4>Payment Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Total Amount</span>
                  <span className="detail-value" style={{ fontWeight: 600, color: "var(--accent)" }}>
                    ₹{Number(selected.total_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Payment Status</span>
                  <span className="detail-value">{getPaymentBadge(selected.payment_status)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Add-ons Total</span>
                  <span className="detail-value">₹{Number(getAddonTotal(selected)).toLocaleString()}</span>
                </div>
                {selected.payment_id && (
                  <div className="detail-item">
                    <span className="detail-label">Payment ID</span>
                    <span className="detail-value" style={{ fontSize: 12 }}>{selected.payment_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-section">
              <h4>Booking Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Booking Status</span>
                  <span className="detail-value">{getStatusBadge(selected.status)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Booking Date</span>
                  <span className="detail-value">{formatDateTime(selected.created_at)}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Add-ons</span>
                  <span className="detail-value">{formatAddons(selected)}</span>
                </div>
                {(selected.message || selected.notes) && (
                  <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                    <span className="detail-label">Notes</span>
                    <span className="detail-value">{selected.message || selected.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cancel Confirmation */}
            {cancelConfirm === selected.id && (
              <div className="confirm-popup">
                <p>Select refund option for this cancellation:</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-confirm" onClick={() => cancelBooking(selected.id, "full")}>
                    Full Refund
                  </button>
                  <button className="btn" onClick={() => cancelBooking(selected.id, "half")} style={{ background: "#b45309", color: "#fff" }}>
                    Half Refund
                  </button>
                  <button className="btn" onClick={() => cancelBooking(selected.id, "none")} style={{ background: "#6b7280", color: "#fff" }}>
                    No Refund
                  </button>
                  <button className="btn" onClick={() => setCancelConfirm(null)} style={{ background: "#333", color: "#fff" }}>
                    Keep Booking
                  </button>
                </div>
              </div>
            )}

            <div className="modal-actions">
              {selected.status === "Pending" && (
                <>
                  <button
                    className="btn"
                    onClick={() => {
                      if (window.confirm("Confirm this booking?")) changeStatus(selected.id, "Confirmed");
                    }}
                    style={{ background: "#4caf50", color: "#fff" }}
                  >
                    Confirm
                  </button>
                  <button
                    className="btn"
                    onClick={() => setCancelConfirm(selected.id)}
                    style={{ background: "#e53935", color: "#fff" }}
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              {selected.status === "Confirmed" && (
                <>
                  <button
                    className="btn"
                    onClick={() => sendConfirmationEmail(selected.id)}
                    style={{ background: "#8b5cf6", color: "#fff" }}
                  >
                    Send Email
                  </button>
                  <button
                    className="btn"
                    onClick={() => setCancelConfirm(selected.id)}
                    style={{ background: "#e53935", color: "#fff" }}
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              {selected.status === "Cancelled" && (
                <button
                  className="btn"
                  onClick={() => {
                    if (window.confirm("Reopen this booking?")) changeStatus(selected.id, "Pending");
                  }}
                  style={{ background: "#4caf50", color: "#fff" }}
                >
                  Reopen Booking
                </button>
              )}
              <button
                className="btn"
                onClick={() => setSelected(null)}
                style={{ background: "#374151", color: "#fff" }}
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
