import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard      from "./pages/Dashboard";
import MapPage        from "./pages/MapPage";
import Alerts         from "./pages/Alerts";
import SOS            from "./pages/SOS";
import Feedback       from "./pages/Feedback";
import History        from "./pages/History";
import Profile        from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProfile   from "./pages/AdminProfile";
import AdminLogin     from "./pages/AdminLogin";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-brand-500 text-xl animate-pulse">Loading SafeTrail...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function AdminPublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

// Admin-only pages live at their own routes, kept separate from the
// regular user's Profile/Dashboard so the two personas never overlap.
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-brand-500 text-xl animate-pulse">Loading SafeTrail...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/admin/login" element={<AdminPublicRoute><AdminLogin /></AdminPublicRoute>} />

      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/map"       element={<PrivateRoute><MapPage /></PrivateRoute>} />
      <Route path="/alerts"    element={<PrivateRoute><Alerts /></PrivateRoute>} />
      <Route path="/sos"       element={<PrivateRoute><SOS /></PrivateRoute>} />
      <Route path="/feedback"  element={<PrivateRoute><Feedback /></PrivateRoute>} />
      <Route path="/history"   element={<PrivateRoute><History /></PrivateRoute>} />
      <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />

      <Route path="/admin"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
