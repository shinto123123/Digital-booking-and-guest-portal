import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

export default function Profile() {
  const [reservations, setReservations] = useState([]);
  const [eligibleForReview, setEligibleForReview] = useState({});
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    username: localStorage.getItem('customer_username') || '',
    email: localStorage.getItem('customer_email') || '',
    phone: '',
    address: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const navigate = useNavigate();
  
  const email = localStorage.getItem('customer_email');

  useEffect(() => {
    const token = localStorage.getItem('customer_access_token');
    const role = localStorage.getItem('customer_role');
    
    // Verify user is a customer before allowing access
    if (!token || role !== 'customer') {
      navigate('/login');
      return;
    }
    
    fetchReservations();
    fetchEligibleForReview();
  }, [navigate]);

  const fetchEligibleForReview = async () => {
    try {
      const userEmail = localStorage.getItem('customer_email');
      const userName = localStorage.getItem('customer_username');
      if (userEmail) {
        const response = await axios.get(`/reviews/eligible/?email=${encodeURIComponent(userEmail)}`);
        const eligibleData = {};
        response.data.forEach(item => {
          eligibleData[item.id] = { eligible: !item.has_review, has_review: item.has_review };
        });
        setEligibleForReview(eligibleData);
        
        const reviewsData = {};
        for (const item of response.data) {
          if (item.has_review) {
            try {
              const reviewRes = await axios.get(`/reviews/reservation/${item.id}/`);
              reviewsData[item.id] = reviewRes.data;
            } catch (e) {
              console.log('Error fetching review:', e);
            }
          }
        }
        setReviews(reviewsData);
      } else if (userName) {
        const response = await axios.get(`/reviews/eligible/?username=${encodeURIComponent(userName)}`);
        const eligibleData = {};
        response.data.forEach(item => {
          eligibleData[item.id] = { eligible: !item.has_review, has_review: item.has_review };
        });
        setEligibleForReview(eligibleData);
      }
    } catch (err) {
      console.log('Error fetching eligible for review:', err);
    }
  };

  const fetchReservations = async () => {
    try {
      const userEmail = localStorage.getItem('customer_email');
      const userName = localStorage.getItem('customer_username');
      
      let foundReservations = [];
      
      // First try to find by email using the user reservations endpoint
      if (userEmail) {
        try {
          const response = await axios.get(`/user/reservations/?email=${encodeURIComponent(userEmail)}`);
          if (response.data && response.data.length > 0) {
            foundReservations = response.data;
          }
        } catch (err) {
          console.log('Email search failed:', err.message);
        }
      }

      // If not found by email, try username
      if (foundReservations.length === 0 && userName) {
        try {
          const response = await axios.get(`/user/reservations/?username=${encodeURIComponent(userName)}`);
          if (response.data && response.data.length > 0) {
            foundReservations = response.data;
          }
        } catch (err) {
          console.log('Username search failed:', err.message);
        }
      }

      // Only show customer's own reservations - do NOT fetch all
      setReservations(foundReservations);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError('Failed to load reservations. Please try again.');
      setLoading(false);
    }
  };

  const downloadInvoice = (reservationId) => {
    const downloadUrl = `http://localhost:8000/api/invoices/${reservationId}/download/`;
    window.open(downloadUrl, '_blank');
  };

  const getStatusStyle = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return { background: '#d4edda', color: '#155724', padding: '4px 12px', borderRadius: '4px' };
      case 'pending':
        return { background: '#fff3cd', color: '#856404', padding: '4px 12px', borderRadius: '4px' };
      case 'cancelled':
        return { background: '#f8d7da', color: '#721c24', padding: '4px 12px', borderRadius: '4px' };
      default:
        return { background: '#e2e3e5', color: '#383d41', padding: '4px 12px', borderRadius: '4px' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const openReviewModal = (reservation) => {
    setSelectedReservation(reservation);
    setShowReviewModal(true);
    setReviewSuccess(false);
    setReviewError('');
    setReviewRating(5);
    setReviewText('');
  };

  const submitReview = async () => {
    if (!selectedReservation) return;
    
    if (!reviewText || reviewText.trim().length < 5) {
      setReviewError('Please write at least 5 characters in your review.');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    
    try {
      await axios.post('/reviews/', {
        reservation: selectedReservation.id,
        rating: reviewRating,
        review_text: reviewText
      });
      
      setReviewSuccess(true);
      fetchEligibleForReview();
      
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSuccess(false);
      }, 2000);
    } catch (err) {
      const data = err?.response?.data;
      let message = 'Failed to submit review. Please try again.';
      if (typeof data === 'string') {
        message = data;
      } else if (data?.error) {
        message = data.error;
      } else if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const firstVal = firstKey ? data[firstKey] : null;
        if (Array.isArray(firstVal) && firstVal.length > 0) {
          message = String(firstVal[0]);
        } else if (firstVal) {
          message = String(firstVal);
        }
      }
      setReviewError(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const isEligibleForReview = (reservation) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkoutDate = reservation?.check_out ? new Date(reservation.check_out) : null;
    const checkoutDay = checkoutDate
      ? new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate())
      : null;
    const statusNormalized = String(reservation?.status || "").toLowerCase().replace(/[^a-z]/g, "");
    const isCheckedOut = statusNormalized === "checkedout";
    return (!!checkoutDay && checkoutDay <= today) || isCheckedOut;
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      // Update localStorage with new values
      localStorage.setItem('customer_username', profileData.username);
      localStorage.setItem('customer_email', profileData.email);
      
      // Try to update on backend if userprofile exists
      try {
        await axios.put('/userprofile/', {
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address
        });
      } catch (err) {
        // If userprofile doesn't exist, create it
        try {
          await axios.post('/userprofile/', {
            email: profileData.email,
            phone: profileData.phone,
            address: profileData.address
          });
        } catch (createErr) {
          console.log('Could not update userprofile:', createErr);
        }
      }
      
      setProfileSaveSuccess(true);
      setIsEditingProfile(false);
      setTimeout(() => setProfileSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_access_token');
    localStorage.removeItem('customer_refresh_token');
    localStorage.removeItem('customer_username');
    localStorage.removeItem('customer_email');
    localStorage.removeItem('customer_role');
    localStorage.removeItem('customer_id');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading your reservations...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>My Profile</h2>
          <p style={styles.sidebarEmail}>{email}</p>
        </div>
        <nav style={styles.sidebarNav}>
          <Link to="/" style={styles.backButton}>← Back to Home</Link>
          <a href="#profile" style={styles.sidebarLink}>👤 Edit Profile</a>
          <a href="#invoices" style={styles.sidebarLink}>📄 Download Invoice</a>
          <a href="#reviews" style={styles.sidebarLink}>⭐ Give Review</a>
          <button onClick={handleLogout} style={styles.sidebarLogout}>🚪 Logout</button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {error && <div style={styles.error}>{error}</div>}

        {/* Quick Actions - Three Big Clickable Cards */}
        <div style={styles.quickActions}>
          <a href="#profile" style={styles.actionCard}>
            <span style={styles.actionIcon}>👤</span>
            <span style={styles.actionTitle}>Edit Profile</span>
            <span style={styles.actionDesc}>Update your personal information</span>
          </a>
          
          <a href="#reviews" style={styles.actionCard}>
            <span style={styles.actionIcon}>⭐</span>
            <span style={styles.actionTitle}>Give Review</span>
            <span style={styles.actionDesc}>Rate your stay experience</span>
          </a>
          
          <a href="#invoices" style={styles.actionCard}>
            <span style={styles.actionIcon}>📄</span>
            <span style={styles.actionTitle}>Download Invoice</span>
            <span style={styles.actionDesc}>Get your booking invoices</span>
          </a>
        </div>

        {/* Edit Profile Section */}
        <div style={styles.section} id="profile">
          <h2 style={styles.sectionTitle}>Edit Profile</h2>
          
          <div style={styles.profileForm}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Username</label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                style={styles.formInput}
                disabled={!isEditingProfile}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                style={styles.formInput}
                disabled={!isEditingProfile}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                style={styles.formInput}
                placeholder="Enter phone number"
                disabled={!isEditingProfile}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Address</label>
              <textarea
                value={profileData.address}
                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                style={styles.formTextarea}
                placeholder="Enter address"
                rows={3}
                disabled={!isEditingProfile}
              />
            </div>
            
            <div style={styles.formButtons}>
              {isEditingProfile ? (
                <>
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    style={styles.saveBtn}
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    style={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  style={styles.editBtn}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Give Review Section */}
        <div style={styles.section} id="reviews">
          <h2 style={styles.sectionTitle}>Give Review</h2>
          
          {reservations.filter(r => isEligibleForReview(r)).length === 0 ? (
            <div style={styles.emptyState}>
              <p>No completed stays available for review yet.</p>
              <p style={{color: '#888', fontSize: '14px', marginTop: '8px'}}>
                You can give a review after your check-out date.
              </p>
            </div>
          ) : (
            <div style={styles.reviewList}>
              {reservations
                .filter(r => isEligibleForReview(r))
                .map((reservation) => (
                  <div key={reservation.id} style={styles.reviewCard}>
                    <div style={styles.reviewHeader}>
                      <div>
                        <span style={styles.reviewBookingId}>Booking #{reservation.id}</span>
                        <span style={getStatusStyle(reservation.status)}>{reservation.status}</span>
                      </div>
                      <span style={styles.reviewDate}>
                        {formatDate(reservation.check_in)} - {formatDate(reservation.check_out)}
                      </span>
                    </div>
                    
                    <div style={styles.reviewActions}>
                      {eligibleForReview[reservation.id]?.has_review ? (
                        <div style={styles.reviewedBadge}>
                          <span style={styles.star}>★</span> You reviewed this stay
                        </div>
                      ) : (
                        <button 
                          onClick={() => openReviewModal(reservation)}
                          style={styles.reviewBtn}
                        >
                          ⭐ Write a Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Download Invoice Section */}
        <div style={styles.section} id="reservations">
          <h2 style={styles.sectionTitle}>Booking History</h2>
          
          {reservations.length === 0 ? (
            <div style={styles.emptyState}>
              <p>You don't have any reservations yet.</p>
              <Link to="/reservation" style={styles.bookBtn}>Book Now</Link>
            </div>
          ) : (
            <div style={styles.reservationList}>
              {reservations.map((reservation) => (
                <div key={reservation.id} style={styles.reservationCard} id="invoices">
                  <div style={styles.cardHeader}>
                    <div>
                      <span style={styles.bookingId}>#{reservation.id}</span>
                      <span style={getStatusStyle(reservation.status)}>{reservation.status}</span>
                    </div>
                    <button 
                      onClick={() => downloadInvoice(reservation.id)}
                      style={styles.downloadBtn}
                    >
                      📄 Download Invoice
                    </button>
                  </div>
                  
                  <div style={styles.cardBody}>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <label style={styles.infoLabel}>Check-in</label>
                        <span style={styles.infoValue}>{formatDate(reservation.check_in)}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <label style={styles.infoLabel}>Check-out</label>
                        <span style={styles.infoValue}>{formatDate(reservation.check_out)}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <label style={styles.infoLabel}>Room Type</label>
                        <span style={styles.infoValue}>{reservation.room_type || 'Standard'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <label style={styles.infoLabel}>Rooms</label>
                        <span style={styles.infoValue}>{reservation.rooms}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <label style={styles.infoLabel}>Guests</label>
                        <span style={styles.infoValue}>Adults: {reservation.adults}, Children: {reservation.children}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <label style={styles.infoLabel}>Total Amount</label>
                        <span style={{...styles.infoValue, ...styles.amount}}>₹{reservation.total_amount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.cardFooter} id="reviews">
                    <span style={styles.dateText}>
                      Booked on: {formatDate(reservation.created_at)}
                    </span>
                    {isEligibleForReview(reservation) && (
                      <div style={styles.reviewSection}>
                        {eligibleForReview[reservation.id]?.has_review ? (
                          <div style={styles.reviewedBadge}>
                            <span style={styles.star}>★</span> You reviewed this stay
                          </div>
                        ) : (
                          <button 
                            onClick={() => openReviewModal(reservation)}
                            style={styles.reviewBtn}
                          >
                            ⭐ Write a Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Reviews Section */}
        <div style={styles.section} id="reviews">
          <h2 style={styles.sectionTitle}>My Reviews</h2>
          {Object.keys(reviews).length === 0 ? (
            <div style={styles.emptyState}>
              <p>You haven't written any reviews yet.</p>
            </div>
          ) : (
            <div style={styles.reviewList}>
              {Object.entries(reviews).map(([reservationId, review]) => (
                <div key={reservationId} style={styles.reviewCard}>
                  <div style={styles.reviewHeader}>
                    <span style={styles.reviewBookingId}>Booking #{reservationId}</span>
                    <div style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} style={{ color: star <= review.rating ? '#ffc107' : '#444' }}>★</span>
                      ))}
                    </div>
                  </div>
                  <p style={styles.reviewText}>{review.review_text}</p>
                  <span style={styles.reviewDate}>
                    Reviewed on: {formatDate(review.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Write a Review</h2>
              <button 
                onClick={() => setShowReviewModal(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {reviewSuccess ? (
                <div style={styles.successMessage}>
                  <span style={styles.successIcon}>✓</span>
                  <p>Thank you for your review!</p>
                </div>
              ) : (
                <>
                  <div style={styles.ratingSection}>
                    <label style={styles.ratingLabel}>Rating</label>
                    <div style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          style={{
                            ...styles.starBtn,
                            color: star <= reviewRating ? '#ffc107' : '#666'
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div style={styles.textSection}>
                    <label style={styles.textLabel}>Your Review</label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience at Eden's Glamp Resort..."
                      style={styles.textarea}
                      rows={5}
                    />
                  </div>
                  
                  {reviewError && (
                    <div style={styles.errorMessage}>{reviewError}</div>
                  )}
                  
                  <button
                    onClick={submitReview}
                    disabled={submittingReview}
                    style={styles.submitBtn}
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
    padding: '40px 20px',
    display: 'flex',
    gap: '30px',
    width: '100%',
    maxWidth: '100%',
    margin: 0,
  },
  sidebar: {
    width: '280px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '30px 20px',
    border: '1px solid rgba(200, 157, 92, 0.2)',
    height: 'fit-content',
    position: 'sticky',
    top: '40px',
  },
  sidebarHeader: {
    textAlign: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(200, 157, 92, 0.3)',
  },
  sidebarTitle: {
    color: '#c89d5c',
    fontSize: '24px',
    marginBottom: '8px',
  },
  sidebarEmail: {
    color: '#bbbbbb',
    fontSize: '14px',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sidebarLink: {
    display: 'block',
    padding: '14px 16px',
    borderRadius: '8px',
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '15px',
    transition: 'all 0.2s',
    background: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    display: 'block',
    padding: '14px 16px',
    borderRadius: '8px',
    color: '#c89d5c',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s',
    background: 'rgba(200, 157, 92, 0.1)',
    border: '1px solid rgba(200, 157, 92, 0.3)',
    marginBottom: '10px',
  },
  sidebarLogout: {
    display: 'block',
    width: '100%',
    padding: '14px 16px',
    borderRadius: '8px',
    color: '#ff6b6b',
    fontSize: '15px',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
    background: 'rgba(255, 107, 107, 0.1)',
    border: 'none',
    marginTop: '20px',
    transition: 'all 0.2s',
  },
  mainContent: {
    flex: 1,
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    background: 'linear-gradient(135deg, rgba(200, 157, 92, 0.15) 0%, rgba(200, 157, 92, 0.05) 100%)',
    border: '1px solid rgba(200, 157, 92, 0.4)',
    borderRadius: '16px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '180px',
  },
  actionIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  actionTitle: {
    color: '#c89d5c',
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  actionDesc: {
    color: '#aaaaaa',
    fontSize: '14px',
    textAlign: 'center',
  },
  section: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '30px',
    border: '1px solid rgba(200, 157, 92, 0.2)',
    marginBottom: '30px',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '24px',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(200, 157, 92, 0.3)',
    paddingBottom: '10px',
  },
  profileForm: {
    maxWidth: '500px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formLabel: {
    display: 'block',
    color: '#c89d5c',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  formInput: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(200, 157, 92, 0.3)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    transition: 'all 0.3s',
  },
  formTextarea: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(200, 157, 92, 0.3)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    transition: 'all 0.3s',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  formButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  editBtn: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #c89d5c 0%, #a67c3d 100%)',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  saveBtn: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  cancelBtn: {
    padding: '14px 32px',
    background: 'transparent',
    color: '#888',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  loading: {
    textAlign: 'center',
    color: '#c89d5c',
    fontSize: '18px',
    padding: '60px',
  },
  error: {
    background: 'rgba(220, 53, 69, 0.1)',
    border: '1px solid #dc3545',
    color: '#dc3545',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#dddddd',
  },
  bookBtn: {
    display: 'inline-block',
    marginTop: '15px',
    background: '#c89d5c',
    color: '#1a1a1a',
    padding: '12px 30px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
  },
  reservationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  reservationCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    background: 'rgba(200, 157, 92, 0.1)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  bookingId: {
    color: '#c89d5c',
    fontWeight: 'bold',
    marginRight: '12px',
  },
  downloadBtn: {
    background: 'rgba(200, 157, 92, 0.2)',
    border: '1px solid rgba(200, 157, 92, 0.4)',
    color: '#c89d5c',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  cardBody: {
    padding: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    color: '#c89d5c',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  infoValue: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '500',
  },
  amount: {
    color: '#c89d5c',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  cardFooter: {
    padding: '15px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: '#bbbbbb',
    fontSize: '13px',
  },
  reviewSection: {
    display: 'flex',
    alignItems: 'center',
  },
  reviewedBadge: {
    background: 'rgba(255, 193, 7, 0.2)',
    color: '#ffc107',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  reviewBtn: {
    background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
    border: 'none',
    color: '#1a1a1a',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  star: {
    color: '#ffc107',
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  reviewCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '20px',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  reviewActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  reviewBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  reviewBookingId: {
    color: '#c89d5c',
    fontWeight: '600',
    fontSize: '14px',
  },
  reviewStars: {
    fontSize: '16px',
  },
  reviewText: {
    color: '#ddd',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '12px',
  },
  reviewDate: {
    color: '#888',
    fontSize: '12px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
    border: '1px solid rgba(200, 157, 92, 0.3)',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '500px',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(200, 157, 92, 0.2)',
  },
  modalTitle: {
    color: '#c89d5c',
    fontSize: '20px',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    lineHeight: 1,
  },
  modalBody: {
    padding: '24px',
  },
  successMessage: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  successIcon: {
    display: 'inline-block',
    width: '60px',
    height: '60px',
    lineHeight: '60px',
    borderRadius: '50%',
    background: 'rgba(40, 167, 69, 0.2)',
    color: '#28a745',
    fontSize: '30px',
    marginBottom: '20px',
  },
  ratingSection: {
    marginBottom: '24px',
  },
  ratingLabel: {
    display: 'block',
    color: '#ddd',
    fontSize: '14px',
    marginBottom: '12px',
  },
  starsContainer: {
    display: 'flex',
    gap: '8px',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    padding: '0',
    transition: 'transform 0.2s',
  },
  textSection: {
    marginBottom: '24px',
  },
  textLabel: {
    display: 'block',
    color: '#ddd',
    fontSize: '14px',
    marginBottom: '12px',
  },
  textarea: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px',
    color: '#ddd',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  errorMessage: {
    background: 'rgba(220, 53, 69, 0.1)',
    border: '1px solid #dc3545',
    color: '#dc3545',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  submitBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #c89d5c 0%, #a67c3d 100%)',
    border: 'none',
    color: '#1a1a1a',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
};
