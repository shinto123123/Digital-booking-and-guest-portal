import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const isCustomerRoute = allowedRoles.includes("customer") || location.pathname === "/profile";

  // Read session from the correct auth scope.
  const token = isCustomerRoute
    ? localStorage.getItem("customer_access_token")
    : localStorage.getItem("staff_access_token");

  const userRole = isCustomerRoute
    ? localStorage.getItem("customer_role")
    : localStorage.getItem("staff_role");

  // Not authenticated - redirect to appropriate login
  if (!token) {
    if (isCustomerRoute) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/staff-admin-login" state={{ from: location }} replace />;
  }

  // If no role is set but token exists, treat as not authenticated
  if (!userRole) {
    // Clear invalid scoped session
    if (isCustomerRoute) {
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_refresh_token');
      localStorage.removeItem('customer_username');
      localStorage.removeItem('customer_email');
      localStorage.removeItem('customer_role');
      localStorage.removeItem('customer_id');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    localStorage.removeItem('staff_access_token');
    localStorage.removeItem('staff_refresh_token');
    localStorage.removeItem('staff_username');
    localStorage.removeItem('staff_role');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('staff_id');
    return <Navigate to="/staff-admin-login" state={{ from: location }} replace />;
  }

  // Check role authorization - if user has a role but it's not in allowedRoles
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Prevent silently sending non-admin users to /staff from /admin URLs.
    // Send them to staff login so they can authenticate with the right role.
    const isAdminRoute = location.pathname.startsWith("/admin");
    if (isAdminRoute && userRole !== "admin") {
      return <Navigate to="/staff-admin-login" state={{ from: location }} replace />;
    }

    // Default fallback by role for non-admin routes
    if (userRole === "admin") return <Navigate to="/admin" replace />;
    if (userRole === "staff") return <Navigate to="/staff" replace />;
    if (userRole === "customer") return <Navigate to="/" replace />;

    // No valid role - clear scoped session and redirect
    if (isCustomerRoute) {
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_refresh_token');
      localStorage.removeItem('customer_username');
      localStorage.removeItem('customer_email');
      localStorage.removeItem('customer_role');
      localStorage.removeItem('customer_id');
      return <Navigate to="/login" replace />;
    }
    localStorage.removeItem('staff_access_token');
    localStorage.removeItem('staff_refresh_token');
    localStorage.removeItem('staff_username');
    localStorage.removeItem('staff_role');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('staff_id');
    return <Navigate to="/staff-admin-login" replace />;
  }

  return children;
}
