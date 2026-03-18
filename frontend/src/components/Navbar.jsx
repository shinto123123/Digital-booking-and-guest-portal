import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('customer_access_token');
    const storedUsername = localStorage.getItem('customer_username');
    const storedRole = localStorage.getItem('customer_role');
    
    if (token && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
      setUserRole(storedRole || '');
    } else {
      setIsLoggedIn(false);
      setUsername('');
      setUserRole('');
    }
  }, []);

  const handleLogout = () => {
    // Clear customer session only
    localStorage.removeItem('customer_access_token');
    localStorage.removeItem('customer_refresh_token');
    localStorage.removeItem('customer_username');
    localStorage.removeItem('customer_email');
    localStorage.removeItem('customer_role');
    localStorage.removeItem('customer_id');
    
    setIsLoggedIn(false);
    setUsername('');
    setUserRole('');
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {/* Logo */}
        <Link to='/' style={styles.logoSection}>
          <span style={styles.logoIcon}>✦</span>
          <div style={styles.logoText}>
            <span style={styles.logoMain}>EDEN'S GLAMP</span>
            <span style={styles.logoSub}>Resort & Spa</span>
          </div>
        </Link>

        {/* Menu Links */}
        <div style={styles.menuSection}>
          <Link to='/' style={styles.menuLink}>
            <span style={styles.menuText}>Home</span>
            <span style={styles.menuLine}></span>
          </Link>
          <Link to='/rooms' style={styles.menuLink}>
            <span style={styles.menuText}>Rooms</span>
            <span style={styles.menuLine}></span>
          </Link>
          <Link to='/gallery' style={styles.menuLink}>
            <span style={styles.menuText}>Gallery</span>
            <span style={styles.menuLine}></span>
          </Link>
          
          {isLoggedIn && userRole === 'customer' ? (
            <div style={styles.authSection}>
              <Link 
                to='/profile' 
                style={styles.userButton}
              >
                <span style={styles.userIcon}>★</span>
                <span style={styles.userName}>{username}</span>
              </Link>
              <button 
                onClick={handleLogout} 
                style={styles.logoutButton}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to='/login' style={styles.loginButton}>
                <span>Sign In</span>
              </Link>
              <Link to='/staff-admin-login' style={{...styles.loginButton, marginLeft: 8, background: 'transparent', border: '1px solid rgba(200, 157, 92, 0.4)', color: '#c89d5c'}}>
                <span>Staff</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: '#0a0a0a',
    background: 'linear-gradient(180deg, #0a0a0a 0%, #141210 100%)',
    padding: '0 40px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    borderBottom: '1px solid rgba(200, 157, 92, 0.15)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(200, 157, 92, 0.2), 0 0 80px rgba(200, 157, 92, 0.08)',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1400,
    margin: '0 auto',
    height: 80,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textDecoration: 'none',
  },
  logoIcon: {
    color: '#c89d5c',
    fontSize: 28,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoMain: {
    color: '#c89d5c',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 3,
    lineHeight: 1.2,
  },
  logoSub: {
    color: '#888',
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  menuSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  menuLink: {
    position: 'relative',
    padding: '10px 20px',
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  menuText: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    transition: 'color 0.3s',
  },
  menuLine: {
    width: 0,
    height: 2,
    background: '#c89d5c',
    transition: 'width 0.3s',
    marginTop: 4,
  },
  userSection: {
    position: 'relative',
    marginLeft: 20,
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, rgba(200, 157, 92, 0.2) 0%, rgba(200, 157, 92, 0.1) 100%)',
    border: '1px solid rgba(200, 157, 92, 0.4)',
    borderRadius: 4,
    padding: '10px 20px',
    cursor: 'pointer',
    color: '#c89d5c',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  userIcon: {
    fontSize: 12,
  },
  userName: {
    fontWeight: 600,
  },
  dropdownArrow: {
    fontSize: 10,
    marginLeft: 6,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    right: 0,
    background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
    border: '1px solid rgba(200, 157, 92, 0.3)',
    borderRadius: 8,
    minWidth: 240,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(200, 157, 92, 0.1)',
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(200, 157, 92, 0.2)',
    background: 'rgba(200, 157, 92, 0.05)',
  },
  welcomeText: {
    color: '#c89d5c',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    color: '#d0d0d0',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'all 0.2s',
    width: '100%',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  dropdownItemLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    color: '#e57373',
    fontSize: 14,
    transition: 'all 0.2s',
    width: '100%',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  itemIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
    color: '#c89d5c',
  },
  dropdownDivider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '4px 12px',
  },
  authSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 20,
  },
  logoutButton: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid rgba(200, 157, 92, 0.4)',
    borderRadius: 4,
    color: '#c89d5c',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  loginButton: {
    position: 'relative',
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #c89d5c 0%, #a67c3d 100%)',
    color: '#0a0a0a',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    borderRadius: 4,
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(200, 157, 92, 0.3)',
  },
};
