import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Shield, Map, Bell, Phone, MessageSquare,
  History, LogOut, User, LayoutDashboard, X, Sparkles
} from "lucide-react";

const userNavItems = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    gradient: "from-indigo-500 to-blue-600",
    shadow: "shadow-indigo-500/25",
  },
  {
    to: "/map",
    icon: Map,
    label: "Live Map",
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/25",
  },
  {
    to: "/alerts",
    icon: Bell,
    label: "Alerts",
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/25",
  },
  {
    to: "/sos",
    icon: Phone,
    label: "SOS Panic",
    gradient: "from-rose-500 to-red-600",
    shadow: "shadow-rose-500/35",
    badge: "LIVE",
  },
  {
    to: "/feedback",
    icon: MessageSquare,
    label: "Feedback",
    gradient: "from-purple-500 to-fuchsia-600",
    shadow: "shadow-purple-500/25",
  },
  {
    to: "/history",
    icon: History,
    label: "History",
    gradient: "from-cyan-500 to-blue-600",
    shadow: "shadow-cyan-500/25",
  },
  {
    to: "/profile",
    icon: User,
    label: "Profile",
    gradient: "from-pink-500 to-rose-600",
    shadow: "shadow-pink-500/25",
  },
];

const adminNavItems = [
  {
    to: "/admin",
    icon: Shield,
    label: "Admin Panel",
    gradient: "from-indigo-600 to-purple-600",
    shadow: "shadow-indigo-500/25",
  },
  {
    to: "/admin/profile",
    icon: User,
    label: "Admin Profile",
    gradient: "from-pink-500 to-rose-600",
    shadow: "shadow-pink-500/25",
  },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNavItems : userNavItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 min-h-screen bg-white/90 backdrop-blur-2xl border-r border-white/80 shadow-[10px_0_40px_-20px_rgba(99,102,241,0.2)] flex flex-col
          fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-indigo-100/70 flex items-center justify-between bg-gradient-to-r from-white via-indigo-50/30 to-pink-50/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl brand-gradient animated-gradient flex items-center justify-center shadow-lg shadow-indigo-500/30 float-soft">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight gradient-text block">SafeTrail</span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-500 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-pink-500 inline" /> Smart Safety
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-800 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="mx-3 mt-4 p-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-100/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-300">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-indigo-600/80 truncate font-medium">{user?.email}</p>
            </div>
            {isAdmin && (
              <span className="ml-auto shrink-0 text-[10px] font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, gradient, shadow, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:translate-x-1"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isActive
                        ? "bg-white/20 text-white shadow-inner"
                        : `bg-gradient-to-br ${gradient} text-white shadow-md ${shadow} group-hover:scale-110`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isActive
                          ? "bg-white text-rose-600 animate-pulse"
                          : "bg-rose-500 text-white shadow-sm shadow-rose-300 animate-pulse"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-indigo-100/70 bg-gradient-to-b from-transparent to-rose-50/20">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-500 hover:text-white transition-all duration-200 w-full border border-rose-200/80 hover:border-transparent hover:shadow-md hover:shadow-rose-400/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
