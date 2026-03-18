// src/components/home.jsx
import React, { useEffect, useState, useRef } from "react";
import "../styles/home.css";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function Home({ rooms: initialRooms = [] }) {
    // 🔐 Auth state
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem("customer_role");
    if (role !== "customer") return null;
    return localStorage.getItem("customer_username");
  });

  const [index, setIndex] = useState(1);
  const slideCount = 3;
  const autoPlayRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState("");

  const [gallery, setGallery] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);


  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setIndex((i) => (i >= slideCount ? 1 : i + 1));
    }, 6000);

    return () => clearInterval(autoPlayRef.current);
  }, []);

  function logout() {
    localStorage.clear();
    setUser(null);
    window.location.href = "/";
  }

  useEffect(() => {
    const syncSession = () => {
      const token = localStorage.getItem("customer_access_token");
      const role = localStorage.getItem("customer_role");
      const username = localStorage.getItem("customer_username");
      if (token && role === "customer" && username) {
        setUser(username);
      } else {
        setUser(null);
      }
    };

    syncSession();
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
          }
        });
      },
      { threshold: 0.1 }
    );

    document
      .querySelectorAll(".fade-in, .fade-up, .fade-left, .fade-right")
      .forEach((el) => {
        if (!el.closest(".hero-wrap") && !el.closest(".nav")) {
          observer.observe(el);
        }
      });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // If the parent passed rooms props, and it's non-empty, skip fetching.
    if (Array.isArray(initialRooms) && initialRooms.length > 0) {
      // but ensure normalization of preview image
      setRooms(initialRooms.filter((r) => r.is_available !== false).map(normalizeRoom));
      return;
    }
    // fetch rooms from API
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
  fetchGallery();

}, []);


 async function fetchRooms() {
  setLoadingRooms(true);
  setRoomsError("");
  try {
    const res = await axios.get(`${API_BASE}/api/rooms/`);
    console.log("HOME /api/rooms response 👉", res.data); // 👈 ADD THIS
    const data = Array.isArray(res.data) ? res.data : res.data.results || [];
    setRooms(data.filter((r) => r.is_available !== false).map(normalizeRoom));
  } catch (err) {
    console.error("Failed fetching rooms:", err);
    setRoomsError("Unable to load rooms. Check server / CORS.");
  } finally {
    setLoadingRooms(false);
  }
}
async function fetchGallery() {
  setLoadingGallery(true);
  try {
    const res = await axios.get(`${API_BASE}/api/gallery/`);
    setGallery(res.data);
  } catch (err) {
    console.error("Failed to load gallery", err);
  } finally {
    setLoadingGallery(false);
  }
}



  // Normalize room object returned by backend into fields used by UI
  function normalizeRoom(r) {
    // prefer id then room_id
    const id = r.id ?? r.room_id ?? null;
    const room_name = r.room_name ?? r.name ?? "";
    const description = r.description ?? "";
    const capacity = r.capacity ?? r.guests ?? r.max_guests ?? "";
    const price = r.price ?? r.rate ?? 0;

    // pick preview image: check images array, preview_image, image, image_path, thumbnail
    let preview = null;

    // Helper to extract string src from many shapes
    const extractSrc = (img) => {
      if (!img) return null;
      if (typeof img === "string") return img;
      if (typeof img === "object") {
        return img.url ?? img.image ?? img.image_path ?? img.path ?? img.src ?? null;
      }
      return null;
    };

    // images could be array of strings/objects at r.images or r.images_list or r.room_images
    const imgs = r.images ?? r.images_list ?? r.room_images ?? [];
    if (Array.isArray(imgs) && imgs.length > 0) {
      preview = extractSrc(imgs[0]) || null;
      // if nested like {image: {url:...}}
      if (!preview && imgs[0] && imgs[0].image && typeof imgs[0].image === "object") {
        preview = imgs[0].image.url ?? imgs[0].image.path ?? null;
      }
    }

    // fallback fields
    if (!preview) preview = extractSrc(r.preview_image) || extractSrc(r.image) || extractSrc(r.image_path) || extractSrc(r.thumbnail) || null;

    // normalize to absolute url if necessary
    let image = "/assets/images/uploads/default.jpg";
    if (preview && typeof preview === "string") {
      if (preview.startsWith("http")) image = preview;
      else if (preview.startsWith("/")) image = `${API_BASE}${preview}`;
      else image = `${API_BASE}/${preview}`;
    }

    return {
      id,
      room_id: id,
      room_name,
      description,
      capacity,
      price,
      image,
      raw: r,
    };
  }

  const slideBackground = (n) => {
    const urls = {
      1: "/assets/images/glamp1.jpg",
      2: "/assets/images/glamp2.jpg",
      3: "/assets/images/glamp3.jpg",
    };
    return { backgroundImage: `url('${urls[n]}')` };
  };

  const goPrev = () => setIndex((i) => (i <= 1 ? slideCount : i - 1));
  const goNext = () => setIndex((i) => (i >= slideCount ? 1 : i + 1));

  return (
    <div id="app">
      <style>{`
        .see-more-btn {
          display: inline-block;
          padding: 16px 40px;
          background: linear-gradient(135deg, #c89d5c 0%, #a67c3d 100%);
          color: #0a0a0a;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 3px;
          border-radius: 4px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(200, 157, 92, 0.3);
        }
        .see-more-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(200, 157, 92, 0.5);
          background: linear-gradient(135deg, #d4af6a 0%, #b8924d 100%);
        }
      `}</style>
      <div className="slider" id="slider">
        {/* SLIDES */}
        <div
          className={`slide slide-1 ${index === 1 ? "active" : ""}`}
          role="img"
          aria-label="Slide 1"
          style={slideBackground(1)}
        />
        <div
          className={`slide slide-2 ${index === 2 ? "active" : ""}`}
          role="img"
          aria-label="Slide 2"
          style={slideBackground(2)}
        />
        <div
          className={`slide slide_3 ${index === 3 ? "active" : ""}`}
          role="img"
          aria-label="Slide 3"
          style={slideBackground(3)}
        />

        {/* NAVIGATION BAR */}
        <header className="nav">
          <div className="nav-inner">
            <div className="brand">
              <img src="/assets/images/glamp_logo.png" alt="Glamp Logo" className="logo" />
            </div>

            <nav className="menu">
              <a href="/">Home</a>
              <a href="#rooms">Rooms</a>
              <Link to="/reservation">Reservation</Link>

              <a href="#">Contact</a>
              {user ? (
  <div className="user-menu">
    <Link to="/profile" className="user-pill">
      <span className="user-icon">👤</span>
      <span className="user-name">{user}</span>
    </Link>

    <div className="user-dropdown">
      <Link to="/profile#reviews">⭐ Give Review</Link>
      <Link to="/profile#invoices">📄 Download Invoice</Link>
      <button onClick={logout}>🚪 Logout</button>
    </div>
  </div>
) : (
  <div className="auth-actions">
    <Link className="reserve" to="/register">
      LOGIN
    </Link>
  </div>
)}


            </nav>
          </div>
        </header>

        {/* ARROWS */}
        <div className="arrow left" onClick={goPrev}>
          <button aria-label="previous">‹</button>
        </div>
        <div className="arrow right" onClick={goNext}>
          <button aria-label="next">›</button>
        </div>

        {/* HERO SECTION */}
        <div className="hero-wrap">
          <section className="arch">
            <div className="arch-inner">
              <div className="stars-row">★★★★★</div>
              <h1>
                Experience Hospitality Like
                <br />
                Never Before
              </h1>
              <p className="lead">Discover the perfect blend of luxury, comfort, and convenience at The Paradise Glamp</p>
              <a className="cta" href="#rooms">
                DISCOVER ROOMS
              </a>
            </div>
          </section>
        </div>

        {/* DOTS */}
        <div className="dots">
          {[1, 2, 3].map((n) => (
            <button key={n} className={`dot ${index === n ? "active" : ""}`} onClick={() => setIndex(n)} />
          ))}
        </div>

        <div className="page-indicator">
          {index} / {slideCount}
        </div>
      </div>

      

      {/* WELCOME SECTION */}
      <section className="welcome fade-up">
        <div className="welcome-inner">
          <div className="arch-img fade-left">
            <img src="/assets/images/glamp2.jpg" alt="Luxury Lobby" />
          </div>

          <div className="welcome-text fade-up">
            <h4>WELCOME TO THE PARADISE GLAMP</h4>
            <h2>A LUXURY GATEWAY...</h2>

            <div className="welcome-rating fade-in">
              <strong>4.9 out of 5</strong>
              <div className="stars">★★★★★</div>
              <p>Based on 25000+ reviews</p>
            </div>
          </div>

          <div className="arch-img fade-right">
            <img src="/assets/images/glamp3.jpg" alt="Fine Dining" />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services fade-up">
        <div className="services-inner">
          {[
            ["fas fa-wifi", "Free High-Speed WiFi"],
            ["fas fa-shuttle-van", "Airport Pickup & Drop"],
            ["fas fa-bell-concierge", "24/7 Concierge"],
            ["fas fa-fire", "Bonfire & Barbecue Nights"],
            ["fas fa-square-parking", "Private Parking"],
            ["fas fa-person-hiking", "Guided Nature Walks"],
          ].map(([icon, title]) => (
            <div className="service-card fade-up" key={title}>
              <div className="icon">
                <i className={icon} />
              </div>
              <h3>{title}</h3>
            </div>
          ))}
        </div>
      </section>

     <section className="accommodation" id="rooms">
  <div className="accommodation-inner">
    <div className="section-title">
      <span className="subtitle">ELEGANT</span>
      <h2>Accommodation</h2>
    </div>

    {loadingRooms ? (
      <p>Loading rooms...</p>
    ) : rooms.length > 0 ? (
      <div className="rooms-grid">
        {rooms.map((room) => (
          <div className="room-card" key={room.room_id ?? room.id}>
            <div className="arch-img">
              <img
                src={room.image}
                alt={room.room_name}
              />

              <div className="room-info">
                <h3>{room.room_name}</h3>
                <p>{room.capacity} Guests</p>
              </div>

              <div className="overlay">
                <span className="price">
                  From ₹{Number(room.price).toFixed(2)}
                </span>
                <Link
                  to={`/room/${room.room_id ?? room.id}`}
                  className="details-btn"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p>No rooms available at the moment.</p>
    )}
  </div>
</section>

      {/* VIDEO */}
      <section className="video-wrapper fade-up">
        <div className="video-section">
          <video autoPlay muted loop controls playsInline style={{ maxWidth: "100%" }}>
            <source src="/assets/videos/glampvideo.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      {/* INSTAGRAM */}
<section className="instagram fade-up">
  <div className="insta-title fade-in">
    <span>OUR INSTAGRAM</span>
    <h2>the_edens_glamp</h2>
  </div>

  <div className="insta-gallery">
  {loadingGallery ? (
    <p>Loading photos...</p>
  ) : gallery.length > 0 ? (
    gallery.map((photo) => (
      <div key={photo.id} className="insta-item">

        <img
          src={photo.image_url}
          alt="Gallery"
        />
        <div className="insta-overlay">
          <i className="fab fa-instagram" />
        </div>
      </div>
    ))
  ) : (
    <p>No photos available yet.</p>
  )}
</div>

  <div className="see-more-photos">
    <a href="/gallery" className="see-more-btn">
      SEE MORE PHOTOS
    </a>
  </div>
</section>



      {/* FOOTER */}
      <footer className="footer fade-in">
        <div className="footer-inner">
          <div className="footer-col fade-left">
            <h4>Address</h4>
            <p>Mankulam-Kallar Rd</p>
            <p>Munnar,Kerala</p>
          </div>

          <div className="footer-col logo-col fade-up">
            <h2 className="footer-logo">THE EDENS GLAMP</h2>
            <div className="stars">★★★★★</div>
          </div>

          <div className="footer-col fade-right">
            <h4>Contact Us</h4>
            <p>+91 9495844307</p>
            <p>theedensglamp@gmail.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

