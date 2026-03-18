import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  async function fetchGallery() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/gallery/`);
      setImages(res.data || []);
    } catch (err) {
      console.error("Failed to load gallery", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <Link to="/" style={styles.logo}>
            <img src="/assets/images/glamp_logo.png" alt="Logo" style={styles.logoImg} />
            <span style={styles.logoText}>THE PARADISE GLAMP</span>
          </Link>
          <Link to="/" style={styles.backBtn}>← Back to Home</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Our Gallery</h1>
          <p style={styles.heroSubtitle}>
            Experience the beauty of luxury camping through our curated collection
          </p>
        </div>
      </header>

      {/* Gallery Grid */}
      <section style={styles.gallerySection}>
        {loading ? (
          <div style={styles.loading}>Loading gallery...</div>
        ) : images.length === 0 ? (
          <div style={styles.empty}>
            <p>No photos available yet.</p>
            <Link to="/" style={styles.homeLink}>Return to Home</Link>
          </div>
        ) : (
          <div style={styles.galleryGrid}>
            {images.map((photo, index) => (
              <div 
                key={photo.id} 
                style={{...styles.galleryItem, animationDelay: `${index * 0.1}s`}}
                onClick={() => setSelectedImage(photo)}
              >
                <img 
                  src={photo.image_url} 
                  alt="Gallery" 
                  style={styles.galleryImg}
                  onError={(e) => {
                    e.target.src = photo.image?.startsWith("http") 
                      ? photo.image 
                      : `${API_BASE}${photo.image}`;
                  }}
                />
                <div style={styles.overlay}>
                  <span style={styles.viewIcon}>🔍</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div style={styles.lightbox} onClick={() => setSelectedImage(null)}>
          <button style={styles.closeBtn} onClick={() => setSelectedImage(null)}>×</button>
          <img 
            src={selectedImage.image_url} 
            alt="Gallery" 
            style={styles.lightboxImg}
            onError={(e) => {
              e.target.src = selectedImage.image?.startsWith("http") 
                ? selectedImage.image 
                : `${API_BASE}${selectedImage.image}`;
            }}
          />
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2025 The Paradise Glamp. All rights reserved.</p>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    fontFamily: "'Segoe UI', sans-serif",
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(10, 10, 10, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '15px 0',
    borderBottom: '1px solid rgba(200, 157, 92, 0.2)',
  },
  navInner: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
  },
  logoImg: {
    height: '40px',
  },
  logoText: {
    color: '#c89d5c',
    fontSize: '18px',
    fontWeight: 600,
    letterSpacing: '2px',
  },
  backBtn: {
    color: '#c89d5c',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '10px 20px',
    border: '1px solid #c89d5c',
    borderRadius: '4px',
    transition: 'all 0.3s',
  },
  hero: {
    padding: '140px 30px 80px',
    textAlign: 'center',
    background: 'linear-gradient(180deg, rgba(200, 157, 92, 0.1) 0%, transparent 100%)',
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  heroTitle: {
    color: '#c89d5c',
    fontSize: '48px',
    fontWeight: 300,
    marginBottom: '15px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
  },
  heroSubtitle: {
    color: '#888',
    fontSize: '18px',
    fontWeight: 300,
    letterSpacing: '1px',
  },
  gallerySection: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 30px 80px',
  },
  loading: {
    textAlign: 'center',
    color: '#c89d5c',
    fontSize: '20px',
    padding: '80px',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    padding: '80px',
  },
  homeLink: {
    display: 'inline-block',
    marginTop: '20px',
    color: '#c89d5c',
    textDecoration: 'none',
    padding: '12px 30px',
    border: '1px solid #c89d5c',
    borderRadius: '4px',
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  galleryItem: {
    position: 'relative',
    height: '300px',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    animation: 'fadeIn 0.5s ease forwards',
    opacity: 0,
  },
  galleryImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  viewIcon: {
    fontSize: '36px',
  },
  lightbox: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    cursor: 'pointer',
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '30px',
    background: 'none',
    border: 'none',
    color: '#c89d5c',
    fontSize: '48px',
    cursor: 'pointer',
    zIndex: 1001,
  },
  lightboxImg: {
    maxWidth: '90%',
    maxHeight: '90%',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  footer: {
    textAlign: 'center',
    padding: '30px',
    color: '#444',
    borderTop: '1px solid rgba(200, 157, 92, 0.1)',
  },
};
