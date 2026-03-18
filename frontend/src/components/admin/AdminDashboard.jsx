// src/components/admin/AdminDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_today: 0,
    revenue: 0,
    available_rooms: 0,
    chart_labels: [],
    chart_data: [],
  });

  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    loadSummary();

    // cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render chart when summary data changes
  useEffect(() => {
    if (summary.chart_labels.length > 0 && summary.chart_data.length > 0 && chartRef.current) {
      // Use setTimeout to ensure canvas is ready
      const timer = setTimeout(() => {
        renderChart(summary.chart_labels, summary.chart_data);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.chart_labels, summary.chart_data]);

  async function loadSummary() {
    setLoading(true);
    setError(null);

    try {
      // fetch reservations and rooms
      const [resRes, roomsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/reservations/`),
        axios.get(`${API_BASE}/api/rooms/`),
      ]);

      const reservations = Array.isArray(resRes.data) ? resRes.data : [];
      const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : [];

      // total_today: confirmed reservations created today
      const todayISO = new Date().toISOString().slice(0, 10);
      const total_today = reservations.filter((r) => {
        const created = (r.created_at || "").slice(0, 10);
        return created === todayISO && (r.status || "").toLowerCase() === "confirmed";
      }).length;

      // revenue: sum of total_amount from all confirmed reservations
      const revenue = reservations
        .filter((r) => (r.status || "").toLowerCase() === "confirmed")
        .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

      // available rooms: total rooms - rooms reserved today (check-in today and not checked-out)
      const today = new Date().toISOString().slice(0, 10);
      const occupiedToday = reservations.filter((r) => {
        const checkIn = (r.check_in || "").slice(0, 10);
        const checkOut = (r.check_out || "").slice(0, 10);
        const status = (r.status || "").toLowerCase();
        // Room is occupied if check_in <= today < check_out and status is confirmed
        return checkIn <= today && today < checkOut && status === "confirmed";
      }).reduce((sum, r) => sum + Number(r.rooms || 1), 0);

      const totalRoomsCount = rooms.length;
      const available_rooms = Math.max(totalRoomsCount - occupiedToday, 0);

      // chart: confirmed reservations per day for last 30 days
      const days = 30;
      const dates = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const countMap = Object.fromEntries(dates.map((d) => [d, 0]));
      for (const r of reservations) {
        if ((r.status || "").toLowerCase() !== "confirmed") continue;
        const created = (r.created_at || "").slice(0, 10);
        if (created && countMap.hasOwnProperty(created)) {
          countMap[created] = (countMap[created] || 0) + 1;
        }
      }
      const chart_labels = dates.map((d) => {
        const dt = new Date(d);
        return dt.toLocaleString(undefined, { month: "short", day: "2-digit" });
      });
      const chart_data = dates.map((d) => countMap[d] || 0);

      const summaryData = { total_today, revenue, available_rooms, chart_labels, chart_data };
      setSummary(summaryData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Unable to fetch dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  function renderChart(labels, data) {
    try {
      const canvas = chartRef.current;
      if (!canvas) return;
      
      // Destroy existing chart instance
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      // Create new chart
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      chartInstanceRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Successful Check-ins",
              data,
              borderColor: "#c89d5c",
              backgroundColor: "rgba(200,157,92,0.2)",
              fill: true,
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#aaa", maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, grid: { color: "#333" } },
            y: { beginAtZero: true, ticks: { color: "#aaa", stepSize: 1 }, grid: { color: "#333" } },
          },
        },
      });
    } catch (err) {
      console.error("Chart render error:", err);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwdMsg("");
    const fd = new FormData(e.target);
    const body = {
      old_password: fd.get("old_password"),
      new_password: fd.get("new_password"),
      confirm_password: fd.get("confirm_password"),
    };
    try {
      const resp = await axios.post(`${API_BASE}/api/admin/change-password/`, body);
      setPwdMsg(resp.data?.message || "Password updated");
    } catch (err) {
      console.error(err);
      setPwdMsg(err?.response?.data?.detail || "Failed to update password");
    }
  }

  const { total_today, revenue, available_rooms } = summary;

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
        .sidebar-logout .sidebar-link:hover{background:rgba(200,157,92,0.1)}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .topbar h1{color:var(--accent)}
        .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:20px}
        .card{background:var(--card);padding:16px;border-radius:8px;text-align:center}
        .card h4{color:var(--muted);margin-bottom:8px}
        .card p{font-size:20px;color:var(--accent);font-weight:700}
        .content{display:grid;grid-template-columns:1fr;gap:18px}
        .box{background:var(--card);padding:16px;border-radius:8px}

        @media(max-width:900px){ 
          .cards{grid-template-columns:repeat(2,1fr)} 
          .content{grid-template-columns:1fr} 
          .sidebar-container{display:none}
          .main-content{margin-left:0}
        }
      `}</style>

      <aside className="sidebar-container">
        <h2 className="sidebar-title">Admin</h2>
        <nav className="sidebar-nav">
          <a href="/admin" className="sidebar-link">Dashboard</a>
          <a href="/admin/reservations" className="sidebar-link">Reservations</a>
          <a href="/admin/rooms" className="sidebar-link">Rooms</a>
          <a href="/admin/customers" className="sidebar-link">Customers</a>
          <a href="/admin/calendar" className="sidebar-link">Calendar</a>
          <a href="/admin/staff" className="sidebar-link">Staff</a>
          <a href="/admin/gallery" className="sidebar-link">Gallery</a>
          <a href="/admin/reviews" className="sidebar-link">Reviews</a>

        </nav>
        <div className="sidebar-logout">
          <a 
            href="/staff-admin-login" 
            className="sidebar-link"
            onClick={(e) => {
              e.preventDefault();
              localStorage.removeItem('staff_access_token');
              localStorage.removeItem('staff_refresh_token');
              localStorage.removeItem('staff_username');
              localStorage.removeItem('staff_role');
              localStorage.removeItem('admin_id');
              localStorage.removeItem('staff_id');
              window.location.href = '/staff-admin-login';
            }}
          >
            Logout
          </a>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <h1>Dashboard</h1>
          <div>
            <button onClick={() => setModalOpen(true)} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 18 }}>🔒 Change Password</button>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="cards">
          <div className="card">
            <h4>Total Bookings Today</h4>
            <p>{loading ? "..." : total_today}</p>
          </div>
          <div className="card">
            <h4>Revenue</h4>
            <p>₹{loading ? "..." : Number(revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="card">
            <h4>Available Rooms</h4>
            <p>{loading ? "..." : available_rooms}</p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="content">
          <div className="box" style={{ height: 320, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: "var(--accent)", marginBottom: 12 }}></h3>
            <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', height: '100%' }}>
              <canvas ref={chartRef} id="bookingChart" style={{ width: '100%', height: '100%' }}></canvas>
            </div>
            {error && <div style={{ color: "#f87171", marginTop: 10 }}>{error}</div>}
          </div>
        </div>


      </main>

      {/* Password Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#2a2a2a", padding: 24, borderRadius: 8, width: 420, maxWidth: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 style={{ color: "var(--accent)" }}>Change Password</h2>
              <button onClick={() => { setModalOpen(false); setPwdMsg(""); }} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 22 }}>×</button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <input name="old_password" type="password" placeholder="Current Password" required style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 6, border: "1px solid #444", background: "#1e1e1e", color: "#fff" }} />
              <input name="new_password" type="password" placeholder="New Password" required style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 6, border: "1px solid #444", background: "#1e1e1e", color: "#fff" }} />
              <input name="confirm_password" type="password" placeholder="Confirm New Password" required style={{ width: "100%", padding: 10, marginBottom: 12, borderRadius: 6, border: "1px solid #444", background: "#1e1e1e", color: "#fff" }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setModalOpen(false); setPwdMsg(""); }} style={{ padding: "8px 14px", borderRadius: 6, background: "#374151", color: "#fff", border: "none" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 14px", borderRadius: 6, background: "var(--accent)", color: "#111", border: "none" }}>Update</button>
              </div>
            </form>
            {pwdMsg && <div style={{ marginTop: 10, color: pwdMsg.toLowerCase().includes("fail") ? "#ff7676" : "#9ef59e" }}>{pwdMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
