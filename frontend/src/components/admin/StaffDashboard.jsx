// src/components/admin/StaffDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    checked_in: 0,
    pending_requests: 0,
    today_checkins: 0,
    today_checkouts: 0,
  });
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [todaysGuests, setTodaysGuests] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [checkedInGuests, setCheckedInGuests] = useState([]);
  const [confirmedReservations, setConfirmedReservations] = useState([]);
  
  // Manual reservation state
  const [manualReservationModalOpen, setManualReservationModalOpen] = useState(false);
  const [manualReservationSubmitting, setManualReservationSubmitting] = useState(false);
  const [manualReservationError, setManualReservationError] = useState("");
  const [manualReservationMsg, setManualReservationMsg] = useState("");
  const [manualReservationForm, setManualReservationForm] = useState({
    name: "",
    email: "",
    phone: "",
    adults: 1,
    children: 0,
    check_in: "",
    check_out: "",
    room_type: "",
    rooms: 1,
    message: "",
    status: "Confirmed",
    payment_status: "unpaid",
    total_amount: "",
  });
  
  // Check-in management state
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [checkinForm, setCheckinForm] = useState({
    id_proof_type: "aadhar",
    id_proof_number: "",
    special_notes: "",
    action: "checkin"
  });

  // Add room state
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [addRoomForm, setAddRoomForm] = useState({
    room_name: "",
    description: "",
    price: "",
    number_of_rooms: 1,
    capacity: 2,
    is_available: true
  });
  const [addRoomImages, setAddRoomImages] = useState([]);
  const [addRoomPreviewUrls, setAddRoomPreviewUrls] = useState([]);
  const [addRoomSubmitting, setAddRoomSubmitting] = useState(false);
  const [addRoomMsg, setAddRoomMsg] = useState("");
  const [addRoomError, setAddRoomError] = useState("");
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Refresh latest rooms when staff opens accommodations tab
    if (activeTab === "accommodations") {
      loadData();
    }
  }, [activeTab]);

  useEffect(() => {
    // Build preview URLs for selected images
    if (!addRoomImages || addRoomImages.length === 0) {
      setAddRoomPreviewUrls([]);
      return;
    }
    const urls = Array.from(addRoomImages).map((f) => URL.createObjectURL(f));
    setAddRoomPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [addRoomImages]);

  async function loadData() {
    setLoading(true);
    try {
      const [resRes, roomsRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/reservations/`),
        axios.get(`${API_BASE}/api/rooms/`),
      ]);

      const reservations = resRes.status === "fulfilled" ? resRes.value.data : [];
      const roomsData = roomsRes.status === "fulfilled" ? roomsRes.value.data : [];

      const today = new Date().toISOString().slice(0, 10);
      
      // Stats - count checked-in guests properly
      const checkedInCount = reservations.filter((r) => (r.status || "").toLowerCase() === "checked-in").length;
      const pending = reservations.filter((r) => (r.status || "").toLowerCase() === "pending").length;

      // Today's check-ins and check-outs
      const todayCheckins = reservations.filter((r) => {
        const checkIn = (r.check_in || "").slice(0, 10);
        return checkIn === today && (r.status || "").toLowerCase() === "confirmed";
      });
      
      const todayCheckouts = reservations.filter((r) => {
        const checkOut = (r.check_out || "").slice(0, 10);
        return checkOut === today && (r.status || "").toLowerCase() === "confirmed";
      });

      setStats({
        checked_in: checkedInCount,
        pending_requests: pending,
        today_checkins: todayCheckins.length,
        today_checkouts: todayCheckouts.length,
      });

      // Guest list (currently checked-in) - only those with Checked-In status
      setCheckedInGuests(reservations.filter((r) => (r.status || "").toLowerCase() === "checked-in"));

      // Confirmed reservations that can be checked in
      setConfirmedReservations(reservations.filter((r) => (r.status || "").toLowerCase() === "confirmed"));

      // Today's guests (check-in or check-out today)
      const todayGuestsData = [
        ...todayCheckins.map(r => ({
          ...r,
          guestType: 'check-in',
          guestName: r.guest_name || r.name || 'Guest',
          room: r.room_type || r.rooms || r.room_name || '-',
          checkInDate: r.check_in,
          checkOutDate: r.check_out,
          status: r.status,
        })),
        ...todayCheckouts.map(r => ({
          ...r,
          guestType: 'check-out',
          guestName: r.guest_name || r.name || 'Guest',
          room: r.room_type || r.rooms || r.room_name || '-',
          checkInDate: r.check_in,
          checkOutDate: r.check_out,
          status: r.status,
        }))
      ];
      setTodaysGuests(todayGuestsData);

      // Store all reservations
      setReservations(reservations);

      // Room status
      setRooms(roomsData);

    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut(reservation) {
    if (!window.confirm(`Are you sure you want to check out ${reservation.guest_name || reservation.name}?`)) {
      return;
    }
    try {
      await axios.patch(`${API_BASE}/api/reservations/${reservation.id}/`, {
        status: "Checked-Out",
        checked_out_at: new Date().toISOString()
      });
      alert("Guest checked out successfully!");
      loadData();
    } catch (err) {
      console.error("Check-out failed:", err);
      alert("Check-out failed. Please try again.");
    }
  }

  function openCheckinModal(guest, action) {
    setSelectedGuest(guest);
    setCheckinForm({
      id_proof_type: guest.id_proof_type || "aadhar",
      id_proof_number: guest.id_proof_number || "",
      special_notes: guest.special_notes || "",
      action: action
    });
    setCheckinModalOpen(true);
  }

  async function handleCheckinSubmit(e) {
    e.preventDefault();
    if (!selectedGuest) return;

    try {
      const guestId = selectedGuest.id || selectedGuest.reservation_id;
      
      if (checkinForm.action === "checkin") {
        await axios.patch(`${API_BASE}/api/reservations/${guestId}/`, {
          status: "Checked-In",
          id_proof_type: checkinForm.id_proof_type,
          id_proof_number: checkinForm.id_proof_number,
          special_notes: checkinForm.special_notes,
          checked_in_at: new Date().toISOString()
        });
        alert("Guest checked in successfully!");
      } else {
        await axios.patch(`${API_BASE}/api/reservations/${guestId}/`, {
          status: "Checked-Out",
          id_proof_type: checkinForm.id_proof_type,
          id_proof_number: checkinForm.id_proof_number,
          special_notes: checkinForm.special_notes,
          checked_out_at: new Date().toISOString()
        });
        alert("Guest checked out successfully!");
      }
      
      setCheckinModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Check-in/out failed:", err);
      alert("Operation failed. Please try again.");
    }
  }

  // Add Room functions
  function openAddRoomModal() {
    setAddRoomForm({
      room_name: "",
      description: "",
      price: "",
      number_of_rooms: 1,
      capacity: 2,
      is_available: true
    });
    setAddRoomImages([]);
    setAddRoomPreviewUrls([]);
    setAddRoomMsg("");
    setAddRoomError("");
    setAddRoomModalOpen(true);
  }

  function handleAddRoomFiles(e) {
    const files = e.target.files;
    if (!files) return;
    setAddRoomImages(files);
  }

  async function handleAddRoom(e) {
    e.preventDefault();
    setAddRoomMsg("");
    setAddRoomError("");

    // Validate
    if (!addRoomForm.room_name || addRoomForm.room_name.trim().length === 0) {
      setAddRoomError("Room name is required.");
      return;
    }

    if (!addRoomForm.price || parseFloat(addRoomForm.price) <= 0) {
      setAddRoomError("Please enter a valid price.");
      return;
    }

    if (!addRoomForm.number_of_rooms || parseInt(addRoomForm.number_of_rooms, 10) < 1) {
      setAddRoomError("Please enter a valid number of rooms (at least 1).");
      return;
    }

    setAddRoomSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("room_name", addRoomForm.room_name);
      fd.append("description", addRoomForm.description);
      fd.append("price", addRoomForm.price);
      fd.append("number_of_rooms", addRoomForm.number_of_rooms);
      fd.append("capacity", addRoomForm.capacity);
      fd.append("is_available", addRoomForm.is_available);

      if (addRoomImages && addRoomImages.length > 0) {
        Array.from(addRoomImages).forEach((file) => {
          fd.append("images[]", file);
        });
      }

      await axios.post(`${API_BASE}/api/rooms/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAddRoomMsg("âœ… Room added successfully!");
      setTimeout(() => {
        setAddRoomModalOpen(false);
        loadData();
      }, 1500);
    } catch (err) {
      console.error(err);
      const text = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message || "Failed to add room";
      setAddRoomError("âŒ " + text);
    } finally {
      setAddRoomSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('staff_access_token');
    localStorage.removeItem('staff_refresh_token');
    localStorage.removeItem('staff_username');
    localStorage.removeItem('staff_role');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('staff_id');
    window.location.href = "/staff-admin-login";
  }

  function openManualReservationModal() {
    setManualReservationForm({
      name: "",
      email: "",
      phone: "",
      adults: 1,
      children: 0,
      check_in: "",
      check_out: "",
      room_type: rooms?.[0]?.room_name || rooms?.[0]?.name || "",
      rooms: 1,
      message: "",
      status: "Confirmed",
      payment_status: "unpaid",
      total_amount: "",
    });
    setManualReservationError("");
    setManualReservationMsg("");
    setManualReservationModalOpen(true);
  }

  function getRoomPrice(roomType) {
    if (!roomType) return 0;
    const room = rooms.find((r) => (r.room_name || r.name) === roomType);
    return Number(room?.price || 0);
  }

  function calcNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffMs = outDate - inDate;
    const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  }

  async function handleManualReservationSubmit(e) {
    e.preventDefault();
    setManualReservationError("");
    setManualReservationMsg("");

    const {
      name,
      email,
      phone,
      adults,
      children,
      check_in,
      check_out,
      room_type,
      rooms: roomCount,
      message,
      status,
      payment_status,
      total_amount,
    } = manualReservationForm;

    if (!name || !email || !phone || !check_in || !check_out || !room_type) {
      setManualReservationError("Please fill all required fields.");
      return;
    }

    const nights = calcNights(check_in, check_out);
    if (nights <= 0) {
      setManualReservationError("Check-out date must be after check-in date.");
      return;
    }

    const roomPrice = getRoomPrice(room_type);
    const autoAmount = roomPrice * Number(roomCount || 1) * nights;
    const finalAmount = Number(total_amount || autoAmount || 0);

    if (finalAmount < 0) {
      setManualReservationError("Total amount cannot be negative.");
      return;
    }

    setManualReservationSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        adults: Number(adults || 1),
        children: Number(children || 0),
        check_in,
        check_out,
        room_type,
        rooms: Number(roomCount || 1),
        message: message || "",
        status,
        payment_status,
        total_amount: finalAmount,
      };

      await axios.post(`${API_BASE}/api/reservations/`, payload);
      setManualReservationMsg("Reservation added successfully.");
      await loadData();
      setTimeout(() => {
        setManualReservationModalOpen(false);
        setManualReservationMsg("");
      }, 800);
    } catch (err) {
      console.error("Failed to add reservation:", err);
      const detail = err?.response?.data;
      setManualReservationError(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail || "Could not add reservation.")
      );
    } finally {
      setManualReservationSubmitting(false);
    }
  }

  // Helper for rendering room images
  function renderRoomImage(room) {
    const imgs = room.images ?? room.room_images ?? [];
    if (Array.isArray(imgs) && imgs.length > 0) {
      let src = imgs[0]?.url ?? imgs[0]?.image ?? imgs[0] ?? '';
      if (!src && imgs[0]?.image) {
        src = imgs[0].image.url ?? imgs[0].image.path ?? '';
      }
      if (src) {
        return src.startsWith("http") ? src : `${API_BASE}${src}`;
      }
    }
    return null;
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#181818", color: "#f1f1f1" }}>
      <style>{`
        :root{--bg-sidebar:#202020;--card:#2a2a2a;--accent:#c89d5c;--muted:#aaa}
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;cursor:pointer}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{color:var(--accent);background:rgba(200,157,92,0.15)}
        .sidebar-btn{color:var(--muted);padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;cursor:pointer;background:none;border:none;text-align:left;width:100%;font-size:14px}
        .sidebar-btn:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-btn.active{color:var(--accent);background:rgba(200,157,92,0.15)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .sidebar-logout .btn-logout:hover{background:rgba(200,157,92,0.2)}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .topbar h1{color:var(--accent)}
        .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:20px}
        .card{background:var(--card);padding:16px;border-radius:8px;text-align:center}
        .card h4{color:var(--muted);margin-bottom:8px}
        .card p{font-size:20px;color:var(--accent);font-weight:700}
        .section{display:none}
        .section.active{display:block}
        .box{background:var(--card);padding:16px;border-radius:8px;margin-bottom:16px}
        .box h3{color:var(--accent);margin-bottom:12px}
        table{width:100%;border-collapse:collapse}
        th,td{padding:10px;text-align:left;border-bottom:1px solid #444}
        th{color:var(--accent)}
        .btn-checkout{background:#c89d5c;color:#111;padding:6px 12px;border-radius:4px;border:none;cursor:pointer}
        .btn-clean{background:#4ade80;color:#111;padding:6px 12px;border-radius:4px;border:none;cursor:pointer}
        .btn-checkin{background:#3b82f6;color:#fff;padding:6px 12px;border-radius:4px;border:none;cursor:pointer;margin-right:6px}
        .btn-add{background:#10b981;color:#fff;padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:500}
        .btn-add:hover{background:#059669}
        .btn-manual{background:#0ea5e9;color:#fff;padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:500}
        .btn-manual:hover{background:#0284c7}
        .btn-logout{background:#ef4444;color:#fff;padding:6px 12px;border-radius:4px;border:none;cursor:pointer;width:100%;text-align:center}
        
        /* Modal styles */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:999}
        .modal-content{background:#2a2a2a;padding:24px;border-radius:8px;width:500px;max-width:90%;max-height:90vh;overflow-y:auto}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .modal-header h2{color:var(--accent);margin:0}
        .modal-close{background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer}
        .modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
        
        /* Form styles */
        .form-group{margin-bottom:12px}
        .form-group label{display:block;color:var(--muted);font-size:13px;margin-bottom:6px}
        .form-group input,.form-group select,.form-group textarea{width:100%;padding:10px;border-radius:6px;border:1px solid #444;background:#3e3e3e;color:#fff}
        .form-group textarea{resize:vertical;min-height:80px}
        .form-checkbox{display:flex;align-items:center;gap:8px;margin-top:8px}
        .form-checkbox input{width:auto;margin:0}
        
        /* Accommodations Grid */
        .accommodations-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;align-items:stretch}
        .room-card{background:var(--card);border-radius:12px;overflow:hidden;transition:transform 0.2s;display:flex;flex-direction:column;height:100%}
        .room-card:hover{transform:translateY(-4px)}
        .room-image{width:100%;height:200px;object-fit:cover;background:#333;flex-shrink:0}
        .room-info{padding:16px;display:flex;flex-direction:column;flex:1}
        .room-name{color:var(--accent);font-size:18px;font-weight:600;margin-bottom:8px}
        .room-desc{color:var(--muted);font-size:14px;margin-bottom:12px;line-height:1.5;flex:1}
        .room-price{color:#fff;font-size:20px;font-weight:700;margin-top:auto}
        .room-price span{font-size:14px;color:var(--muted);font-weight:400}
        .room-capacity{color:var(--muted);font-size:13px;margin-top:8px}
        
        /* Guest type badges */
        .guest-type-badge{padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600}
        .type-checkin{background:#4ade80;color:#111}
        .type-checkout{background:#f87171;color:#fff}
        .type-checkedin{background:#3b82f6;color:#fff}
        
        /* Header with button */
        .section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .section-header h3{margin:0}
        
        @media(max-width:900px){
          .cards{grid-template-columns:repeat(2,1fr)}
          .sidebar-container{display:none}
          .main-content{margin-left:0}
          .section-header{flex-direction:column;align-items:flex-start;gap:10px}
          .btn-add{width:100%}
        }
      `}</style>

      <aside className="sidebar-container">
        <h2 className="sidebar-title">Staff Portal</h2>
        <nav className="sidebar-nav">
          <button className={`sidebar-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`sidebar-btn ${activeTab === "checkin" ? "active" : ""}`} onClick={() => setActiveTab("checkin")}>Check-In/Out</button>
          <button className={`sidebar-btn ${activeTab === "bookings" ? "active" : ""}`} onClick={() => setActiveTab("bookings")}>Bookings</button>
          <button className={`sidebar-btn ${activeTab === "accommodations" ? "active" : ""}`} onClick={() => setActiveTab("accommodations")}>Accommodations</button>
        </nav>
        <div className="sidebar-logout">
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <h1>
            {activeTab === "dashboard" ? "Dashboard" : 
             activeTab === "checkin" ? "Check-In / Check-Out Management" :
             activeTab === "bookings" ? "Confirmed Bookings" :
             activeTab === "accommodations" ? "Accommodations" : 
             activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
        </div>

        {/* Dashboard Stats */}
        <div className={`section ${activeTab === "dashboard" ? "active" : ""}`}>
          <div className="cards" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="card">
              <h4>Today's Check-ins</h4>
              <p>{loading ? "..." : stats.today_checkins}</p>
            </div>
            <div className="card">
              <h4>Today's Check-outs</h4>
              <p>{loading ? "..." : stats.today_checkouts}</p>
            </div>
            <div className="card">
              <h4>Currently Checked In</h4>
              <p>{loading ? "..." : stats.checked_in}</p>
            </div>
          </div>

          {/* Today's Guests Section */}
          <div className="box">
            <h3>Today's Guests</h3>
            {loading ? (
              <p>Loading...</p>
            ) : todaysGuests.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No guests expected today.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Guest Name</th>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todaysGuests.map((g, idx) => (
                    <tr key={idx}>
                      <td>{g.guestName}</td>
                      <td>{g.room}</td>
                      <td>
                        <span className={`guest-type-badge ${g.guestType === 'check-in' ? 'type-checkin' : 'type-checkout'}`}>
                          {g.guestType === 'check-in' ? 'Check-In' : 'Check-Out'}
                        </span>
                      </td>
                      <td>{g.checkInDate || '-'}</td>
                      <td>{g.checkOutDate || '-'}</td>
                      <td>
                        {g.guestType === 'check-in' ? (
                          <button className="btn-checkin" onClick={() => openCheckinModal(g, 'checkin')}>Check In</button>
                        ) : (
                          <button className="btn-checkout" onClick={() => openCheckinModal(g, 'checkout')}>Check Out</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="box">
            <h3>Quick Actions</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => setActiveTab("checkin")} style={{ background: "var(--accent)", color: "#111", padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer" }}>Check-In / Check-Out</button>
              <button onClick={() => setActiveTab("accommodations")} style={{ background: "#60a5fa", color: "#111", padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer" }}>View Accommodations</button>
              <button onClick={openManualReservationModal} style={{ background: "#10b981", color: "#fff", padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer" }}>Add Reservation</button>
            </div>
          </div>
        </div>

        {/* Check-In / Check-Out Management */}
        <div className={`section ${activeTab === "checkin" ? "active" : ""}`}>
          <div className="box">
            <h3>Check-In / Check-Out Management</h3>
            <p style={{ color: "var(--muted)", marginBottom: "16px" }}>Manage guest check-in and check-out with ID proof and special notes</p>
          </div>
          
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              {/* Confirmed Reservations - Ready for Check-In */}
              {confirmedReservations.length > 0 && (
                <div className="box">
                  <h3>Confirmed Bookings - Ready for Check-In</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Guest Name</th>
                        <th>Room Type</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Guests</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {confirmedReservations.map((r) => (
                        <tr key={r.id}>
                          <td>{r.guest_name || r.name || "Guest"}</td>
                          <td>{r.room_type || r.rooms || r.room_name || "-"}</td>
                          <td>{r.check_in || "-"}</td>
                          <td>{r.check_out || "-"}</td>
                          <td>{r.number_of_guests || r.adults || "-"}</td>
                          <td>
                            <span style={{ padding: "4px 8px", borderRadius: 4, background: "#4ade80", color: "#111", fontSize: "12px" }}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            <button className="btn-checkin" onClick={() => openCheckinModal({...r, guestName: r.guest_name || r.name}, 'checkin')}>Check In</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Currently Checked In Guests - Ready for Check-Out */}
              <div className="box">
                <h3>Currently Checked In Guests</h3>
                {checkedInGuests.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>No guests currently checked in.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Guest Name</th>
                        <th>Room Type</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Guests</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkedInGuests.map((r) => (
                        <tr key={r.id}>
                          <td>{r.guest_name || r.name || "Guest"}</td>
                          <td>{r.room_type || r.rooms || r.room_name || "-"}</td>
                          <td>{r.check_in || "-"}</td>
                          <td>{r.check_out || "-"}</td>
                          <td>{r.number_of_guests || r.adults || "-"}</td>
                          <td>
                            <span style={{ padding: "4px 8px", borderRadius: 4, background: "#3b82f6", color: "#fff", fontSize: "12px" }}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            <button className="btn-checkout" onClick={() => handleCheckOut(r)}>Check Out</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Today's Expected Guests */}
              {todaysGuests.length > 0 && (
                <div className="box">
                  <h3>Today's Expected Guests</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Guest Name</th>
                        <th>Room</th>
                        <th>Type</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaysGuests.map((g, idx) => (
                        <tr key={idx}>
                          <td>{g.guestName}</td>
                          <td>{g.room}</td>
                          <td>
                            <span className={`guest-type-badge ${g.guestType === 'check-in' ? 'type-checkin' : 'type-checkout'}`}>
                              {g.guestType === 'check-in' ? 'Check-In' : 'Check-Out'}
                            </span>
                          </td>
                          <td>{g.checkInDate || '-'}</td>
                          <td>{g.checkOutDate || '-'}</td>
                          <td>
                            {g.guestType === 'check-in' ? (
                              <button className="btn-checkin" onClick={() => openCheckinModal(g, 'checkin')}>Check In</button>
                            ) : (
                              <button className="btn-checkout" onClick={() => handleCheckOut(g)}>Check Out</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bookings - Confirmed Reservations */}
        <div className={`section ${activeTab === "bookings" ? "active" : ""}`}>
          <div className="box">
            <div className="section-header" style={{ marginBottom: 8 }}>
              <h3>All Confirmed Bookings</h3>
              <button className="btn-manual" onClick={openManualReservationModal}>+ Add Manual Reservation</button>
            </div>
            <p style={{ color: "var(--muted)", marginBottom: "16px" }}>View details of all confirmed reservations</p>
          </div>
          
          {loading ? (
            <p>Loading...</p>
          ) : reservations.length === 0 ? (
            <div className="box">
              <p>No bookings found.</p>
            </div>
          ) : (
            <div className="box">
              <table>
                <thead>
                  <tr>
                    <th>Guest Name</th>
                    <th>Phone</th>
                    <th>Room Type</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Guests</th>
                    <th>Status</th>
                    <th>Add-ons</th>
                    <th>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations
                    .filter(r => (r.status || "").toLowerCase() === "confirmed")
                    .map((r) => (
                    <tr key={r.id}>
                      <td>{r.guest_name || r.name || "Guest"}</td>
                      <td>{r.phone || "-"}</td>
                      <td>{r.room_type || r.rooms || r.room_name || "-"}</td>
                      <td>{r.check_in || "-"}</td>
                      <td>{r.check_out || "-"}</td>
                      <td>{r.number_of_guests || r.guests || "-"}</td>
                      <td>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: r.status === "Confirmed" || r.status === "confirmed" ? "#4ade80" : 
                                     r.status === "Checked-In" || r.status === "checked-in" ? "#3b82f6" : "#c89d5c",
                          color: "#111",
                          fontSize: "12px"
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td>{formatAddons(r)}</td>
                      <td>
                        Rs.{" "}
                        {Number(
                          r.total_amount ?? r.paid_amount ?? r.amount_paid ?? r.total_price ?? r.price ?? 0
                        ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Accommodations - with Add Room option */}
        <div className={`section ${activeTab === "accommodations" ? "active" : ""}`}>
          <div className="section-header">
            <div>
              <h3>Room Details</h3>
              <p style={{ color: "var(--muted)", marginTop: "4px" }}>View all available accommodations or add new rooms</p>
            </div>
            <button className="btn-add" onClick={openAddRoomModal}>+ Add Room</button>
          </div>
          
          {loading ? (
            <p>Loading...</p>
          ) : rooms.length === 0 ? (
            <p>No rooms available.</p>
          ) : (
            <div className="accommodations-grid">
              {rooms.map((room) => {
                const imageUrl = renderRoomImage(room);
                return (
                  <div className="room-card" key={room.id}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={room.room_name || room.name} className="room-image" />
                    ) : (
                      <div className="room-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        No Image
                      </div>
                    )}
                    <div className="room-info">
                      <div className="room-name">{room.room_name || room.name || 'Room'}</div>
                      <div className="room-desc">{room.description || 'No description available.'}</div>
                      <div className="room-price">
                        Rs. {Number(room.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span>/night</span>
                      </div>
                      <div className="room-capacity">
                        Capacity: {room.capacity || 2} guests
                      </div>
                      <div className="room-capacity">
                        Total Rooms: {room.number_of_rooms || 1}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Check-In/Check-Out Modal */}
      {checkinModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{checkinForm.action === 'checkin' ? 'Check In' : 'Check Out'} Guest</h2>
              <button className="modal-close" onClick={() => setCheckinModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleCheckinSubmit}>
              <div className="form-group">
                <label>Guest Name</label>
                <input type="text" value={selectedGuest?.guestName || ''} disabled style={{ opacity: 0.7 }} />
              </div>
              
              <div className="form-group">
                <label>Room</label>
                <input type="text" value={selectedGuest?.room || ''} disabled style={{ opacity: 0.7 }} />
              </div>

              <div className="form-group">
                <label>ID Proof Type</label>
                <select 
                  value={checkinForm.id_proof_type} 
                  onChange={(e) => setCheckinForm({...checkinForm, id_proof_type: e.target.value})}
                >
                  <option value="aadhar">Aadhar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                  <option value="voter_id">Voter ID</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>ID Proof Number</label>
                <input 
                  type="text" 
                  value={checkinForm.id_proof_number} 
                  onChange={(e) => setCheckinForm({...checkinForm, id_proof_number: e.target.value})}
                  placeholder="Enter ID proof number"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Special Notes</label>
                <textarea 
                  value={checkinForm.special_notes} 
                  onChange={(e) => setCheckinForm({...checkinForm, special_notes: e.target.value})}
                  placeholder="Any special requests, preferences, or notes about the guest..."
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setCheckinModalOpen(false)} 
                  style={{ padding: "10px 16px", borderRadius: "6px", background: "#374151", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: "10px 16px", borderRadius: "6px", background: checkinForm.action === 'checkin' ? '#4ade80' : '#c89d5c', color: "#111", border: "none", cursor: "pointer", fontWeight: "600" }}
                >
                  {checkinForm.action === 'checkin' ? 'Check In Guest' : 'Check Out Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {manualReservationModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Manual Reservation</h2>
              <button className="modal-close" onClick={() => setManualReservationModalOpen(false)}>X</button>
            </div>

            <form onSubmit={handleManualReservationSubmit}>
              <div className="form-group">
                <label>Guest Name *</label>
                <input
                  type="text"
                  value={manualReservationForm.name}
                  onChange={(e) => setManualReservationForm({ ...manualReservationForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={manualReservationForm.email}
                  onChange={(e) => setManualReservationForm({ ...manualReservationForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="text"
                  value={manualReservationForm.phone}
                  onChange={(e) => setManualReservationForm({ ...manualReservationForm, phone: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group">
                  <label>Check-In *</label>
                  <input
                    type="date"
                    value={manualReservationForm.check_in}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, check_in: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Check-Out *</label>
                  <input
                    type="date"
                    value={manualReservationForm.check_out}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, check_out: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group">
                  <label>Room Type *</label>
                  <select
                    value={manualReservationForm.room_type}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, room_type: e.target.value })}
                    required
                  >
                    <option value="">Select room</option>
                    {rooms.map((r) => {
                      const roomName = r.room_name || r.name || "";
                      return (
                        <option key={r.id || roomName} value={roomName}>
                          {roomName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Rooms *</label>
                  <input
                    type="number"
                    min="1"
                    value={manualReservationForm.rooms}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, rooms: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group">
                  <label>Adults *</label>
                  <input
                    type="number"
                    min="1"
                    value={manualReservationForm.adults}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, adults: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Children</label>
                  <input
                    type="number"
                    min="0"
                    value={manualReservationForm.children}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, children: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={manualReservationForm.status}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    value={manualReservationForm.payment_status}
                    onChange={(e) => setManualReservationForm({ ...manualReservationForm, payment_status: e.target.value })}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Total Amount (leave empty to auto-calculate)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualReservationForm.total_amount}
                  onChange={(e) => setManualReservationForm({ ...manualReservationForm, total_amount: e.target.value })}
                  placeholder="Auto from room price x rooms x nights"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={manualReservationForm.message}
                  onChange={(e) => setManualReservationForm({ ...manualReservationForm, message: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>

              {manualReservationError && <div style={{ color: "#ff7676", marginTop: 10 }}>{manualReservationError}</div>}
              {manualReservationMsg && <div style={{ color: "#9ef59e", marginTop: 10 }}>{manualReservationMsg}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setManualReservationModalOpen(false)}
                  style={{ padding: "10px 16px", borderRadius: "6px", background: "#374151", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualReservationSubmitting}
                  style={{ padding: "10px 16px", borderRadius: "6px", background: "#0ea5e9", color: "#fff", border: "none", cursor: manualReservationSubmitting ? "not-allowed" : "pointer", fontWeight: "600", opacity: manualReservationSubmitting ? 0.6 : 1 }}
                >
                  {manualReservationSubmitting ? "Saving..." : "Create Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addRoomModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Room</h2>
              <button className="modal-close" onClick={() => setAddRoomModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddRoom}>
              <div className="form-group">
                <label>Room Name *</label>
                <input 
                  type="text" 
                  value={addRoomForm.room_name} 
                  onChange={(e) => setAddRoomForm({...addRoomForm, room_name: e.target.value})}
                  placeholder="e.g., Deluxe Tent, Forest Suite"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={addRoomForm.description} 
                  onChange={(e) => setAddRoomForm({...addRoomForm, description: e.target.value})}
                  placeholder="Describe the room amenities, view, etc."
                />
              </div>

              <div className="form-group">
                <label>Price per Night (?) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={addRoomForm.price} 
                  onChange={(e) => setAddRoomForm({...addRoomForm, price: e.target.value})}
                  placeholder="e.g., 5000"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Number of Rooms *</label>
                <input 
                  type="number" 
                  min="1"
                  value={addRoomForm.number_of_rooms}
                  onChange={(e) => setAddRoomForm({...addRoomForm, number_of_rooms: parseInt(e.target.value, 10) || 1})}
                />
              </div>

              <div className="form-group">
                <label>Capacity (number of guests)</label>
                <input 
                  type="number" 
                  min="1"
                  value={addRoomForm.capacity} 
                  onChange={(e) => setAddRoomForm({...addRoomForm, capacity: parseInt(e.target.value) || 2})}
                />
              </div>

              <div className="form-group">
                <label>Room Images</label>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleAddRoomFiles}
                />
                {addRoomPreviewUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {addRoomPreviewUrls.map((url, idx) => (
                      <img 
                        key={idx} 
                        src={url} 
                        alt={`Preview ${idx}`} 
                        style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="form-checkbox">
                <input 
                  type="checkbox" 
                  id="is_available"
                  checked={addRoomForm.is_available} 
                  onChange={(e) => setAddRoomForm({...addRoomForm, is_available: e.target.checked})}
                />
                <label htmlFor="is_available" style={{ marginBottom: 0 }}>Room is available for booking</label>
              </div>

              {addRoomError && <div style={{ color: "#ff7676", marginTop: "10px" }}>{addRoomError}</div>}
              {addRoomMsg && <div style={{ color: "#9ef59e", marginTop: "10px" }}>{addRoomMsg}</div>}

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setAddRoomModalOpen(false)} 
                  style={{ padding: "10px 16px", borderRadius: "6px", background: "#374151", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addRoomSubmitting}
                  style={{ padding: "10px 16px", borderRadius: "6px", background: "#10b981", color: "#fff", border: "none", cursor: addRoomSubmitting ? "not-allowed" : "pointer", fontWeight: "600", opacity: addRoomSubmitting ? 0.6 : 1 }}
                >
                  {addRoomSubmitting ? 'Adding...' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


