import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function Menu() {
  const [foods, setFoods] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [checkedInReservations, setCheckedInReservations] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    fetchFoods();
    checkCheckedInGuests();
  }, []);

  const fetchFoods = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/food/`);
      setFoods(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkCheckedInGuests = async () => {
    setIsChecking(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/confirmed-guests/`);
      // Filter for actually checked-in guests (those with confirmed status)
      const confirmed = res.data.filter(r => r.status === "Confirmed");
      setCheckedInReservations(confirmed);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
      setCheckedInReservations([]);
    } finally {
      setIsChecking(false);
    }
  };

  const categories = [
    "all",
    "bread",
    "drinks",
    "veg",
    "non-veg",
    "dessert",
  ];

  const filteredFoods =
    activeCategory === "all"
      ? foods
      : foods.filter((f) => f.category === activeCategory);

  const handleOrderClick = (food) => {
    if (checkedInReservations.length === 0) {
      alert("Only checked-in guests can order food. Please check in first.");
      return;
    }
    setSelectedFood(food);
    setShowOrderModal(true);
    setOrderSuccess(false);
    setOrderError("");
    setQuantity(1);
    setSpecialInstructions("");
    if (checkedInReservations.length === 1) {
      setSelectedReservation(checkedInReservations[0].id.toString());
    }
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!selectedReservation || !selectedFood) {
      setOrderError("Please select a reservation.");
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/food-orders/`, {
        reservation: parseInt(selectedReservation),
        food: selectedFood.id,
        quantity: quantity,
        special_instructions: specialInstructions,
      });
      setOrderSuccess(true);
      setTimeout(() => {
        setShowOrderModal(false);
        setOrderSuccess(false);
      }, 2000);
    } catch (err) {
      setOrderError(err.response?.data?.detail || "Failed to place order. Please try again.");
    }
  };

  const closeModal = () => {
    setShowOrderModal(false);
    setOrderSuccess(false);
    setOrderError("");
  };

  return (
    <div className="menu-page">
      <style>{`
        /* ================================
   GUEST MENU – LUXURY IVORY THEME
   ================================ */

.menu-page {
  background: #f8f4ec; /* Ivory */
  min-height: 100vh;
  padding: 80px 24px;
  color: #2a2a2a;
  font-family: 'Montserrat', 'Segoe UI', sans-serif;
}

/* ---------- HEADER ---------- */

.menu-header {
  text-align: center;
  margin-bottom: 50px;
}

.menu-header h1 {
  color: #c89d5c; /* Gold accent */
  font-size: 42px;
  margin-bottom: 10px;
  font-weight: 600;
}

.menu-header p {
  color: #555;
  font-size: 15px;
  letter-spacing: 0.4px;
}

/* ---------- CHECK-IN STATUS ---------- */

.checkin-status {
  max-width: 600px;
  margin: 0 auto 30px;
  padding: 16px;
  border-radius: 10px;
  background: rgba(200, 157, 92, 0.15);
  text-align: center;
}

.checkin-status.available {
  background: rgba(74, 222, 128, 0.2);
  color: #166534;
}

.checkin-status.unavailable {
  background: rgba(239, 68, 68, 0.15);
  color: #991b1b;
}

/* ---------- ORDER BUTTON ---------- */

.order-btn {
  width: 100%;
  margin-top: 12px;
  background: #c89d5c;
  color: #111;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.order-btn:hover {
  background: #b88a4a;
}

.order-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* ---------- MODAL ---------- */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #2a2a2a;
  color: #f1f1f1;
  padding: 30px;
  border-radius: 12px;
  max-width: 450px;
  width: 90%;
  position: relative;
}

.modal-content h2 {
  color: #c89d5c;
  margin-bottom: 20px;
}

.modal-content label {
  display: block;
  margin-top: 12px;
  color: #aaa;
  font-size: 13px;
}

.modal-content select,
.modal-content input,
.modal-content textarea {
  width: 100%;
  padding: 10px;
  margin-top: 6px;
  border-radius: 6px;
  border: none;
  background: #3e3e3e;
  color: #fff;
}

.modal-content .modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-content .btn-submit {
  flex: 1;
  background: #c89d5c;
  color: #111;
  border: none;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.modal-content .btn-cancel {
  flex: 1;
  background: #555;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
}

.modal-content .close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: #aaa;
  font-size: 24px;
  cursor: pointer;
}

.modal-content .success-msg {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 15px;
}

.modal-content .error-msg {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 15px;
}

