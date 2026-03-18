import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  async function fetchGallery() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/gallery/`);
      setImages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load gallery.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    const file = fileInputRef.current.files[0];
    if (!file) {
      setError("Please select an image.");
      return;
    }

    const fd = new FormData();
    fd.append("image", file);

    try {
      await axios.post(`${API_BASE}/api/gallery/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Image uploaded successfully!");
      fileInputRef.current.value = "";
      fetchGallery();
    } catch (err) {
      console.error(err);
      setError("❌ Upload failed.");
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Remove this image? It will no longer be shown in the gallery.")) return;

    try {
      await axios.patch(`${API_BASE}/api/gallery/${id}/delete/`, { is_available: false }, {
        headers: { "Content-Type": "application/json" },
      });
      setMessage("✅ Image removed successfully.");
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to remove image.");
    }
  }

  return (
    <div className="page">
      <style>{`
        :root {
          --bg-dark:#181818;
          --bg-sidebar:#202020;
          --text-light:#f1f1f1;
          --text-muted:#aaa;
          --accent:#c89d5c;
          --card-bg:#2a2a2a;
        }
        *{box-sizing:border-box;font-family:"Segoe UI",sans-serif}
        .page{display:flex;min-height:100vh;background:var(--bg-dark);color:var(--text-light)}
        .sidebar-container{width:220px;min-height:100vh;background:var(--bg-sidebar);padding:20px;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh}
        .sidebar-title{color:var(--accent);font-size:20px;margin-bottom:24px;font-weight:600}
        .sidebar-nav{display:flex;flex-direction:column;flex:1}
        .sidebar-link{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:6px;margin-bottom:4px;transition:all 0.2s ease;display:block}
        .sidebar-link:hover{color:var(--accent);background:rgba(200,157,92,0.1)}
        .sidebar-link.active{background:rgba(200,157,92,0.15);color:var(--accent)}
        .sidebar-logout{margin-top:auto;padding-top:20px;border-top:1px solid #333}
        .sidebar-logout .sidebar-link:hover{background:rgba(200,157,92,0.1)}
        .main-content{flex:1;margin-left:220px;padding:28px;min-height:100vh}
        h1{color:var(--accent);margin-bottom:20px}
        .upload-box{background:var(--card-bg);padding:20px;border-radius:10px;margin-bottom:20px}
        input[type=file]{color:#aaa}
        button{background:var(--accent);border:none;color:#111;padding:8px 16px;border-radius:6px;cursor:pointer}
        button:hover{background:#b98c4f}
        .message{margin-top:10px;font-weight:600}
        .success{color:#9ef59e}
        .error{color:#ff7676}
        .gallery-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
          gap:20px;
        }
        .gallery-item{
          background:var(--card-bg);
          border-radius:10px;
          overflow:hidden;
          position:relative;
        }
        .gallery-item img{
          width:100%;
          height:180px;
          object-fit:cover;
        }
        .delete-btn{
          position:absolute;
          top:10px;
          right:10px;
          background:rgba(0,0,0,0.6);
          border:none;
          color:#fff;
          padding:6px 10px;
          border-radius:4px;
          cursor:pointer;
        }
        .delete-btn:hover{background:#c0392b}
        @media(max-width:900px){
          .sidebar-container{display:none}
          .main-content{margin-left:0;padding:16px}
        }
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
          <a href="/admin/gallery" className="sidebar-link active">Gallery</a>
          <a href="/admin/reviews" className="sidebar-link">Reviews</a>
        </nav>
        <div className="sidebar-logout">
          <a href="/login" className="sidebar-link">Logout</a>
        </div>
      </aside>

      <main className="main-content">
        <h1>Gallery Management</h1>

        <div className="upload-box">
          <form onSubmit={handleUpload}>
            <input type="file" ref={fileInputRef} accept="image/*" />
            <button type="submit" style={{ marginLeft: 10 }}>Upload</button>
          </form>

          {message && <div className={`message success`}>{message}</div>}
          {error && <div className={`message error`}>{error}</div>}
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : images.length > 0 ? (
          <div className="gallery-grid">
            {images.map((img) => (
              <div className="gallery-item" key={img.id}>
                <img
                  src={
                    img.image?.startsWith("http")
                      ? img.image
                      : `${API_BASE}${img.image}`
                  }
                  alt="Gallery"
                />
                <button
                  className="delete-btn"
                  onClick={() => handleRemove(img.id)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No images uploaded yet.</p>
        )}
      </main>
    </div>
  );
}
