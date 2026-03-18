// src/components/admin/AdminRooms.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editForm, setEditForm] = useState({
    room_name: "",
    description: "",
    price: "",
    number_of_rooms: 1,
    capacity: 2,
    is_available: true
  });
  const [editImages, setEditImages] = useState([]);
  const [editPreviewUrls, setEditPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Add room modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    room_name: "",
    description: "",
    price: "",
    number_of_rooms: 1,
    capacity: 2,
    is_available: true
  });
  const [addImages, setAddImages] = useState([]);
  const [addPreviewUrls, setAddPreviewUrls] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    // build preview urls for selected images (edit modal)
    if (!editImages || editImages.length === 0) {
      setEditPreviewUrls([]);
      return;
    }
    const urls = Array.from(editImages).map((f) => URL.createObjectURL(f));
    setEditPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [editImages]);

  useEffect(() => {
    // build preview urls for selected images (add modal)
    if (!addImages || addImages.length === 0) {
      setAddPreviewUrls([]);
      return;
    }
    const urls = Array.from(addImages).map((f) => URL.createObjectURL(f));
    setAddPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [addImages]);

  async function fetchRooms() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/api/rooms/?include_inactive=1`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRooms(data);
    } catch (err) {
      console.error(err);
      setError("Could not fetch rooms. Check API and CORS.");
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(room) {
    setEditingRoom(room);
    setEditForm({
      room_name: room.room_name || room.name || "",
      description: room.description || "",
      price: room.price || room.rate || "",
      number_of_rooms: room.number_of_rooms || 1,
      capacity: room.capacity || 2,
      is_available: room.is_available !== false
    });
    setEditImages([]);
    setEditPreviewUrls([]);
    setEditModalOpen(true);
    setMsg("");
    setError("");
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingRoom(null);
    setEditForm({
      room_name: "",
      description: "",
      price: "",
      number_of_rooms: 1,
      capacity: 2,
      is_available: true
    });
    setEditImages([]);
    setEditPreviewUrls([]);
  }

  function openAddModal() {
    setAddForm({
      room_name: "",
      description: "",
      price: "",
      number_of_rooms: 1,
      capacity: 2,
      is_available: true
    });
    setAddImages([]);
    setAddPreviewUrls([]);
    setAddModalOpen(true);
    setMsg("");
    setError("");
  }

  function closeAddModal() {
    setAddModalOpen(false);
    setAddForm({
      room_name: "",
      description: "",
      price: "",
      number_of_rooms: 1,
      capacity: 2,
      is_available: true
    });
    setAddImages([]);
    setAddPreviewUrls([]);
  }

  function handleAddFiles(e) {
    const files = e.target.files;
    if (!files) return;
    setAddImages(files);
  }

  function handleEditFiles(e) {
    const files = e.target.files;
    if (!files) return;
    setEditImages(files);
  }

  async function handleUpdateRoom(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    // Validate room name
    if (!editForm.room_name || editForm.room_name.trim().length === 0) {
      setError("Room name is required.");
      return;
    }

    // Validate price
    if (!editForm.price || editForm.price.trim().length === 0) {
      setError("Price is required.");
      return;
    }

    const priceNum = parseFloat(editForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price greater than 0.");
      return;
    }

    // Validate capacity
    if (!editForm.capacity || editForm.capacity < 1) {
      setError("Capacity must be at least 1.");
      return;
    }

    if (!editForm.number_of_rooms || editForm.number_of_rooms < 1) {
      setError("Number of rooms must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("room_name", editForm.room_name);
      fd.append("description", editForm.description);
      fd.append("price", editForm.price);
      fd.append("number_of_rooms", editForm.number_of_rooms);
      fd.append("capacity", editForm.capacity);
      fd.append("is_available", editForm.is_available);

      // append new images if any
      if (editImages && editImages.length > 0) {
        Array.from(editImages).forEach((file) => {
          fd.append("images[]", file);
        });
      }

      const roomId = editingRoom.id || editingRoom.room_id;
      const res = await axios.patch(`${API_BASE}/api/rooms/${roomId}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg("✅ Room updated successfully!");
      setTimeout(() => {
        closeEditModal();
        fetchRooms();
      }, 1000);
    } catch (err) {
      console.error(err);
      const text = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message || "Failed to update room";
      setError("❌ " + text);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddRoom(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    // Validate room name
    if (!addForm.room_name || addForm.room_name.trim().length === 0) {
      setError("Room name is required.");
      return;
    }

    // Validate price
    if (!addForm.price || addForm.price.trim().length === 0) {
      setError("Price is required.");
      return;
    }

    const priceNum = parseFloat(addForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price greater than 0.");
      return;
    }

    // Validate capacity
    if (!addForm.capacity || addForm.capacity < 1) {
      setError("Capacity must be at least 1.");
      return;
    }

    if (!addForm.number_of_rooms || addForm.number_of_rooms < 1) {
      setError("Number of rooms must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("room_name", addForm.room_name);
      fd.append("description", addForm.description);
      fd.append("price", addForm.price);
      fd.append("number_of_rooms", addForm.number_of_rooms);
      fd.append("capacity", addForm.capacity);
      fd.append("is_available", addForm.is_available);

      // append images if any
      if (addImages && addImages.length > 0) {
        Array.from(addImages).forEach((file) => {
          fd.append("images[]", file);
        });
      }

      await axios.post(`${API_BASE}/api/rooms/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg("✅ Room added successfully!");
      setTimeout(() => {
        closeAddModal();
        fetchRooms();
      }, 1000);
    } catch (err) {
      console.error(err);
      const text = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err.message || "Failed to add room";
      setError("❌ " + text);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAvailabilityToggle(room) {
    const id = room.id ?? room.room_id;
    const nextAvailability = room.is_available === false;
    const actionLabel = nextAvailability ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${actionLabel} this room?`)) return;
    try {
      await axios.patch(`${API_BASE}/api/rooms/${id}/`, { is_available: nextAvailability }, {
        headers: { "Content-Type": "application/json" },
      });
      setMsg(nextAvailability ? "Room activated successfully." : "Room deactivated successfully.");
      setRooms((prev) =>
        prev.map((r) => ((r.id ?? r.room_id) === id ? { ...r, is_available: nextAvailability } : r))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update room status.");
    }
  }

  // SAFE helper for rendering image thumbnails (handles many shapes)
  function renderPreviewImages(room) {
    const imgs = room.images ?? room.room_images ?? room.images_list ?? [];

    if (Array.isArray(imgs) && imgs.length > 0) {
      return imgs.slice(0, 3).map((img, idx) => {
        let src = null;

        if (typeof img === "string") {
          src = img;
        } else if (img && typeof img === "object") {
          src = img.url ?? img.image ?? img.image_path ?? img.path ?? img.src ?? null;

          if (!src && img.image && typeof img.image === "object") {
            src = img.image.url ?? img.image.path ?? null;
          }
        }

        if (!src || typeof src !== "string") {
          return (
            <div
              key={idx}
              style={{
                width: 80,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#111",
                color: "#777",
                borderRadius: 4,
                marginRight: 6,
                fontSize: 12,
              }}
            >
              No Image
            </div>
          );
        }

        const finalSrc = src.startsWith("http") ? src : src.startsWith("/") ? `${API_BASE}${src}` : `${API_BASE}/${src}`;

        return (
          <img
            key={idx}
            src={finalSrc}
            alt={`room-${idx}`}
            style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 4, marginRight: 6 }}
          />
        );
      });
    }

    const preview = room.preview_image ?? room.image ?? room.image_path ?? room.thumbnail;
    if (preview && typeof preview === "string") {
      const pSrc = preview.startsWith("http") ? preview : preview.startsWith("/") ? `${API_BASE}${preview}` : `${API_BASE}/${preview}`;
      return <img src={pSrc} alt="preview" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 4, marginRight: 6 }} />;
    }

    return <em>No Images</em>;
  }

  return (
    <div>
      <style>{`
        :root {
          --bg-dark: #181818;
          --bg-sidebar: #202020;
          --text-light: #f1f1f1;
          --text-muted: #aaa;
          --accent: #c89d5c;
          --card-bg: #2a2a2a;
        }
        *{box-sizing:border-box;font-family:"Segoe UI",sans-serif}
        body,html,#root{height:100%}
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
        h1{color:var(--accent);margin-bottom:12px}
        label{display:block;color:var(--text-muted);font-size:13px;margin-top:8px}
        input[type="text"], input[type="number"], textarea {width:100%;padding:10px;margin-top:6px;border-radius:6px;border:none;background:#3e3e3e;color:var(--text-light)}
        input[type="file"]{color:var(--text-light);margin-top:8px}
        .form-actions{margin-top:12px}
        .btn{background:var(--accent);color:#111;padding:10px 14px;border-radius:6px;border:none;cursor:pointer}
        .btn:disabled{opacity:0.6;cursor:not-allowed}
        .btn-edit{background:#3b82f6;color:#fff;padding:6px 10px;border-radius:6px;border:none;cursor:pointer;margin-right:6px}
        .btn-toggle{color:#fff;padding:6px 10px;border-radius:6px;border:none;cursor:pointer}
        .btn-toggle.activate{background:#16a34a}
        .btn-toggle.deactivate{background:#e53935}
        table{width:100%;border-collapse:collapse;background:var(--card-bg);border-radius:8px;overflow:hidden}
        th,td{padding:12px;border-bottom:1px solid #333;text-align:left;vertical-align:middle}
        th{color:var(--accent)}
        img.thumb{width:80px;height:60px;object-fit:cover;border-radius:4px;margin-right:6px}
        .message{margin-bottom:12px;font-weight:700}
        .preview-row{display:flex;gap:8px;margin-top:8px}
        .status-badge{display:inline-block;padding:4px 8px;border-radius:4px;font-size:12px}
        .status-available{background:rgba(34,197,94,0.2);color:#22c55e}
        .status-unavailable{background:rgba(239,68,68,0.2);color:#ef4444}
        @media (max-width:900px){
          .main-content{margin-left:0;padding:16px}
          .sidebar-container{display:none}
        }
        
        /* Modal styles */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:999}
        .modal-content{background:#2a2a2a;padding:24px;border-radius:8px;width:500px;max-width:90%;max-height:90vh;overflow-y:auto}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .modal-header h2{color:var(--accent);margin:0}
        .modal-close{background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer}
        .modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
        .checkbox-label{display:flex;align-items:center;gap:8px;margin-top:8px}
        .checkbox-label input{width:auto;margin:0}
      `}</style>

      <div className="page">
        <aside className="sidebar-container">
          <h2 className="sidebar-title">Admin</h2>
          <nav className="sidebar-nav">
            <a href="/admin" className="sidebar-link">Dashboard</a>
            <a href="/admin/reservations" className="sidebar-link">Reservations</a>
            <a href="/admin/rooms" className="sidebar-link active">Rooms</a>
            <a href="/admin/customers" className="sidebar-link">Customers</a>
            <a href="/admin/calendar" className="sidebar-link">Calendar</a>
            <a href="/admin/staff" className="sidebar-link">Staff</a>
            <a href="/admin/gallery" className="sidebar-link">Gallery</a>
            <a href="/admin/reviews" className="sidebar-link">Reviews</a>
          </nav>
          <div className="sidebar-logout">
            <a href="/login" className="sidebar-link">Logout</a>
          </div>
        </aside>

        <main className="main-content">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h1>Manage Rooms</h1>
              <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>Edit room details below. Click "Edit" to modify room information.</p>
            </div>
            <button className="btn" onClick={openAddModal} style={{padding: '12px 20px', fontSize: '14px'}}>+ Add Room</button>
          </div>

          {msg && <div className="message" style={{ color: msg.startsWith("❌") ? "#f97373" : "#9ef59e" }}>{msg}</div>}
          {error && <div className="message" style={{ color: "#ff8a8a" }}>{error}</div>}

          <h2 style={{ marginBottom: 12 }}>All Rooms</h2>

          {loading ? (
            <div className="message muted">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="message muted">No rooms found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Room Name</th>
                  <th>Description</th>
                  <th>Images</th>
                  <th>Price</th>
                  <th>No. of Rooms</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id ?? room.room_id}>
                    <td>{room.id ?? room.room_id}</td>
                    <td style={{ maxWidth: 220, fontWeight: 500 }}>{room.room_name ?? room.name}</td>
                    <td style={{ maxWidth: 360 }}>{room.description ? (room.description.length > 50 ? room.description.substring(0, 50) + "..." : room.description) : "-"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {renderPreviewImages(room)}
                      </div>
                    </td>
                    <td>₹{Number(room.price ?? room.rate ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{room.number_of_rooms ?? 1}</td>
                    <td>{room.capacity ?? "-"}</td>
                    <td>
                      <span className={`status-badge ${room.is_available !== false ? 'status-available' : 'status-unavailable'}`}>
                        {room.is_available !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-edit" onClick={() => openEditModal(room)}>Edit</button>
                      <button className={`btn-toggle ${room.is_available === false ? "activate" : "deactivate"}`} onClick={() => handleAvailabilityToggle(room)}>{room.is_available === false ? "Activate" : "Deactivate"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Room</h2>
              <button className="modal-close" onClick={closeEditModal}>×</button>
            </div>
            
            <form onSubmit={handleUpdateRoom}>
              <label>Room Name:</label>
              <input 
                type="text" 
                value={editForm.room_name} 
                onChange={(e) => setEditForm({...editForm, room_name: e.target.value})} 
                required 
              />

              <label>Description:</label>
              <textarea 
                rows={4} 
                value={editForm.description} 
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              />

              <label>New Images (optional - leave empty to keep existing):</label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleEditFiles} />

              {editPreviewUrls.length > 0 && (
                <div className="preview-row">
                  {editPreviewUrls.map((u, i) => (
                    <img key={i} src={u} alt={`preview-${i}`} className="thumb" />
                  ))}
                </div>
              )}

              <label>Price (₹):</label>
              <input 
                type="number" 
                step="0.01" 
                value={editForm.price} 
                onChange={(e) => setEditForm({...editForm, price: e.target.value})} 
                required 
              />

              <label>Number of Rooms:</label>
              <input 
                type="number" 
                min={1} 
                value={editForm.number_of_rooms}
                onChange={(e) => setEditForm({...editForm, number_of_rooms: Number(e.target.value)})} 
                placeholder="Total rooms of this type"
              />

              <label>Capacity:</label>
              <input 
                type="number" 
                min={1} 
                value={editForm.capacity} 
                onChange={(e) => setEditForm({...editForm, capacity: Number(e.target.value)})} 
              />

              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={editForm.is_available} 
                  onChange={(e) => setEditForm({...editForm, is_available: e.target.checked})}
                />
                Room Available for Booking
              </label>

              {error && <div className="message" style={{ color: "#ff8a8a", marginTop: "10px" }}>{error}</div>}
              {msg && <div className="message" style={{ color: "#9ef59e", marginTop: "10px" }}>{msg}</div>}

              <div className="modal-actions">
                <button type="button" onClick={closeEditModal} style={{ padding: "10px 14px", borderRadius: "6px", background: "#374151", color: "#fff", border: "none", cursor: "pointer" }}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {addModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Room</h2>
              <button className="modal-close" onClick={closeAddModal}>×</button>
            </div>
            
            <form onSubmit={handleAddRoom}>
              <label>Room Name:</label>
              <input 
                type="text" 
                value={addForm.room_name} 
                onChange={(e) => setAddForm({...addForm, room_name: e.target.value})} 
                placeholder="Enter room name"
                required 
              />

              <label>Description:</label>
              <textarea 
                rows={4} 
                value={addForm.description} 
                onChange={(e) => setAddForm({...addForm, description: e.target.value})}
                placeholder="Enter room description"
              />

              <label>Images (optional):</label>
              <input type="file" accept="image/*" multiple onChange={handleAddFiles} />

              {addPreviewUrls.length > 0 && (
                <div className="preview-row">
                  {addPreviewUrls.map((u, i) => (
                    <img key={i} src={u} alt={`preview-${i}`} className="thumb" />
                  ))}
                </div>
              )}

              <label>Price (₹):</label>
              <input 
                type="number" 
                step="0.01" 
                value={addForm.price} 
                onChange={(e) => setAddForm({...addForm, price: e.target.value})} 
                placeholder="Enter price per night"
                required 
              />

              <label>Number of Rooms:</label>
              <input 
                type="number" 
                min={1} 
                value={addForm.number_of_rooms}
                onChange={(e) => setAddForm({...addForm, number_of_rooms: Number(e.target.value)})} 
                placeholder="Total rooms of this type"
              />

              <label>Capacity:</label>
              <input 
                type="number" 
                min={1} 
                value={addForm.capacity} 
                onChange={(e) => setAddForm({...addForm, capacity: Number(e.target.value)})} 
                placeholder="Number of guests"
              />

              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={addForm.is_available} 
                  onChange={(e) => setAddForm({...addForm, is_available: e.target.checked})}
                />
                Room Available for Booking
              </label>

              {error && <div className="message" style={{ color: "#ff8a8a", marginTop: "10px" }}>{error}</div>}
              {msg && <div className="message" style={{ color: "#9ef59e", marginTop: "10px" }}>{msg}</div>}

              <div className="modal-actions">
                <button type="button" onClick={closeAddModal} style={{ padding: "10px 14px", borderRadius: "6px", background: "#374151", color: "#fff", border: "none", cursor: "pointer" }}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? "Adding..." : "Add Room"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