/* ---------- CATEGORY TABS ---------- */

.category-tabs {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.category-tabs button {
  background: transparent;
  border: 1px solid #c89d5c;
  color: #7a5a2b;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 0.8px;
  transition: all 0.25s ease;
}

.category-tabs button:hover {
  background: rgba(200, 157, 92, 0.15);
}

.category-tabs button.active {
  background: #c89d5c;
  color: #111;
}

/* ---------- MENU GRID ---------- */

.menu-grid {
  max-width: 1200px;
  margin: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 26px;
}

/* ---------- MENU CARD ---------- */

.menu-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(200, 157, 92, 0.25);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.menu-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
}

/* ---------- IMAGE ---------- */

.menu-card img {
  width: 100%;
  height: 190px;
  object-fit: cover;
}

/* ---------- CONTENT ---------- */

.menu-content {
  padding: 18px;
}

.menu-content .category {
  font-size: 12px;
  text-transform: uppercase;
  color: #c89d5c;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.menu-content h3 {
  font-size: 18px;
  color: #2a2a2a;
  margin-bottom: 6px;
  font-weight: 500;
}

.menu-content .price {
  font-size: 16px;
  font-weight: 600;
  color: #7a5a2b;
}

/* ---------- EMPTY STATE ---------- */

.menu-grid p {
  grid-column: 1 / -1;
  text-align: center;
  color: #777;
  font-size: 14px;
}

/* ---------- RESPONSIVE ---------- */

@media (max-width: 768px) {
  .menu-header h1 {
    font-size: 34px;
  }

  .menu-page {
    padding: 60px 16px;
  }
}

@media (max-width: 480px) {
  .menu-header h1 {
    font-size: 30px;
  }

  .menu-content h3 {
    font-size: 16px;
  }
}
      `}</style>

      <div className="menu-header">
        <h1>Our Menu</h1>
        <p>Carefully crafted dishes for your perfect stay</p>
      </div>

      {/* Check-in Status */}
      {isChecking ? (
        <div className="checkin-status">Checking your reservation...</div>
      ) : checkedInReservations.length > 0 ? (
        <div className="checkin-status available">
          ✓ {checkedInReservations.length} reservation(s) found - You can order food!
        </div>
      ) : (
        <div className="checkin-status unavailable">
          Only checked-in guests can order food. Please check in first.
        </div>
      )}

      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={activeCategory === cat ? "active" : ""}
            onClick={() => setActiveCategory(cat)}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="menu-grid">
        {filteredFoods.length === 0 ? (
          <p style={{ textAlign: "center", gridColumn: "1/-1" }}>
            No items available
          </p>
        ) : (
          filteredFoods.map((food) => (
            <div className="menu-card" key={food.id}>
              <img
                src={food.image_url || `${API_BASE}${food.image}`}
                alt={food.name}
              />
              <div className="menu-content">
                <div className="category">{food.category}</div>
                <h3>{food.name}</h3>
                <div className="price">₹{food.price}</div>
                <button
                  className="order-btn"
                  onClick={() => handleOrderClick(food)}
                  disabled={checkedInReservations.length === 0}
                >
                  {checkedInReservations.length > 0 ? "Order Now" : "Check In to Order"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedFood && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <h2>Place Order</h2>
            
            {orderSuccess ? (
              <div className="success-msg">
                ✓ Order placed successfully! We'll deliver it to your room soon.
              </div>
            ) : (
              <>
                {orderError && <div className="error-msg">{orderError}</div>}
                
                <form onSubmit={handleSubmitOrder}>
                  <label>Food Item</label>
                  <input
                    type="text"
                    value={`${selectedFood.name} - ₹${selectedFood.price}`}
                    disabled
                  />

                  <label>Select Reservation</label>
                  <select
                    value={selectedReservation}
                    onChange={(e) => setSelectedReservation(e.target.value)}
                    required
                  >
                    <option value="">Select your reservation</option>
                    {checkedInReservations.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} - {r.room_type || "Standard Room"} ({r.checkin} to {r.checkout})
                      </option>
                    ))}
                  </select>

                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    required
                  />

                  <label>Special Instructions (optional)</label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any allergies or special requests..."
                    rows="3"
                  />

                  <div style={{ marginTop: 15, padding: 10, background: '#3e3e3e', borderRadius: 6 }}>
                    <strong>Total: ₹{(parseFloat(selectedFood.price) * quantity).toFixed(2)}</strong>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit">
                      Place Order
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
