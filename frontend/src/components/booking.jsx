import React, { useEffect, useRef, useState } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import "../styles/booking.css";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function Reservation() {
  const navigate = useNavigate();
  const token = localStorage.getItem("customer_access_token");
  const role = localStorage.getItem("customer_role");
  const customerEmail = localStorage.getItem("customer_email") || "";

  useEffect(() => {
    // Reservation page is for customer sessions only
    if (!token || role !== "customer") {
      navigate("/login");
    }
  }, [token, role, navigate]);

  const [rooms, setRooms] = useState([]);
  const [reservationsData, setReservationsData] = useState([]);
  const [customPricesByDate, setCustomPricesByDate] = useState({});
  const [closedDates, setClosedDates] = useState(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const dateInputRef = useRef(null);
  const fpRef = useRef(null);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  const [adults, setAdults] = useState(1);
  const [numRooms, setNumRooms] = useState(1);
  const [skipAddons, setSkipAddons] = useState(false);
  const addonOptions = [
    {
      id: "campfire",
      name: "Campfire Setup",
      description: "Private evening campfire with cozy seating.",
      price: 1500,
      image: "/assets/addons/campfire.jpg",
    },
    {
      id: "roomDecoration",
      name: "Room Decoration",
      description: "Romantic floral and balloon room decoration.",
      price: 2500,
      image: "/assets/addons/room-decoration.jpg",
    },
    {
      id: "candleLightDinner",
      name: "Candle Light Dinner",
      description: "Curated dinner setup under warm ambient lights.",
      price: 3500,
      image: "/assets/addons/candle-light-dinner.jpg",
    },
  ];
  const [selectedAddons, setSelectedAddons] = useState({});
  const [form, setForm] = useState({
    reservation_dates: "",
    room_type: "",
    name: "",
    email: customerEmail,
    phone: "",
    message: "",
  });

  useEffect(() => {
    if (customerEmail) {
      setForm((prev) => ({ ...prev, email: customerEmail }));
    }
  }, [customerEmail]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const rRes = await fetch(`${API_BASE}/api/rooms/`);
        const rJson = rRes.ok ? await rRes.json() : [];

        const roomsNormalized = Array.isArray(rJson)
          ? rJson.map((r) => ({
              room_id: r.id ?? r.room_id ?? "",
              room_name: r.room_name ?? r.name ?? `Room ${r.id ?? ""}`,
              price: r.price ?? r.rate ?? 0,
              number_of_rooms: Number(r.number_of_rooms || 1),
              capacity: Number(r.capacity || r.guests || r.max_guests || 1),
              image:
                r.images && Array.isArray(r.images) && r.images.length > 0
                  ? (r.images[0].image.startsWith("http") 
                      ? r.images[0].image 
                      : `${API_BASE}${r.images[0].image}`)
                  : r.image && typeof r.image === "string"
                    ? (r.image.startsWith("http") ? r.image : `${API_BASE}${r.image}`)
                    : "/assets/uploads/glamp1.jpg",
              raw: r,
            }))
          : [];

        const rvRes = await fetch(`${API_BASE}/api/reservations/`);
        const rvJson = rvRes.ok ? await rvRes.json() : [];

        if (!mounted) return;
        setRooms(roomsNormalized);
        setReservationsData(Array.isArray(rvJson) ? rvJson : []);

        if (roomsNormalized.length > 0 && !selectedRoom) {
          setSelectedRoom(roomsNormalized[0]);
          setForm((f) => ({ ...f, room_type: roomsNormalized[0].room_name }));
        }
      } catch (err) {
        console.error("Failed to load rooms/reservations:", err);
        setErrorMsg("Failed to load data from server.");
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const maxRooms = Number(selectedRoom?.number_of_rooms || 1);
    setNumRooms((prev) => Math.min(Math.max(1, prev), maxRooms));
  }, [selectedRoom]);

  useEffect(() => {
    const maxAdults = Number(selectedRoom?.capacity || 1);
    setAdults((prev) => Math.min(Math.max(1, prev), maxAdults));
  }, [selectedRoom]);

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseIsoDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function getReservationRoomName(reservation) {
    return String(
      reservation?.room_type ??
        reservation?.room_name ??
        reservation?.room ??
        ""
    )
      .trim()
      .toLowerCase();
  }

  function getReservationDateRange(reservation) {
    const checkin = parseIsoDate(reservation?.checkin ?? reservation?.check_in);
    const checkout = parseIsoDate(reservation?.checkout ?? reservation?.check_out);
    if (!checkin || !checkout || checkout <= checkin) return null;
    return { checkin, checkout };
  }

  function getBookedRoomsCount(reservation) {
    const value =
      reservation?.rooms ??
      reservation?.number_of_rooms ??
      reservation?.room_count ??
      1;
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? count : 1;
  }

  function buildBookedPerDate(reservations, roomName) {
    const bookedPerDate = {};
    const normalizedRoomName = String(roomName || "").trim().toLowerCase();

    (Array.isArray(reservations) ? reservations : [])
      .filter((it) => {
        const status = String(it?.status || "").toLowerCase();
        if (status === "cancelled" || status === "canceled") return false;
        return normalizedRoomName
          ? getReservationRoomName(it) === normalizedRoomName
          : false;
      })
      .forEach((it) => {
        const range = getReservationDateRange(it);
        if (!range) return;
        const bookedRooms = getBookedRoomsCount(it);
        const cursor = new Date(range.checkin);
        while (cursor < range.checkout) {
          const key = toDateKey(cursor);
          bookedPerDate[key] = (bookedPerDate[key] || 0) + bookedRooms;
          cursor.setDate(cursor.getDate() + 1);
        }
      });

    return bookedPerDate;
  }

  useEffect(() => {
    const el = dateInputRef.current;
    if (!el) return;

    if (fpRef.current) fpRef.current.destroy();

    const selectedRoomName = selectedRoom?.room_name || selectedRoom?.name || "";
    const totalRoomInventory = Number(selectedRoom?.number_of_rooms || 1);
    const requestedRooms = Number(numRooms || 1);
    const bookedPerDate = buildBookedPerDate(reservationsData, selectedRoomName);

    const unavailableDates = new Set(
      Object.entries(bookedPerDate)
        .filter(([, used]) => Number(used) + requestedRooms > totalRoomInventory)
        .map(([date]) => date)
    );

    fpRef.current = flatpickr(el, {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      disable: [
        (date) => {
          const key = toDateKey(date);
          return unavailableDates.has(key) || closedDates.has(key);
        },
      ],
      onClose: (_, dateStr) =>
        setForm((f) => ({ ...f, reservation_dates: dateStr })),
    });

    return () => fpRef.current?.destroy();
  }, [selectedRoom, numRooms, reservationsData, closedDates]);

  useEffect(() => {
    let active = true;

    async function fetchClosedDates() {
      if (!selectedRoom?.room_id) {
        setClosedDates(new Set());
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/admin/rooms/${selectedRoom.room_id}/prices/`);
        const data = res.ok ? await res.json() : [];
        const closed = new Set(
          (Array.isArray(data) ? data : [])
            .filter((p) => !!p?.is_closed && p?.date)
            .map((p) => String(p.date).slice(0, 10))
        );
        if (active) setClosedDates(closed);
      } catch (err) {
        console.error("Failed to fetch closed room dates:", err);
        if (active) setClosedDates(new Set());
      }
    }

    fetchClosedDates();
    return () => {
      active = false;
    };
  }, [selectedRoom?.room_id]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const toggleAddon = (addonId) => {
    setSkipAddons(false);
    setSelectedAddons((prev) => ({
      ...prev,
      [addonId]: !prev[addonId],
    }));
  };

  const handleSkipAddons = () => {
    setSkipAddons(true);
    setSelectedAddons({});
  };

  const getSelectedAddons = () =>
    addonOptions.filter((addon) => selectedAddons[addon.id]);

  const calculateAddonsTotal = () =>
    getSelectedAddons().reduce((sum, addon) => sum + Number(addon.price || 0), 0);

  function parseDateStringToLocal(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    let active = true;

    async function fetchCustomPricesForSelection() {
      if (!selectedRoom?.room_id || !form.reservation_dates) {
        setCustomPricesByDate({});
        return;
      }

      const dates = form.reservation_dates.split(" to ");
      if (dates.length < 2) {
        setCustomPricesByDate({});
        return;
      }

      const checkIn = parseDateStringToLocal(dates[0]);
      const checkOut = parseDateStringToLocal(dates[1]);
      if (!checkIn || !checkOut || checkOut <= checkIn) {
        setCustomPricesByDate({});
        return;
      }

      const monthKeys = new Set();
      const cursor = new Date(checkIn);
      while (cursor < checkOut) {
        monthKeys.add(`${cursor.getFullYear()}-${cursor.getMonth() + 1}`);
        cursor.setDate(cursor.getDate() + 1);
      }

      try {
        const reqs = Array.from(monthKeys).map((key) => {
          const [year, month] = key.split("-");
          return fetch(
            `${API_BASE}/api/admin/rooms/${selectedRoom.room_id}/prices/?year=${year}&month=${month}`
          );
        });

        const responses = await Promise.all(reqs);
        const jsonList = await Promise.all(
          responses.map(async (res) => (res.ok ? res.json() : []))
        );

        const priceMap = {};
        jsonList.forEach((items) => {
          if (!Array.isArray(items)) return;
          items.forEach((item) => {
            if (!item?.date) return;
            priceMap[item.date] = Number(item.price || 0);
          });
        });

        if (active) {
          setCustomPricesByDate(priceMap);
        }
      } catch (err) {
        console.error("Failed to fetch custom room prices for selected dates:", err);
        if (active) {
          setCustomPricesByDate({});
        }
      }
    }

    fetchCustomPricesForSelection();

    return () => {
      active = false;
    };
  }, [selectedRoom?.room_id, form.reservation_dates]);

  // Calculate room amount based on selected room and dates
  const calculateRoomTotal = () => {
    if (!selectedRoom || !form.reservation_dates) return 0;
    const dates = form.reservation_dates.split(" to ");
    if (dates.length < 2) return 0;
    const checkIn = parseDateStringToLocal(dates[0]);
    const checkOut = parseDateStringToLocal(dates[1]);
    if (!checkIn || !checkOut || checkOut <= checkIn) return 0;

    let perRoomTotal = 0;
    const cursor = new Date(checkIn);

    while (cursor < checkOut) {
      const key = formatDateKey(cursor);
      const dayPrice = customPricesByDate[key] ?? Number(selectedRoom.price || 0);
      perRoomTotal += Number(dayPrice || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return perRoomTotal * numRooms;
  };

  const calculateTotal = () => calculateRoomTotal() + calculateAddonsTotal();
  const maxAdultsAllowed = Number(selectedRoom?.capacity || 1);

  // Initialize Razorpay payment
  const initiatePayment = async () => {
    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      setErrorMsg("Please select valid dates to calculate the total amount.");
      return;
    }

    try {
      // Get order from backend
      const orderRes = await fetch(`${API_BASE}/api/payment/create-order/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: totalAmount }),
      });

      if (!orderRes.ok) {
        throw new Error("Failed to create payment order");
      }

      const orderData = await orderRes.json();

      // Open Razorpay checkout using script
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Eden's Glamp Resort",
        description: "Room Booking Payment",
        order_id: orderData.order_id,
        handler: async (response) => {
          // Payment successful, verify with backend
          await verifyPayment(response, totalAmount);
        },
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        theme: {
          color: "#528ff5",
        },
      };

      // Dynamically load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load Razorpay"));
        });
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setErrorMsg("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMsg(err.message || "Payment failed. Please try again.");
    }
  };

  // Verify payment and create reservation
  const verifyPayment = async (paymentResponse, totalAmount) => {
    const dates = form.reservation_dates.split(" to ");
    const check_in = dates[0];
    const check_out = dates[1];
    const selectedAddonNames = getSelectedAddons().map((addon) => addon.name);
    const addonNote =
      selectedAddonNames.length > 0
        ? `Add-ons: ${selectedAddonNames.join(", ")}`
        : "Add-ons: Skipped";

    try {
      console.log("Verifying payment with data:", {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });

      const verifyRes = await fetch(`${API_BASE}/api/payment/verify/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          reservation: {
            name: form.name,
            email: customerEmail || form.email,
            phone: form.phone,
            adults,
            children: 0,
            check_in,
            check_out,
            message: [form.message, addonNote].filter(Boolean).join("\n"),
            room_type: selectedRoom?.room_name || "",
            rooms: numRooms,
            total_amount: totalAmount,
          },
        }),
      });

      console.log("Verify response status:", verifyRes.status);
      const responseText = await verifyRes.text();
      console.log("Verify response text:", responseText);

      if (!verifyRes.ok) {
        throw new Error(responseText || "Failed to verify payment");
      }

      const result = JSON.parse(responseText);
      alert("Payment successful! Your reservation has been confirmed.");
      navigate(`/payment/success?reservation_id=${result.reservation?.id}`);
    } catch (err) {
      console.error("Verification error:", err);
      setErrorMsg(err.message || "Payment verification failed. Please contact support.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const dates = form.reservation_dates.split(" to ");
    const check_in = dates[0];
    const check_out = dates[1];

    // Validate dates
    if (!check_in || !check_out) {
      setErrorMsg("Please select check-in and check-out dates.");
      return;
    }

    // Validate check-out is after check-in
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    if (checkOutDate <= checkInDate) {
      setErrorMsg("Check-out date must be after check-in date.");
      return;
    }

    // Validate required fields
    if (!form.name || !(customerEmail || form.email) || !form.phone) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    // Validate name (at least 2 characters)
    if (form.name.trim().length < 2) {
      setErrorMsg("Please enter a valid name (at least 2 characters).");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail || form.email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    // Validate phone (at least 10 digits)
    const phoneRegex = /^\d{10,}$/;
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!phoneRegex.test(phoneDigits)) {
      setErrorMsg("Please enter a valid phone number (at least 10 digits).");
      return;
    }

    // Validate adults
    if (!adults || adults < 1) {
      setErrorMsg("At least 1 adult is required.");
      return;
    }
    if (adults > maxAdultsAllowed) {
      setErrorMsg(`Maximum ${maxAdultsAllowed} adult(s) allowed for the selected room.`);
      return;
    }

    // Validate room selection
    if (!selectedRoom) {
      setErrorMsg("Please select a room.");
      return;
    }

    // Validate room inventory against latest reservations to prevent overbooking
    try {
      const latestRes = await fetch(`${API_BASE}/api/reservations/`);
      const latestReservations = latestRes.ok ? await latestRes.json() : [];
      const latestPricesRes = await fetch(`${API_BASE}/api/admin/rooms/${selectedRoom.room_id}/prices/`);
      const latestPrices = latestPricesRes.ok ? await latestPricesRes.json() : [];
      const latestClosedDates = new Set(
        (Array.isArray(latestPrices) ? latestPrices : [])
          .filter((p) => !!p?.is_closed && p?.date)
          .map((p) => String(p.date).slice(0, 10))
      );
      const selectedRoomName = selectedRoom?.room_name || selectedRoom?.name || "";
      const totalRoomInventory = Number(selectedRoom?.number_of_rooms || 1);
      const requestedRooms = Number(numRooms || 1);
      const bookedPerDate = buildBookedPerDate(latestReservations, selectedRoomName);

      const cursor = parseIsoDate(check_in);
      const checkout = parseIsoDate(check_out);
      let soldOutDate = "";
      while (cursor && checkout && cursor < checkout) {
        const key = toDateKey(cursor);
        if (latestClosedDates.has(key)) {
          setErrorMsg(`Booking is closed on ${key} for this room. Please choose different dates.`);
          return;
        }
        const used = Number(bookedPerDate[key] || 0);
        if (used + requestedRooms > totalRoomInventory) {
          soldOutDate = key;
          break;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (soldOutDate) {
        setErrorMsg(
          `Selected room is sold out on ${soldOutDate}. Please choose different dates or fewer rooms.`
        );
        return;
      }
    } catch (err) {
      console.error("Failed to validate live availability:", err);
    }

    // Initiate payment
    await initiatePayment();
  };

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
            <a href="/reservation" className="active">Reservation</a>
            <a href="/login">Login</a>
            <a href="/register" className="reserve">Register</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" style={{ background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/assets/images/reservation.jpg") center/cover' }}>
        <div className="hero-overlay">
          <h1>Book Your Stay</h1>
          <p>Experience luxury in nature at Eden's Glamp Resort</p>
        </div>
      </section>

      {/* Reservation Form */}
      <section className="reservation-section">
        <div className="reservation-container">
          <h2 style={{ textAlign: 'center', marginBottom: 30, color: '#222' }}>Make a Reservation</h2>
          
          {errorMsg && (
            <div style={{ background: '#ffebee', color: '#c62828', padding: 12, borderRadius: 6, marginBottom: 20 }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Room Selection */}
            <div className="form-group">
              <label>Select Room</label>
              <div className="custom-select">
                <div
                  className="selected-room"
                  onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
                >
                  {selectedRoom && (
                    <>
                      <img src={selectedRoom.image} alt={selectedRoom.room_name} />
                      <div>
                        <h4>{selectedRoom.room_name}</h4>
                        <p>₹{selectedRoom.price} / night</p>
                      </div>
                    </>
                  )}
                  <i className={roomDropdownOpen ? "▲" : "▼"}></i>
                </div>
                <div className={`room-options ${roomDropdownOpen ? "show" : ""}`}>
                  {rooms.map((room) => (
                    <div
                      key={room.room_id}
                      className="room-card"
                      onClick={() => {
                        setSelectedRoom(room);
                        setForm((f) => ({ ...f, room_type: room.room_name }));
                        setRoomDropdownOpen(false);
                      }}
                    >
                      <img src={room.image} alt={room.room_name} />
                      <div>
                        <h4>{room.room_name}</h4>
                        <p>₹{room.price} / night</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="form-group">
              <label>Select Dates</label>
              <input
                ref={dateInputRef}
                type="text"
                placeholder="Select check-in and check-out dates"
                value={form.reservation_dates}
                readOnly
                style={{ cursor: 'pointer' }}
              />
            </div>

            {/* Guests Counter */}
            <div className="form-group">
              <div className="counters">
                <div className="counter">
                  <label>Adults</label>
                  <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))}>-</button>
                  <span>{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults((prev) => Math.min(maxAdultsAllowed, prev + 1))}
                  >
                    +
                  </button>
                </div>
                <div className="counter">
                  <label>Rooms</label>
                  <button type="button" onClick={() => setNumRooms(Math.max(1, numRooms - 1))}>-</button>
                  <span>{numRooms}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNumRooms((prev) =>
                        Math.min(
                          Number(selectedRoom?.number_of_rooms || 1),
                          prev + 1
                        )
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            {selectedRoom && (
              <p style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
                Maximum adults for this room: {maxAdultsAllowed}
              </p>
            )}

            {/* Guest Details */}
            <div className="form-group">
              <div className="details-grid">
                <div className="left">
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={handleInput}
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={handleInput}
                    readOnly={!!customerEmail}
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={handleInput}
                    required
                  />
                </div>
                <div className="right">
                  <textarea
                    name="message"
                    placeholder="Special Requests (optional)"
                    value={form.message}
                    onChange={handleInput}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="addons-header">
                <div>
                  <label style={{ marginBottom: 4 }}>Make Your Stay Special</label>
                  <p>Add premium experiences to your reservation.</p>
                </div>
                <button type="button" className="addons-skip-btn" onClick={handleSkipAddons}>
                  Skip Add-ons
                </button>
              </div>

              <div className="addons-grid">
                {addonOptions.map((addon) => {
                  const active = !!selectedAddons[addon.id];
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      className={`addon-card ${active ? "active" : ""}`}
                      onClick={() => toggleAddon(addon.id)}
                    >
                      <img
                        src={addon.image}
                        alt={addon.name}
                        onError={(e) => {
                          e.currentTarget.src = "/assets/room_blur.png";
                        }}
                      />
                      <div className="addon-card-body">
                        <h4>{addon.name}</h4>
                        <p>{addon.description}</p>
                        <div className="addon-card-footer">
                          <span>₹{addon.price.toLocaleString("en-IN")}</span>
                          <strong>{active ? "Added" : "Add"}</strong>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="addons-status">
                {skipAddons
                  ? "You skipped add-ons for this booking."
                  : getSelectedAddons().length > 0
                    ? `${getSelectedAddons().length} add-on(s) selected.`
                    : "Select add-ons or continue without selecting any."}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              {selectedRoom && form.reservation_dates && (
                <div className="total-amount" style={{ marginBottom: 20, padding: 15, background: '#f5f5f5', borderRadius: 8 }}>
                  <h3 style={{ margin: 0, color: '#333' }}>Total: ₹{calculateTotal().toLocaleString('en-IN')}</h3>
                  <p style={{ margin: '5px 0 0', color: '#666', fontSize: 14 }}>
                    {numRooms} room(s) × {selectedRoom.price}/night
                  </p>
                  <p style={{ margin: '5px 0 0', color: '#666', fontSize: 14 }}>
                    Add-ons: ₹{calculateAddonsTotal().toLocaleString('en-IN')}
                  </p>
                </div>
              )}
              <div
                style={{
                  marginTop: 12,
                  marginBottom: 10,
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "#fff8e1",
                  border: "1px solid #f2d38a",
                  color: "#7a5a00",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <strong>Cancellation Policy Notice</strong>
                <br />
                As per the resort&apos;s policy, cancellations are not permitted once the booking is confirmed.
                However, in the event that the resort becomes non-operational due to unavoidable circumstances
                (including but not limited to natural calamities, government restrictions, or other force majeure
                situations), the resort will automatically process a full refund for the affected booking.
              </div>
              <button type="submit" className="check-btn">Pay Now & Book</button>
            </div>
          </form>
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
