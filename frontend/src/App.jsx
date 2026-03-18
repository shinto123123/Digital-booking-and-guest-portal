import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import Booking from "./components/booking";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminRooms from "./components/admin/AdminRooms";
import AdminReservations from "./components/admin/AdminBookings";
import AdminStaff from "./components/admin/AdminStaff";
import AdminGallery from "./components/admin/AdminGallery";
import AdminReviews from "./components/admin/AdminReviews";
import AdminCustomers from "./components/admin/AdminCustomers";
import AdminCalendar from "./components/admin/AdminCalendar";
import RoomDetails from "./components/RoomDetails";
import Menu from "./components/Menu";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminGuestActivity from "./components/admin/AdminGuestActivity";
import StaffDashboard from "./components/admin/StaffDashboard";
import PaymentSuccess from "./components/PaymentSuccess";
import Profile from "./components/Profile";
import Gallery from "./pages/Gallery";
import StaffLogin from "./components/StaffLogin";
import ProtectedRoute from "./components/ProtectedRoute";


export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/reservation" element={<Booking />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/room/:id" element={<RoomDetails />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/gallery" element={<Gallery />} />

      {/* Auth (still available) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/staff-admin-login" element={<StaffLogin />} />
      <Route path="/staff-login" element={<StaffLogin />} />

      {/* 🚨 ADMIN – PROTECTED ROUTES */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/rooms" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminRooms />
        </ProtectedRoute>
      } />
      <Route path="/admin/reservations" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminReservations />
        </ProtectedRoute>
      } />
      <Route path="/admin/staff" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminStaff />
        </ProtectedRoute>
      } />
      <Route path="/admin/gallery" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminGallery />
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route
        path="/admin/guest-activity"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminGuestActivity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminReviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminCustomers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/calendar"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminCalendar />
          </ProtectedRoute>
        }
      />

      {/* User Profile - Protected for customers only */}
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={["customer"]}>
          <Profile />
        </ProtectedRoute>
      } />

      {/* Staff Portal - PROTECTED */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff", "admin"]}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
