import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "../styles/roomdetails.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function RoomDetails() {
  const { id } = useParams();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= FETCH ROOM ================= */
  useEffect(() => {
    if (!id) {
      setError("Invalid room");
      setLoading(false);
      return;
    }

    axios
      .get(`${API_BASE}/api/rooms/${id}/`)
      .then((res) => {
        setRoom(res.data);
      })
      .catch(() => {
        setError("Room not found");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  /* ================= SCROLL ANIMATIONS ================= */
  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document
      .querySelectorAll(
        ".fade-in, .fade-up, .fade-left, .fade-right, .amenity"
      )
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [loading]);

  /* ================= STATES ================= */
  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (error) return <p style={{ padding: 40 }}>{error}</p>;
  if (!room) return null;

  /* ================= HERO IMAGE (ADMIN UPLOADED) ================= */
  const heroImage =
    Array.isArray(room.images) && room.images.length > 0
      ? room.images[0].image.startsWith("http")
        ? room.images[0].image
        : `${API_BASE}${room.images[0].image}`
      : ""; // no fake images

  return (
    <>
      {/* ================= NAV ================= */}
      <header className="nav fade-in">
        <div className="nav-inner">
          <img
            src="/assets/images/glamp_logo.png"
            alt="The Paradise Glamp"
            className="logo"
          />
          <nav className="menu">
            <Link to="/">Home</Link>
            <Link to="/reservation">Reservation</Link>
            <Link className="reserve" to="/reservation">
              Reserve
            </Link>
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section
        className="hero fade-up"
        style={{
          background: heroImage
            ? `url("${heroImage}") center/cover no-repeat`
            : "#000",
        }}
      >
        <div className="hero-overlay">
          <h1 className="fade-in">{room.room_name}</h1>
          <p className="fade-up">
            Experience nature with unmatched comfort & elegance
          </p>
          <div className="breadcrumb fade-right">
            <Link to="/">Home</Link> / Room Details
          </div>
        </div>
      </section>

      {/* ================= ROOM DETAILS ================= */}
      <section className="room-details fade-up">
        <div className="room-container">
          <h2 className="room-title fade-in">{room.room_name}</h2>

          <div className="room-price-box fade-up">
            <div className="price">
              ₹{Number(room.price).toLocaleString()} / night
            </div>
            <Link to="/reservation" className="reserve-btn">
              RESERVE NOW
            </Link>
          </div>

          <p className="room-description fade-left">
            {room.description}
          </p>

          {/* ================= GALLERY (ADMIN IMAGES) ================= */}
          {Array.isArray(room.images) && room.images.length > 0 && (
            <div className="room-gallery fade-up">
              <img src={heroImage} alt={room.room_name} />
            </div>
          )}
        </div>
      </section>

      {/* ================= AMENITIES ================= */}
      <section className="room-amenities fade-up">
        <div className="amenities-container">
          {[
            ["fa-users", "4 Guests"],
            ["fa-arrows-alt", "35 Feet Size"],
            ["fa-door-open", "Connecting Rooms"],
            ["fa-bed", "1 King Bed"],
            ["fa-tv", "Cable TV"],
            ["fa-shower", "Shower"],
            ["fa-chair", "Work Desk"],
            ["fa-bath", "Bathtub"],
            ["fa-lock", "Safebox"],
            ["fa-wifi", "Free WiFi"],
            ["fa-archway", "Balcony"],
            ["fa-city", "City View"],
          ].map(([icon, text]) => (
            <div className="amenity" key={text}>
              <i className={`fas ${icon}`}></i>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="footer fade-in">
        <div className="footer-inner">
          <div>
            <h4>Address</h4>
            <p>Adimali, Idukki, Kerala</p>
          </div>
          <div>
            <h4>Contact</h4>
            <p>+91 9497185771</p>
            <p>theparadiseglamp@gmail.com</p>
          </div>
        </div>
      </footer>
    </>
  );
}
