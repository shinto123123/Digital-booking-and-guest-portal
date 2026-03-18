import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  const reservationId = searchParams.get("reservation_id");

  useEffect(() => {
    if (reservationId) {
      fetchReservation();
    }
  }, [reservationId]);

  const fetchReservation = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reservations/${reservationId}/`);
      if (res.ok) {
        const data = await res.json();
        setReservation(data);
      }
    } catch (err) {
      console.error("Failed to fetch reservation:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAddonNames = (r) => {
    if (!r) return [];
    if (Array.isArray(r.add_ons) && r.add_ons.length > 0) {
      return r.add_ons
        .map((it) => (typeof it === "string" ? it : it?.name || ""))
        .filter(Boolean);
    }
    const msg = r.message || r.notes || "";
    const line = String(msg)
      .split("\n")
      .find((l) => l.toLowerCase().startsWith("add-ons:"));
    if (!line) return [];
    const text = line.split(":").slice(1).join(":").trim();
    if (!text || text.toLowerCase() === "skipped") return [];
    return text.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const getAddonTotal = (r) => {
    if (!r) return 0;
    const explicit = Number(r.addon_total || 0);
    if (!Number.isNaN(explicit) && explicit > 0) return explicit;
    if (Array.isArray(r.add_ons)) {
      return r.add_ons.reduce(
        (sum, it) => sum + Number((typeof it === "object" && it?.price) || 0),
        0
      );
    }
    const addonPriceMap = {
      "campfire setup": 1500,
      "room decoration": 2500,
      "candle light dinner": 3500,
    };
    return getAddonNames(r).reduce(
      (sum, name) => sum + Number(addonPriceMap[String(name).toLowerCase()] || 0),
      0
    );
  };

  const generateInvoice = () => {
    if (!reservation) return;
    const addonNames = getAddonNames(reservation);
    const addonTotal = getAddonTotal(reservation);
    const addonLabel = addonNames.length > 0 ? addonNames.join(", ") : "None";

    const invoiceContent = `
===========================================
      EDEN'S GLAMP RESORT
===========================================

      INVOICE / BOOKING CONFIRMATION
      Booking ID: #${reservation.id}
      Date: ${new Date().toLocaleDateString()}

----------------------------------------
      GUEST DETAILS
----------------------------------------
Name:     ${reservation.name}
Email:    ${reservation.email}
Phone:    ${reservation.phone}

----------------------------------------
      BOOKING DETAILS
----------------------------------------
Check-in:  ${reservation.check_in}
Check-out: ${reservation.check_out}
Room Type: ${reservation.room_type || "Standard"}
Guests:    ${reservation.adults} Adult(s)
Add-ons:   ${addonLabel}

----------------------------------------
      PAYMENT DETAILS
----------------------------------------
Total Amount: ₹${reservation.total_amount || "0"}
Add-ons Amount: ₹${addonTotal || "0"}
Payment ID:   ${reservation.payment_id || "N/A"}
Status:       ${reservation.status}

===========================================
      Thank you for choosing Eden's Glamp!
      We look forward to hosting you.
===========================================
    `;

    // Create and download the invoice
    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Eden's_Glamp_Invoice_${reservation.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loader}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Navbar */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">
            <img src="/assets/glamp_logo.png" alt="Logo" className="logo" />
          </div>
          <div className="menu">
            <a href="/">Home</a>
            <a href="/menu">Menu</a>
            <a href="/reservation">Reservation</a>
            <a href="/login">Login</a>
            <a href="/register" className="reserve">Register</a>
          </div>
        </div>
      </nav>

      {/* Success Content */}
      <section className="hero" style={{ 
        background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/assets/images/reservation.jpg") center/cover',
        minHeight: '40vh'
      }}>
        <div className="hero-overlay">
          <h1>Payment Successful!</h1>
          <p>Thank you for booking with Eden's Glamp Resort</p>
        </div>
      </section>

      <section style={styles.content}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.title}>Your Reservation is Confirmed!</h2>
          
          {reservation ? (
            <div style={styles.details}>
              <div style={styles.detailRow}>
                <span style={styles.label}>Booking ID:</span>
                <span style={styles.value}>#{reservation.id}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Check-in:</span>
                <span style={styles.value}>{reservation.check_in}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Check-out:</span>
                <span style={styles.value}>{reservation.check_out}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Room Type:</span>
                <span style={styles.value}>{reservation.room_type || "Standard"}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Guests:</span>
                <span style={styles.value}>{reservation.adults} Adult(s)</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Add-ons:</span>
                <span style={styles.value}>
                  {getAddonNames(reservation).length > 0 ? getAddonNames(reservation).join(", ") : "None"}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Add-ons Amount:</span>
                <span style={styles.value}>₹{getAddonTotal(reservation).toLocaleString("en-IN")}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Total Amount:</span>
                <span style={styles.value}>₹{reservation.total_amount || "0"}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.label}>Status:</span>
                <span style={{...styles.value, color: '#4caf50'}}>{reservation.status}</span>
              </div>
            </div>
          ) : (
            <p>Reservation details not found.</p>
          )}

          <div style={styles.buttons}>
            <button onClick={generateInvoice} style={styles.downloadBtn}>
              Download Invoice
            </button>
            <button onClick={() => navigate("/")} style={styles.homeBtn}>
              Back to Home
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-col">
            <div className="footer-logo">Eden's Glamp</div>
            <div className="stars">★★★★★</div>
            <p>Luxury in Nature</p>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <p>info@edensglamp.com</p>
            <p>+91 98765 43210</p>
          </div>
          <div className="footer-col">
            <h4>Follow Us</h4>
            <div className="socials">
              <a href="#">Instagram</a>
              <a href="#">Facebook</a>
              <a href="#">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
  },
  loader: {
    fontSize: "18px",
    color: "#666",
  },
  content: {
    padding: "60px 20px",
    background: "#f8f9fa",
    minHeight: "60vh",
  },
  card: {
    maxWidth: "600px",
    margin: "0 auto",
    background: "white",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  successIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "#4caf50",
    color: "white",
    fontSize: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    color: "#333",
    marginBottom: "30px",
  },
  details: {
    textAlign: "left",
    marginBottom: "30px",
    padding: "20px",
    background: "#f8f9fa",
    borderRadius: "8px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #eee",
  },
  label: {
    fontWeight: "600",
    color: "#666",
  },
  value: {
    color: "#333",
    fontWeight: "500",
  },
  buttons: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  downloadBtn: {
    padding: "14px 30px",
    background: "#528ff5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "600",
  },
  homeBtn: {
    padding: "14px 30px",
    background: "#333",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "600",
  },
};
