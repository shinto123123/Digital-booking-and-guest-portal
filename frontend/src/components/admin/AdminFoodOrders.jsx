// src/components/admin/AdminFoodOrders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminFoodOrders() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today_revenue: 0,
    today_count: 0,
    month_revenue: 0,
    month_count: 0,
    pending_count: 0,
  });
  const [orders, setOrders] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    loadStats();
    loadMonths();
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-");
      loadOrdersByMonth(year, month);
    }
  }, [selectedMonth]);

  async function loadStats() {
    try {
      const resp = await axios.get(`${API_BASE}/api/food-orders/stats/`);
      if (resp?.data) {
        setStats(resp.data);
      }
    } catch (err) {
      console.warn("Failed to load food stats:", err?.message || err);
    }
  }

  async function loadMonths() {
    try {
      const resp = await axios.get(`${API_BASE}/api/food-orders/months/`);
      if (resp?.data) {
        setMonths(resp.data);
        // Select most recent month by default
        if (resp.data.length > 0) {
          const mostRecent = resp.data[0];
          setSelectedMonth(`${mostRecent.year}-${String(mostRecent.month).padStart(2, '0')}`);
        }
      }
    } catch (err) {
      console.warn("Failed to load months:", err?.message || err);
    }
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/api/food-orders/`);
      if (resp?.data) {
        setOrders(resp.data);
      }
    } catch (err) {
      console.warn("Failed to load orders:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrdersByMonth(year, month) {
    setLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/api/food-orders/history/${year}/${month}/`);
      if (resp?.data) {
        setOrders(resp.data);
      }
    } catch (err) {
      console.warn("Failed to load orders by month:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#181818", color: "#f1f1f1" }}>
      <style>{`
        :root{--bg-sidebar:#202020;--card:#2a2a2a;--accent:#c89d5c;--muted:#aaa}
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;display:block}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{color:var(--accent);background:rgba(200,157,92,0.15)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .topbar h1{color:var(--accent)}
        .stats-row{display:grid;grid-template-columns:repeat(5,1fr);gap:18px;margin-bottom:24px}
        .stat-card{background:var(--card);padding:20px;border-radius:8px;text-align:center}
        .stat-card h4{color:var(--muted);font-size:13px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px}
        .stat-card p{font-size:26px;color:var(--accent);font-weight:700}
        .filter-row{display:flex;align-items:center;gap:16px;margin-bottom:20px}
        .filter-row label{color:#aaa;font-size:14px}
        .filter-row select{background:var(--card);color:#fff;border:1px solid #444;padding:8px 12px;border-radius:6px;font-size:14px}
        .box{background:var(--card);padding:20px;border-radius:8px}
        .box h3{color:var(--accent);margin-bottom:16px;font-size:18px}
        .order-table{width:100%;border-collapse:collapse}
        .order-table th,.order-table td{padding:12px;text-align:left;border-bottom:1px solid #444;font-size:14px}
        .order-table th{color:var(--accent);font-weight:600}
        .order-table tr:hover{background:rgba(200,157,92,0.05)}
        .order-status{padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600}
        .status-pending{background:#fbbf24;color:#000}
        .status-preparing{background:#60a5fa;color:#fff}
        .status-ready{background:#34d399;color:#000}
        .status-delivered{background:#10b981;color:#fff}
        .status-cancelled{background:#ef4444;color:#fff}
        .empty-state{padding:60px 20px;text-align:center;color:#aaa}
        .empty-state h3{margin-bottom:8px;color:#c89d5c}
        @media(max-width:1200px){.stats-row{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:900px){.sidebar-container{display:none}.main-content{margin-left:0}.stats-row{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <aside className="sidebar-container">
        <h2 className="sidebar-title">Admin</h2>
        <nav className="sidebar-nav">
          <a href="/admin" className="sidebar-link">Dashboard</a>
          <a href="/admin/reservations" className="sidebar-link">Reservations</a>
          <a href="/admin/rooms" className="sidebar-link">Rooms</a>
          <a href="/admin/guest-activity" className="sidebar-link">Guest Activity</a>
          <a href="/admin/staff" className="sidebar-link">Staff</a>
          <a href="/admin/gallery" className="sidebar-link">Gallery</a>
          <a href="/admin/food" className="sidebar-link">Food</a>
          <a href="/admin/food-orders" className="sidebar-link active">Food Orders</a>
        </nav>
        <div className="sidebar-logout">
          <a href="/login" className="sidebar-link">Logout</a>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <h1>Food Order History</h1>
        </div>

        {/* Statistics */}
        <div className="stats-row">
          <div className="stat-card">
            <h4>Today's Revenue</h4>
            <p>₹{stats.today_revenue?.toLocaleString() || 0}</p>
          </div>
          <div className="stat-card">
            <h4>Today's Orders</h4>
            <p>{stats.today_count || 0}</p>
          </div>
          <div className="stat-card">
            <h4>Month Revenue</h4>
            <p>₹{stats.month_revenue?.toLocaleString() || 0}</p>
          </div>
          <div className="stat-card">
            <h4>Month Orders</h4>
            <p>{stats.month_count || 0}</p>
          </div>
          <div className="stat-card">
            <h4>Pending</h4>
            <p>{stats.pending_count || 0}</p>
          </div>
        </div>

        {/* Month Filter */}
        <div className="filter-row">
          <label>Filter by Month:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {months.map((m) => (
              <option key={`${m.year}-${m.month}`} value={`${m.year}-${String(m.month).padStart(2, '0')}`}>
                {new Date(m.year, m.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        {/* Orders Table */}
        <div className="box">
          <h3>
            {selectedMonth 
              ? `Orders for ${new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}`
              : 'All Orders'}
          </h3>
          
          {loading ? (
            <div className="empty-state">
              <p>Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <h3>No Orders Found</h3>
              <p>There are no food orders for the selected period.</p>
            </div>
          ) : (
            <table className="order-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Guest Name</th>
                  <th>Room</th>
                  <th>Phone</th>
                  <th>Food Item</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Special Instructions</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.guest_name || "Guest"}</td>
                    <td>{order.room_info || "-"}</td>
                    <td>{order.guest_phone || "-"}</td>
                    <td>{order.food_name}</td>
                    <td>{order.quantity}</td>
                    <td>₹{order.total_price}</td>
                    <td>
                      <span className={`order-status status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.special_instructions || "-"}
                    </td>
                    <td style={{ fontSize: 12, color: "#aaa" }}>
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
