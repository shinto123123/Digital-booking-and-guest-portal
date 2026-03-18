import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminGuestActivity() {
  const { id } = useParams(); // reservation id
  const [guest, setGuest] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuestDetails();
    loadActivities();
  }, []);

  async function loadGuestDetails() {
    try {
      const res = await axios.get(`${API_BASE}/api/reservations/${id}/`);
      setGuest(res.data);
    } catch (err) {
      console.error("Failed to load guest details", err);
    }
  }

  async function loadActivities() {
    try {
      const res = await axios.get(
        `${API_BASE}/api/admin/guest/${id}/activities/`
      );
      setActivities(res.data || []);
    } catch (err) {
      console.error("Failed to load activities", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#181818", color: "#f1f1f1" }}>
      <style>{`
        :root{
          --bg-sidebar:#202020;
          --card:#2a2a2a;
          --accent:#c89d5c;
          --muted:#aaa;
          --border:#333;
        }
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;display:block}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{background:rgba(200,157,92,0.15);color:var(--accent)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .sidebar-logout .sidebar-link:hover{background:rgba(200,157,92,0.1)}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        .card{
          background:var(--card);
          padding:16px;
          border-radius:8px;
          margin-bottom:20px;
        }
        table{
          width:100%;
          border-collapse:collapse;
        }
        th, td{
          padding:12px;
          border-bottom:1px solid var(--border);
          text-align:left;
        }
        th{ color:var(--accent) }
        tr:hover{ background:#232323 }
        .badge{
          padding:4px 10px;
          border-radius:12px;
          font-size:12px;
          font-weight:600;
        }
        .food{ background:#14532d; color:#86efac }
        .cab{ background:#1e3a8a; color:#93c5fd }
        .other{ background:#3f3f46; color:#e5e7eb }
        h1{color:var(--accent);margin-bottom:20px}
        @media(max-width:900px){
          .sidebar-container{display:none}
          .main-content{margin-left:0;padding:16px}
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
          <a href="/admin/guest-activity" className="sidebar-link active">Guest Activity</a>
          <a href="/admin/staff" className="sidebar-link">Staff</a>
          <a href="/admin/gallery" className="sidebar-link">Gallery</a>
          <a href="/admin/reviews" className="sidebar-link">Reviews</a>
        </nav>
        <div className="sidebar-logout">
          <a href="/login" className="sidebar-link">Logout</a>
        </div>
      </aside>

      <main className="main-content">
        <h1>Guest Activity</h1>

        {/* Guest Info */}
        {guest && (
          <div className="card">
            <h3>{guest.name}</h3>
            <p>Email: {guest.email}</p>
            <p>Phone: {guest.phone}</p>
            <p>
              Stay: {guest.checkin} → {guest.checkout}
            </p>
            <p>Room Type: {guest.room_type}</p>
          </div>
        )}

        {/* Activity Table */}
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Activities</h3>

          {loading ? (
            <p>Loading activities...</p>
          ) : activities.length === 0 ? (
            <p>No activity recorded</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={i}>
                    <td>{new Date(a.date).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${a.type}`}>
                        {a.type.toUpperCase()}
                      </span>
                    </td>
                    <td>{a.description}</td>
                    <td>₹{Number(a.amount).toFixed(2)}</td>
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
