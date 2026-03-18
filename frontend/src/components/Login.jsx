import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (window.google && window.google.accounts) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  const initializeGoogle = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        context: 'signin',
        ux_mode: 'popup',
      });
    }
  };

  const handleGoogleResponse = async (response) => {
    setGoogleLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/google/', {
        token: response.credential,
      });

      // Customer session only (kept separate from staff/admin session)
      localStorage.setItem('customer_access_token', res.data.access);
      localStorage.setItem('customer_refresh_token', res.data.refresh);
      localStorage.setItem('customer_username', res.data.username);
      if (res.data.email) {
        localStorage.setItem('customer_email', res.data.email);
      }
      localStorage.setItem('customer_role', 'customer');

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.prompt();
    }
  };

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (!identifier || identifier.trim().length === 0) {
      setError("Please enter your username or email");
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
      const cleanedIdentifier = identifier.trim();
      // Use customer-specific login endpoint
      const res = await api.post("/auth/customer/login/", {
        identifier: cleanedIdentifier,
        password,
      });

      // Clear only customer session (do not touch staff/admin session)
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_refresh_token');
      localStorage.removeItem('customer_username');
      localStorage.removeItem('customer_email');
      localStorage.removeItem('customer_role');
      localStorage.removeItem('customer_id');

      // Set customer-specific session
      localStorage.setItem("customer_access_token", res.data.access);
      localStorage.setItem("customer_refresh_token", res.data.refresh);
      localStorage.setItem("customer_username", res.data.username);
      if (res.data.email) {
        localStorage.setItem("customer_email", res.data.email);
      }
      
      // Save customer role
      localStorage.setItem("customer_role", "customer");
      localStorage.setItem("customer_id", res.data.user_id || res.data.username);
      
      // Redirect to home
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid username/email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');

        .auth-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .auth-wrapper::before {
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

        .auth-card {
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

        .auth-card::before {
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

        .logo-icon {
          font-size: 42px;
          color: #c89d5c;
          margin-bottom: 8px;
          display: block;
          text-shadow: 0 0 30px rgba(200, 157, 92, 0.5);
        }

        .auth-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff 0%, #c89d5c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .auth-subtitle {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          color: #888;
          margin-bottom: 36px;
          font-weight: 300;
          letter-spacing: 0.5px;
        }

        .auth-field {
          text-align: left;
          margin-bottom: 22px;
          position: relative;
        }

        .auth-field label {
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          color: #999;
          margin-bottom: 8px;
          display: block;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .auth-field input {
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

        .auth-field input::placeholder {
          color: #555;
        }

        .auth-field input:focus {
          outline: none;
          border-color: #c89d5c;
          background: rgba(20, 20, 20, 0.95);
          box-shadow: 0 0 0 3px rgba(200, 157, 92, 0.1),
                      0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .auth-btn {
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

        .auth-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s ease;
        }

        .auth-btn:hover::before {
          left: 100%;
        }

        .auth-btn:hover {
          background-position: 100% 100%;
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(200, 157, 92, 0.4);
        }

        .auth-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .auth-error {
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

        .auth-divider {
          display: flex;
          align-items: center;
          margin: 28px 0;
          color: #555;
          font-size: 12px;
          font-family: 'Poppins', sans-serif;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        .auth-divider span {
          padding: 0 16px;
        }

        .social-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .social-btn {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(20, 20, 20, 0.6);
          color: #888;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .social-btn:hover {
          border-color: #c89d5c;
          color: #c89d5c;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(200, 157, 92, 0.2);
        }

        .auth-footer {
          margin-top: 28px;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          color: #777;
        }

        .auth-footer a {
          color: #c89d5c;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .auth-footer a:hover {
          color: #e0b86e;
          text-shadow: 0 0 20px rgba(200, 157, 92, 0.5);
        }

        .auth-back-btn {
          display: block;
          margin-top: 20px;
          color: #666;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .auth-back-btn:hover {
          color: #c89d5c;
        }

        .remember-forgot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #888;
        }

        .remember-me input {
          accent-color: #c89d5c;
          width: 16px;
          height: 16px;
        }

        .forgot-password {
          color: #c89d5c;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .forgot-password:hover {
          color: #e0b86e;
        }
      `}</style>

      <div className="auth-wrapper">
        <div className="auth-card">
          <span className="logo-icon">✦</span>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">
            Login to continue your luxury experience
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label>Username or Email</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="remember-forgot">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="social-btns">
            <button 
              type="button" 
              className="social-btn" 
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              title="Sign in with Google"
            >
              {googleLoading ? '...' : 'G'}
            </button>
            <button className="social-btn" title="Apple"></button>
            <button className="social-btn" title="Facebook">f</button>
          </div>

          <div className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register">Create one</Link>
          </div>

          <Link to="/" className="auth-back-btn">
            ← Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
