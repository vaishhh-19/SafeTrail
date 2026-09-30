import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import API from "../services/api";
import {
  Bell, AlertOctagon, AlertTriangle,
  Shield, Clock, MapPin, CheckCircle
} from "lucide-react";

const typeConfig = {
  danger_zone: {
    icon:  AlertOctagon,
    color: "text-danger",
    bg:    "bg-red-50",
    border:"border-red-200",
    label: "Danger Zone",
  },
  moderate_zone: {
    icon:  AlertTriangle,
    color: "text-moderate",
    bg:    "bg-orange-50",
    border:"border-orange-200",
    label: "Moderate Zone",
  },
  sos: {
    icon:  Bell,
    color: "text-danger",
    bg:    "bg-red-50",
    border:"border-red-200",
    label: "SOS",
  },
};

export default function Alerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    API.get("/api/alert/history")
      .then(res => {
        setAlerts(res.data.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleResolve = async (alertId) => {
    try {
      await API.put(`/api/alert/resolve/${alertId}`);
      setAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, status: "resolved" } : a)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filter === "all"
    ? alerts
    : alerts.filter(a =>
        filter === "active"
          ? a.status === "active"
          : a.alert_type === filter
      );

  return (
    <MainLayout>
      <div className="page-shell space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-100 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-300">
                <Bell className="w-5 h-5" />
              </div>
              <span>Safety Alert Feed</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Geofence intrusion warnings, SOS distress calls, and automated incident logs
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Logged",
              value: alerts.length,
              gradient: "from-indigo-500 to-purple-600",
              card: "card-vibrant-indigo",
              text: "text-indigo-600",
            },
            {
              label: "Active Threats",
              value: alerts.filter(a => a.status === "active").length,
              gradient: "from-rose-500 to-red-600",
              card: "card-vibrant-rose",
              text: "text-rose-600",
              pulse: true,
            },
            {
              label: "Safely Resolved",
              value: alerts.filter(a => a.status === "resolved").length,
              gradient: "from-emerald-500 to-teal-600",
              card: "card-vibrant-emerald",
              text: "text-emerald-600",
            },
            {
              label: "SOS Panic Calls",
              value: alerts.filter(a => a.alert_type === "sos").length,
              gradient: "from-amber-500 to-orange-600",
              card: "card-vibrant-amber",
              text: "text-amber-600",
            },
          ].map(({ label, value, card, text, pulse }) => (
            <div key={label} className={`${card} glass-hover p-4 sm:p-5 rounded-3xl text-center relative overflow-hidden`}>
              {pulse && value > 0 && (
                <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
              )}
              <p className={`text-3xl sm:text-4xl font-extrabold ${text} tracking-tight`}>{value}</p>
              <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mt-2">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap p-2 bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-sm">
          {[
            { key: "all", label: "All Alerts", activeClass: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25" },
            { key: "active", label: "Active Threat", activeClass: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25" },
            { key: "danger_zone", label: "Danger Zones", activeClass: "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-500/25" },
            { key: "sos", label: "SOS Alerts", activeClass: "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/25" },
            { key: "moderate_zone", label: "Moderate Zones", activeClass: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25" },
          ].map(({ key, label, activeClass }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                filter === key
                  ? activeClass
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Alert List */}
        {loading ? (
          <div className="text-center text-slate-500 py-10 animate-pulse">
            Loading alerts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass p-10 text-center">
            <Shield className="w-12 h-12 text-safe mx-auto mb-3" />
            <p className="text-slate-800 font-semibold">No alerts found</p>
            <p className="text-slate-500 text-sm mt-1">
              You haven't triggered any alerts yet — stay safe!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(alert => {
              const cfg = typeConfig[alert.alert_type] || typeConfig.danger_zone;
              const Icon = cfg.icon;
              return (
                <div key={alert.id}
                  className={`glass p-4 border ${cfg.border} flex items-start gap-4`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        alert.status === "active"
                          ? "bg-red-100 text-danger"
                          : "bg-green-100 text-safe"
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-slate-800 text-sm">
                      {alert.message || "Safety alert triggered"}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <MapPin className="w-3 h-3" />
                        {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {alert.status === "active" && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="shrink-0 flex items-center gap-1 bg-green-100 hover:bg-green-100 text-safe text-xs px-3 py-1.5 rounded-xl transition">
                      <CheckCircle className="w-3 h-3" />
                      Resolve
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}