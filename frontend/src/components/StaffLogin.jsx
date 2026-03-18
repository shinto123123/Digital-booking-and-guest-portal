import React, { useState } from "react";
import api from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

export default function StaffLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (!username || username.trim().length === 0) {
      setError("Please enter your username");
      setLoading(false);
      return;
    }

    if (!password || password.length === 0) {
      setError("Please enter your password");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let res = null;

      // Auto-detect admin/staff by trying role-specific endpoints.
      try {
        res = await api.post("/auth/admin/login/", {
          identifier: username,
          password,
        });
      } catch (adminErr) {
        res = await api.post("/auth/staff/login/", {
          identifier: username,
          password,
        });
      }

      const userRole = res.data.role;

      // Clear only staff/admin session (do not touch customer session)
      localStorage.removeItem('staff_access_token');
      localStorage.removeItem('staff_refresh_token');
      localStorage.removeItem('staff_username');
      localStorage.removeItem('staff_role');
      localStorage.removeItem('admin_id');
      localStorage.removeItem('staff_id');

      // Set role-specific session
      localStorage.setItem("staff_access_token", res.data.access);
      localStorage.setItem("staff_refresh_token", res.data.refresh);
      localStorage.setItem("staff_username", res.data.username);
      localStorage.setItem("staff_role", userRole);
      
      if (userRole === "admin") {
        localStorage.setItem("admin_id", res.data.user_id || res.data.username);
      } else if (userRole === "staff") {
        localStorage.setItem("staff_id", res.data.user_id || res.data.username);
      }

      if (userRole === "admin") {
        navigate("/admin");
      } else if (userRole === "staff") {
        navigate("/staff");
      } else {
        navigate("/staff-admin-login");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Only admin and staff can login here.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');

        .staff-auth-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .staff-auth-wrapper::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 30%, rgba(200, 157, 92, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 70% 70%, rgba(200, 157, 92, 0.05) 0%, transparent 40%);
          animation: shimmer 15s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-2%, -2%) rotate(1deg); }
        }

        .staff-auth-card {
          background: rgba(30, 30, 30, 0.85);
          backdrop-filter: blur(20px);
          padding: 48px 42px;
          border-radius: 24px;
          width: 100%;
          max-width: 440px;
          color: #fff;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(200, 157, 92, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.05);
          text-align: center;
          position: relative;
          z-index: 1;
          animation: cardFadeIn 0.6s ease-out;
        }

        @keyframes cardFadeIn {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        .staff-auth-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 4px;
          background: linear-gradient(90deg, transparent, #c89d5c, transparent);
          border-radius: 0 0 4px 4px;
        }

        .staff-logo-icon {
          font-size: 42px;
          color: #c89d5c;
          margin-bottom: 8px;
          display: block;
          text-shadow: 0 0 30px rgba(200, 157, 92, 0.5);
        }

        .staff-auth-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff 0%, #c89d5c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .staff-auth-subtitle {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          color: #888;
          margin-bottom: 36px;
          font-weight: 300;
          letter-spacing: 0.5px;
        }

        .staff-auth-field {
          text-align: left;
          margin-bottom: 22px;
          position: relative;
        }

        .staff-auth-field label {
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          color: #999;
          margin-bottom: 8px;
          display: block;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .staff-auth-field input {
          width: 100%;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(20, 20, 20, 0.8);
          color: #fff;
          font-size: 15px;
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s ease;
        }

        .staff-auth-field input::placeholder {
          color: #555;
        }

        .staff-auth-field input:focus {
          outline: none;
          border-color: #c89d5c;
          background: rgba(20, 20, 20, 0.95);
          box-shadow: 0 0 0 3px rgba(200, 157, 92, 0.1),
                      0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .staff-auth-btn {
          width: 100%;
          padding: 18px;
          margin-top: 16px;
          border-radius: 14px;
          background: linear-gradient(135deg, #c89d5c 0%, #a67c3d 50%, #c89d5c 100%);
          background-size: 200% 200%;
          color: #0a0a0a;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.4s ease;
          border: none;
          position: relative;
          overflow: hidden;
        }

        .staff-auth-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s ease;
        }

        .staff-auth-btn:hover::before {
          left: 100%;
        }

        .staff-auth-btn:hover {
          background-position: 100% 100%;
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(200, 157, 92, 0.4);
        }

        .staff-auth-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .staff-auth-error {
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          color: #ff6b7a;
          padding: 14px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
          font-family: 'Poppins', sans-serif;
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .staff-auth-footer {
          margin-top: 28px;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          color: #777;
        }

        .staff-auth-footer a {
          color: #c89d5c;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .staff-auth-footer a:hover {
          color: #e0b86e;
          text-shadow: 0 0 20px rgba(200, 157, 92, 0.5);
        }
      `}</style>

      <div className="staff-auth-wrapper">
        <div className="staff-auth-card">
          <span className="staff-logo-icon">✦</span>
          <h2 className="staff-auth-title">Staff & Admin Portal</h2>
          <p className="staff-auth-subtitle">
            
          </p>

          {error && <div className="staff-auth-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="staff-auth-field">
              <label>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="staff-auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button className="staff-auth-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <Link to="/" className="staff-auth-footer" style={{ marginTop: '12px', display: 'block' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
