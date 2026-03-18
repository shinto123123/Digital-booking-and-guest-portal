// src/components/admin/AdminCustomers.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/customers/`);
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  function formatJoinedDate(value) {
    return value ? new Date(value).toLocaleDateString() : "-";
  }

  function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function handleDownloadPdf() {
    if (filteredCustomers.length === 0) {
      alert("No customer data to export.");
      return;
    }

    setPdfLoading(true);
    try {
      await loadExternalScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
      await loadExternalScript("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js");

      const jsPDFCtor = window.jspdf?.jsPDF;
      if (!jsPDFCtor) throw new Error("jsPDF unavailable");

      const doc = new jsPDFCtor({ orientation: "portrait", unit: "pt", format: "a4" });
      const generatedOn = new Date().toLocaleString();

      doc.setFontSize(16);
      doc.text("Customer Details Report", 40, 40);
      doc.setFontSize(10);
      doc.text(`Generated: ${generatedOn}`, 40, 58);
      doc.text(`Total Customers: ${filteredCustomers.length}`, 40, 73);

      const tableRows = filteredCustomers.map((c) => [
        `#${c.id ?? "-"}`,
        c.username || "-",
        c.email || "-",
        c.phone || "-",
        formatJoinedDate(c.date_joined),
      ]);

      doc.autoTable({
        startY: 90,
        head: [["ID", "Username", "Email", "Phone", "Joined"]],
        body: tableRows,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [200, 157, 92], textColor: [0, 0, 0] },
        theme: "striped",
      });

      doc.save(`customers_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
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
        .sidebar-logout .sidebar-link:hover{background:rgba(200,157,92,0.1)}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px;flex-wrap:wrap}
        .topbar h1{color:var(--accent)}
        .search-box{background:#252525;border:1px solid #333;border-radius:8px;padding:10px 14px;color:#fff;width:280px;font-size:14px}
        .search-box:focus{outline:none;border-color:var(--accent)}
        .table-container{background:var(--card);border-radius:12px;overflow:hidden}
        table{width:100%;border-collapse:collapse}
        th{background:#333;color:var(--accent);padding:14px 16px;text-align:left;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.5px}
        td{padding:14px 16px;border-bottom:1px solid #333;color:#ddd;font-size:14px}
        tr:hover{background:rgba(200,157,92,0.05)}
        .empty-state{padding:60px 20px;text-align:center;color:var(--muted)}
        .loading{color:var(--accent);padding:40px;text-align:center}
        .error{color:#ff6b6b;padding:20px;text-align:center}
        @media(max-width:900px){
          .sidebar-container{display:none}
          .main-content{margin-left:0}
          .table-container{overflow-x:auto}
        }
      `}</style>

      <aside className="sidebar-container">
        <h2 className="sidebar-title">Admin</h2>
        <nav className="sidebar-nav">
          <a href="/admin" className="sidebar-link">Dashboard</a>
          <a href="/admin/reservations" className="sidebar-link">Reservations</a>
          <a href="/admin/rooms" className="sidebar-link">Rooms</a>
          <a href="/admin/customers" className="sidebar-link active">Customers</a>
          <a href="/admin/calendar" className="sidebar-link">Calendar</a>
          <a href="/admin/staff" className="sidebar-link">Staff</a>
          <a href="/admin/gallery" className="sidebar-link">Gallery</a>
          <a href="/admin/reviews" className="sidebar-link">Reviews</a>
        </nav>
        <div className="sidebar-logout">
          <a href="/staff-admin-login" className="sidebar-link">Logout</a>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <h1>Customers</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading || loading}
              style={{
                background: "var(--accent)",
                color: "#111",
                border: "none",
                borderRadius: 8,
                padding: "10px 14px",
                fontWeight: 600,
                cursor: pdfLoading || loading ? "not-allowed" : "pointer",
                opacity: pdfLoading || loading ? 0.7 : 1,
              }}
            >
              {pdfLoading ? "Preparing PDF..." : "Download PDF"}
            </button>
            <input
              type="text"
              className="search-box"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading && <div className="loading">Loading customers...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                      {searchTerm ? "No customers match your search" : "No customers found"}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>#{customer.id}</td>
                      <td style={{ fontWeight: 500, color: "var(--accent)" }}>{customer.username}</td>
                      <td>{customer.email || "-"}</td>
                      <td>{customer.phone || "-"}</td>
                      <td>{formatJoinedDate(customer.date_joined)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div style={{ marginTop: 16, color: "var(--muted)", fontSize: 14 }}>
            Total Customers: {filteredCustomers.length}
          </div>
        )}
      </main>
    </div>
  );
}
