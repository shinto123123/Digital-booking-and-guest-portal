import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/reviews/`);
      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/reviews/stats/`);
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const openReplyEditor = (review) => {
    setReplyingTo(review.id);
    setReplyText(review.admin_reply || "");
  };

  const closeReplyEditor = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const submitReply = async (reviewId) => {
    if (!reviewId || !replyText.trim()) return;

    setSubmitting(true);
    try {
      await axios.patch(`${API_BASE}/api/reviews/${reviewId}/`, {
        admin_reply: replyText,
      });
      await fetchReviews();
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      console.error("Error submitting reply:", err);
      alert("Failed to submit reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStars = (rating) => {
    return "\u2605".repeat(Number(rating || 0)) + "\u2606".repeat(5 - Number(rating || 0));
  };

  const getInitials = (name) => {
    const parts = String(name || "Guest").trim().split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || "G"}${parts[1]?.[0] || ""}`.toUpperCase();
  };

  const downloadReviewReport = () => {
    if (!stats) {
      alert("Review stats are not available yet.");
      return;
    }
    setReportGenerating(true);
    try {
      const generatedAt = new Date().toLocaleString("en-IN");
      const rows = [];
      rows.push(["Review Report", "", "", "", "", ""]);
      rows.push(["Generated At", generatedAt, "", "", "", ""]);
      rows.push(["Total Reviews", String(stats.total_reviews || 0), "", "", "", ""]);
      rows.push(["Average Rating", String(stats.average_rating || 0), "", "", "", ""]);
      rows.push(["5-Star", String(stats.rating_distribution?.[5] || 0), "", "", "", ""]);
      rows.push(["4-Star", String(stats.rating_distribution?.[4] || 0), "", "", "", ""]);
      rows.push(["3-Star", String(stats.rating_distribution?.[3] || 0), "", "", "", ""]);
      rows.push(["2-Star", String(stats.rating_distribution?.[2] || 0), "", "", "", ""]);
      rows.push(["1-Star", String(stats.rating_distribution?.[1] || 0), "", "", "", ""]);
      rows.push([]);
      rows.push(["Review ID", "Guest Name", "Room Type", "Rating", "Review Text", "Reviewed On"]);

      reviews.forEach((r) => {
        rows.push([
          String(r.id || ""),
          String(r.guest_name || ""),
          String(r.room_type || ""),
          String(r.rating || ""),
          String((r.review_text || "").replace(/\r?\n/g, " ")),
          String(formatDate(r.created_at)),
        ]);
      });

      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `review_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate review report:", err);
      alert("Failed to generate report.");
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#181818", color: "#f1f1f1" }}>
      <style>{`
        :root{--bg-sidebar:#202020;--card:#2a2a2a;--accent:#c89d5c;--muted:#aaa}
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;display:block}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{color:var(--accent);background:rgba(200,157,92,0.15)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        .page-title{color:var(--accent);font-size:28px;margin-bottom:20px}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px}
        .stat-card{background:var(--card);padding:20px;border-radius:8px;text-align:center}
        .stat-card h4{color:var(--muted);margin-bottom:8px;font-size:14px}
        .stat-card p{font-size:28px;color:var(--accent);font-weight:700}
        .report-box{background:var(--card);border-radius:8px;padding:16px;margin-bottom:20px}
        .comments-list{display:flex;flex-direction:column;gap:16px}
        .comment-item{background:var(--card);border-radius:10px;padding:14px 16px;display:flex;gap:12px}
        .comment-avatar{width:40px;height:40px;border-radius:50%;background:#3b3b3b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
        .comment-body{flex:1}
        .comment-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .comment-name{color:#f5f5f5;font-weight:600}
        .comment-date{color:#9ca3af;font-size:12px}
        .comment-room{color:#8f8f8f;font-size:12px}
        .comment-text{color:#ddd;line-height:1.5;margin-top:6px;white-space:pre-wrap}
        .comment-actions{display:flex;align-items:center;gap:10px;margin-top:8px}
        .comment-rating{color:#ffc107;font-size:13px}
        .reply-btn{background:transparent;border:1px solid #555;color:#ddd;padding:4px 10px;border-radius:999px;cursor:pointer;font-size:12px}
        .reply-btn:hover{border-color:var(--accent);color:var(--accent)}
        .reply-editor{margin-top:10px;display:flex;flex-direction:column;gap:8px}
        .reply-editor textarea{width:100%;padding:10px;border-radius:8px;border:1px solid #444;background:#1f1f1f;color:#fff;min-height:80px;resize:vertical}
        .reply-editor-actions{display:flex;gap:8px}
        .btn-cancel{background:#374151;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer}
        .btn-submit{background:var(--accent);color:#111;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:600}
        .comment-reply{margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);background:rgba(200,157,92,0.1);border-radius:0 8px 8px 0}
        .comment-reply-author{color:var(--accent);font-size:12px;font-weight:700;margin-bottom:4px}
        .comment-reply-text{color:#ddd;line-height:1.5;white-space:pre-wrap}
        .empty-state{text-align:center;padding:60px;color:var(--muted)}
        @media(max-width:900px){.sidebar-container{display:none}.main-content{margin-left:0}.stats-grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <aside className="sidebar-container">
        <h2 className="sidebar-title">Admin</h2>
        <nav className="sidebar-nav">
          <a href="/admin" className="sidebar-link">Dashboard</a>
          <a href="/admin/reservations" className="sidebar-link">Reservations</a>
          <a href="/admin/rooms" className="sidebar-link">Rooms</a>
          <a href="/admin/customers" className="sidebar-link">Customers</a>
          <a href="/admin/calendar" className="sidebar-link">Calendar</a>
          <a href="/admin/staff" className="sidebar-link">Staff</a>
          <a href="/admin/gallery" className="sidebar-link">Gallery</a>
          <a href="/admin/reviews" className="sidebar-link active">Reviews</a>
        </nav>
        <div className="sidebar-logout">
          <a href="/login" className="sidebar-link">Logout</a>
        </div>
      </aside>

      <main className="main-content">
        <h1 className="page-title">Guest Reviews</h1>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card"><h4>Total Reviews</h4><p>{stats.total_reviews}</p></div>
            <div className="stat-card"><h4>Average Rating</h4><p>{stats.average_rating} ?</p></div>
            <div className="stat-card"><h4>5-Star Reviews</h4><p>{stats.rating_distribution?.[5] || 0}</p></div>
            <div className="stat-card"><h4>4-Star Reviews</h4><p>{stats.rating_distribution?.[4] || 0}</p></div>
          </div>
        )}

        {stats && (
          <div className="report-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ color: "var(--accent)", margin: 0, marginBottom: 6 }}>Review Report</h3>
                <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>
                  Export a complete review report with summary and review-level details.
                </p>
              </div>
              <button
                onClick={downloadReviewReport}
                disabled={reportGenerating}
                style={{ background: "var(--accent)", color: "#111", border: "none", padding: "10px 14px", borderRadius: 6, cursor: reportGenerating ? "not-allowed" : "pointer", fontWeight: 600, opacity: reportGenerating ? 0.7 : 1 }}
              >
                {reportGenerating ? "Generating..." : "Download Report (CSV)"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <p>No reviews yet. Reviews will appear here after guests submit them.</p>
          </div>
        ) : (
          <div className="comments-list">
            {reviews.map((review) => (
              <div key={review.id} className="comment-item">
                <div className="comment-avatar">{getInitials(review.guest_name)}</div>
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-name">{review.guest_name || "Guest"}</span>
                    <span className="comment-date">Reviewed on {formatDate(review.created_at)}</span>
                    <span className="comment-room">{review.room_type || "-"} • Stay ended {formatDate(review.check_out)}</span>
                  </div>

                  <div className="comment-text">{review.review_text}</div>

                  <div className="comment-actions">
                    <span className="comment-rating">{renderStars(review.rating)}</span>
                    <button onClick={() => openReplyEditor(review)} className="reply-btn">
                      {review.admin_reply ? "Edit Reply" : "Reply"}
                    </button>
                  </div>

                  {replyingTo === review.id && (
                    <div className="reply-editor">
                      <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write your reply..." />
                      <div className="reply-editor-actions">
                        <button className="btn-cancel" onClick={closeReplyEditor}>Cancel</button>
                        <button className="btn-submit" onClick={() => submitReply(review.id)} disabled={submitting || !replyText.trim()}>
                          {submitting ? "Saving..." : "Save Reply"}
                        </button>
                      </div>
                    </div>
                  )}

                  {review.admin_reply && (
                    <div className="comment-reply">
                      <div className="comment-reply-author">Admin</div>
                      <div className="comment-reply-text">{review.admin_reply}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
