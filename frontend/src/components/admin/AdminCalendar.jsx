// src/components/admin/AdminCalendar.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminCalendar() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selected room and prices
  const [selectedRoom, setSelectedRoom] = useState("");
  const [roomPrices, setRoomPrices] = useState({});
  const [savingPrice, setSavingPrice] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [priceModal, setPriceModal] = useState({ open: false, date: "", price: "", isSpecial: false, isClosed: false });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchRoomPrices();
    }
  }, [selectedRoom, currentMonth, currentYear]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [resRes, roomsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/reservations/`),
        axios.get(`${API_BASE}/api/rooms/`),
      ]);
      setReservations(Array.isArray(resRes.data) ? resRes.data : resRes.data.results || []);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : roomsRes.data.results || []);
      
      // Set default selected room
      if (roomsRes.data && roomsRes.data.length > 0) {
        setSelectedRoom(roomsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoomPrices() {
    if (!selectedRoom) return;
    
    try {
      const res = await axios.get(
        `${API_BASE}/api/admin/rooms/${selectedRoom}/prices/?year=${currentYear}&month=${currentMonth + 1}`
      );
      
      // Convert array to object with date as key
      const priceMap = {};
      res.data.forEach((p) => {
        priceMap[p.date] = p;
      });
      setRoomPrices(priceMap);
    } catch (err) {
      console.error("Failed to fetch room prices:", err);
    }
  }

  async function saveRoomPrice() {
    if (!selectedRoom || !priceModal.date || (!priceModal.price && !priceModal.isClosed)) return;
    
    setSavingPrice(true);
    try {
      await axios.post(
        `${API_BASE}/api/admin/rooms/${selectedRoom}/prices/`,
        {
          date: priceModal.date,
          price: priceModal.price,
          is_special: priceModal.isSpecial,
          is_closed: priceModal.isClosed,
        }
      );
      
      // Refresh prices
      await fetchRoomPrices();
      setPriceModal({ open: false, date: "", price: "", isSpecial: false, isClosed: false });
      alert("Price saved successfully!");
    } catch (err) {
      console.error("Failed to save price:", err);
      alert("Failed to save price");
    } finally {
      setSavingPrice(false);
    }
  }

  async function deleteRoomPrice(priceId) {
    if (!window.confirm("Remove custom price for this date?")) return;
    
    try {
      await axios.delete(`${API_BASE}/api/admin/prices/${priceId}/`);
      await fetchRoomPrices();
      alert("Price removed!");
    } catch (err) {
      console.error("Failed to delete price:", err);
      alert("Failed to remove price");
    }
  }

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({ day, date });
    }

    return days;
  };

  // Get reservations for a specific date
  const getReservationsForDate = (dateStr) => {
    if (!selectedRoom) return reservations.filter((r) => {
      const checkIn = r.check_in;
      const checkOut = r.check_out;
      return checkIn <= dateStr && checkOut >= dateStr;
    });
    
    // Filter by selected room
    return reservations.filter((r) => {
      const checkIn = r.check_in;
      const checkOut = r.check_out;
      return checkIn <= dateStr && checkOut >= dateStr && r.room_type === getSelectedRoomName();
    });
  };

  const getSelectedRoomName = () => {
    const room = rooms.find((r) => r.id === parseInt(selectedRoom));
    return room ? room.room_name : "";
  };

  const getSelectedRoomPrice = () => {
    const room = rooms.find((r) => r.id === parseInt(selectedRoom));
    return room ? Number(room.price) : 0;
  };

  // Navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayReservations = getReservationsForDate(todayStr);
  const confirmedCount = reservations.filter((r) => r.status === "Confirmed").length;

  const calendarDays = generateCalendarDays();

  const handleDateClick = (dateStr) => {
    const existingPrice = roomPrices[dateStr];
    const basePrice = getSelectedRoomPrice();
    
    setPriceModal({
      open: true,
      date: dateStr,
      price: existingPrice ? existingPrice.price : basePrice,
      isSpecial: existingPrice ? existingPrice.is_special : false,
      isClosed: existingPrice ? !!existingPrice.is_closed : false,
      existingId: existingPrice ? existingPrice.id : null,
    });
  };

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
        .page{display:flex;min-height:100vh;background:var(--bg-dark);color:var(--text-light)}
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;display:block}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{background:rgba(200,157,92,0.15);color:var(--accent)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        h1{color:var(--accent);margin-bottom:16px}
        
        /* Controls */
        .controls-row{display:flex;gap:16px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
        .room-select{padding:10px 14px;border-radius:6px;border:1px solid #333;background:#1e1e1e;color:#fff;font-size:14px;min-width:200px;cursor:pointer}
        .room-select:focus{outline:none;border-color:var(--accent)}
        
        /* Calendar Header */
        .calendar-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px}
        .calendar-nav{display:flex;align-items:center;gap:12px}
        .calendar-nav button{background:transparent;border:1px solid #333;color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer;transition:all 0.2s}
        .calendar-nav button:hover{border-color:var(--accent);color:var(--accent)}
        .calendar-title{font-size:24px;font-weight:600;color:var(--accent)}
        .btn-today{background:var(--accent) !important;color:#111 !important;border:none !important;font-weight:600}
        
        /* Stats */
        .stats-row{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
        .stat-card{background:var(--card-bg);padding:16px 20px;border-radius:12px;flex:1;min-width:150px}
        .stat-card h3{color:var(--text-muted);margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
        .stat-card p{color:var(--accent);font-size:22px;font-weight:700;margin:0}
        
        /* Calendar Grid */
        .calendar-container{background:var(--card-bg);border-radius:12px;overflow:hidden}
        .calendar-weekdays{display:grid;grid-template-columns:repeat(7,1fr);background:#252525}
        .calendar-weekdays th{padding:14px;text-align:center;color:var(--accent);font-weight:600;font-size:12px;text-transform:uppercase}
        .calendar-grid{display:grid;grid-template-columns:repeat(7,1fr)}
        .calendar-day{padding:8px;min-height:110px;border:1px solid #333;border-top:none;border-left:none;text-align:left;vertical-align:top;cursor:pointer;transition:background 0.2s}
        .calendar-day:nth-child(7n){border-right:none}
        .calendar-day:hover{background:#2d2d2d}
        .calendar-day.other-month{background:#1a1a1a;cursor:default}
        .calendar-day.other-month .day-number{color:var(--text-muted)}
        .calendar-day.today{background:rgba(200,157,92,0.1)}
        .day-number{font-size:14px;font-weight:500;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
        .day-number .price{font-size:11px;color:var(--text-muted)}
        .day-number .price.special{color:#ff9800;font-weight:600}
        .day-number .price.closed{color:#ef4444;font-weight:700}
        .calendar-day.closed-day{background:rgba(239,68,68,0.08)}
        
        .day-events{display:flex;flex-direction:column;gap:2px}
        .event-chip{padding:3px 6px;border-radius:4px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .event-chip.confirmed{background:rgba(76,175,80,0.2);color:#4caf50;border-left:2px solid #4caf50}
        .event-chip.pending{background:rgba(230,195,77,0.2);color:#e6c34d;border-left:2px solid #e6c34d}
        
        /* Modal */
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:60}
        .modal{background:#1a1a1a;padding:24px;border-radius:12px;max-width:420px;width:94%;color:var(--text-light);box-shadow:0 8px 30px rgba(0,0,0,0.6)}
        .modal h3{margin:0 0 20px;color:var(--accent);font-size:20px}
        .modal-close{float:right;background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer}
        .modal-close:hover{color:var(--accent)}
        
        .form-group{margin-bottom:16px}
        .form-group label{display:block;margin-bottom:6px;color:var(--text-muted);font-size:13px}
        .form-group input{width:100%;padding:12px;border-radius:6px;border:1px solid #333;background:#252525;color:#fff;font-size:14px}
        .form-group input:focus{outline:none;border-color:var(--accent)}
        .form-group .checkbox-label{display:flex;align-items:center;gap:8px;cursor:pointer}
        .form-group .checkbox-label input{width:auto}
        
        .modal-actions{display:flex;gap:10px;margin-top:20px}
        .btn{padding:10px 20px;border-radius:6px;border:none;cursor:pointer;font-size:14px;transition:all 0.2s}
        .btn-primary{background:var(--accent);color:#111;font-weight:600}
        .btn-primary:hover{opacity:0.9}
        .btn-primary:disabled{opacity:0.6;cursor:not-allowed}
        .btn-secondary{background:#333;color:#fff}
        .btn-secondary:hover{background:#444}
        .btn-danger{background:#e53935;color:#fff}
        
        .base-price-info{margin-bottom:16px;padding:12px;background:#252525;border-radius:6px;font-size:13px}
        
        .loading{text-align:center;padding:40px;color:var(--text-muted)}
        .error{text-align:center;padding:40px;color:#e53935}
        
        @media (max-width:900px){
          .sidebar-container{display:none}
          .main-content{padding:16px;margin-left:0}
          .calendar-day{min-height:70px;padding:4px}
          .event-chip{display:none}
          .day-number{flex-direction:column;gap:2px}
        }
      `}</style>

      <div className="page">
        <aside className="sidebar-container">
          <h2 className="sidebar-title">Admin</h2>
          <nav className="sidebar-nav">
            <a href="/admin" className="sidebar-link">Dashboard</a>
            <a href="/admin/reservations" className="sidebar-link">Reservations</a>
            <a href="/admin/rooms" className="sidebar-link">Rooms</a>
            <a href="/admin/customers" className="sidebar-link">Customers</a>
            <a href="/admin/calendar" className="sidebar-link active">Calendar</a>
            <a href="/admin/staff" className="sidebar-link">Staff</a>
            <a href="/admin/gallery" className="sidebar-link">Gallery</a>
            <a href="/admin/reviews" className="sidebar-link">Reviews</a>
          </nav>
          <div className="sidebar-logout">
            <a href="/login" className="sidebar-link">Logout</a>
          </div>
        </aside>

        <main className="main-content">
          <h1>Price Calendar</h1>

          {/* Room Selection */}
          <div className="controls-row">
            <select
              className="room-select"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="">Select a Room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_name} - ₹{Number(room.price).toLocaleString()}/night
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <h3>Today's Check-ins</h3>
              <p>{todayReservations.length}</p>
            </div>
            <div className="stat-card">
              <h3>Confirmed Bookings</h3>
              <p>{confirmedCount}</p>
            </div>
            <div className="stat-card">
              <h3>Base Price</h3>
              <p>₹{getSelectedRoomPrice().toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>Custom Prices</h3>
              <p>{Object.keys(roomPrices).length}</p>
            </div>
          </div>

          {/* Calendar Header */}
          <div className="calendar-header">
            <div className="calendar-nav">
              <button onClick={prevMonth}>&lt; Prev</button>
              <span className="calendar-title">{monthNames[currentMonth]} {currentYear}</span>
              <button onClick={nextMonth}>Next &gt;</button>
            </div>
            <button className="calendar-nav btn btn-today" onClick={goToToday}>Today</button>
          </div>

          {/* Calendar */}
          {loading ? (
            <div className="loading">Loading...</div>
          ) : !selectedRoom ? (
            <div className="error">Please select a room to view the calendar</div>
          ) : (
            <div className="calendar-container">
              <div className="calendar-weekdays">
                {weekDays.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </div>
              <div className="calendar-grid">
                {calendarDays.map((item, index) => {
                  if (!item.day) {
                    return <div key={`empty-${index}`} className="calendar-day other-month"></div>;
                  }

                  const isToday = item.date === todayStr;
                  const dayReservations = getReservationsForDate(item.date);
                  const customPrice = roomPrices[item.date];
                  const isClosedDay = !!customPrice?.is_closed;
                  const displayPrice = customPrice ? customPrice.price : getSelectedRoomPrice();

                  return (
                    <div
                      key={item.date}
                      className={`calendar-day ${isToday ? "today" : ""} ${isClosedDay ? "closed-day" : ""}`}
                      onClick={() => handleDateClick(item.date)}
                    >
                      <div className="day-number">
                        <span>{item.day}</span>
                        {isClosedDay ? (
                          <span className="price closed">Closed</span>
                        ) : customPrice ? (
                          <span className="price special">₹{Number(displayPrice).toLocaleString()}</span>
                        ) : (
                          <span className="price">₹{Number(displayPrice).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="day-events">
                        {dayReservations.slice(0, 2).map((r) => (
                          <div
                            key={r.id}
                            className={`event-chip ${(r.status || "").toLowerCase()}`}
                          >
                            {r.name}
                          </div>
                        ))}
                        {dayReservations.length > 2 && (
                          <div className="event-chip" style={{ background: "#333", color: "#aaa" }}>
                            +{dayReservations.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Price Update Modal */}
      {priceModal.open && (
        <div className="modal-backdrop" onClick={() => setPriceModal({ open: false, date: "", price: "", isSpecial: false, isClosed: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close" 
              onClick={() => setPriceModal({ open: false, date: "", price: "", isSpecial: false, isClosed: false })}
            >
              ×
            </button>
            <h3>Update Price</h3>
            
            <div className="base-price-info">
              <strong>Selected Date:</strong> {priceModal.date}<br />
              <strong>Base Price:</strong> ₹{getSelectedRoomPrice().toLocaleString()}/night
            </div>

            <div className="form-group">
              <label>Price (₹)</label>
              <input
                type="number"
                value={priceModal.price}
                onChange={(e) => setPriceModal({ ...priceModal, price: e.target.value })}
                placeholder="Enter price"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={priceModal.isSpecial}
                  onChange={(e) => setPriceModal({ ...priceModal, isSpecial: e.target.checked })}
                />
                Mark as Special/Peak Price
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={priceModal.isClosed}
                  onChange={(e) => setPriceModal({ ...priceModal, isClosed: e.target.checked })}
                />
                Close bookings for this date
              </label>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary" 
                onClick={saveRoomPrice}
                disabled={savingPrice || (!priceModal.price && !priceModal.isClosed)}
              >
                {savingPrice ? "Saving..." : "Save Price"}
              </button>
              {priceModal.existingId && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => {
                    deleteRoomPrice(priceModal.existingId);
                    setPriceModal({ open: false, date: "", price: "", isSpecial: false, isClosed: false });
                  }}
                >
                  Remove Custom Price
                </button>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => setPriceModal({ open: false, date: "", price: "", isSpecial: false, isClosed: false })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


