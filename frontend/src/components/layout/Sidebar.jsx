import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Shield, Map, Bell, Phone, MessageSquare,
  History, LogOut, User, LayoutDashboard, X
} from "lucide-react";

const userNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/map",       icon: Map,             label: "Live Map"  },
  { to: "/alerts",    icon: Bell,            label: "Alerts"    },
  { to: "/sos",       icon: Phone,           label: "SOS"       },
  { to: "/feedback",  icon: MessageSquare,   label: "Feedback"  },
  { to: "/history",   icon: History,         label: "History"   },
  { to: "/profile",   icon: User,            label: "Profile"   },
];

// Admins get their own, separate nav -- no duplicate "Profile" entry and
// no mixing of regular-user pages with the admin control panel.
const adminNavItems = [
  { to: "/admin",         icon: Shield, label: "Admin Panel"   },
  { to: "/admin/profile", icon: User,   label: "Admin Profile" },
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
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 min-h-screen bg-white/85 backdrop-blur-2xl border-r border-white/70 shadow-[8px_0_30px_-24px_rgba(79,70,229,.45)] flex flex-col
          fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-indigo-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl brand-gradient animated-gradient flex items-center justify-center shadow-lg shadow-indigo-200/60">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight gradient-text">SafeTrail</span>
              <span className="block text-[9px] uppercase tracking-[.18em] text-slate-400 -mt-0.5">Smart Safety</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="mx-3 mt-4 p-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 border border-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            {isAdmin && (
              <span className="ml-auto shrink-0 text-[10px] font-semibold bg-brand-100 text-brand-500 px-2 py-0.5 rounded-full">
                ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === "/admin"} onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 text-indigo-700 font-semibold shadow-sm"
                    : "text-slate-500 hover:bg-indigo-50/60 hover:text-slate-800 hover:translate-x-0.5"
                }`
              }>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-indigo-50/80">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition w-full">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
