import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import API from "../services/api";
import {
  Bell, AlertOctagon, AlertTriangle,
  Shield, Clock, MapPin, CheckCircle, Sparkles, Filter
} from "lucide-react";

const typeConfig = {
  danger_zone: {
    icon:   AlertOctagon,
    color:  "text-rose-600",
    border: "border-rose-300",
    bg:     "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25",
    label:  "High Danger Corridor",
  },
  moderate_zone: {
    icon:   AlertTriangle,
    color:  "text-amber-600",
    border: "border-amber-300",
    bg:     "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25",
    label:  "Caution Sector",
  },
  sos: {
    icon:   Bell,
    color:  "text-red-600",
    border: "border-red-400",
    bg:     "bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-md shadow-red-500/35 animate-pulse",
    label:  "SOS Distress Call",
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
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-xl shadow-rose-500/20 animated-gradient border border-white/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-amber-200" />
              Automated Incident Feed
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>Safety Threat Stream</span>
            </h1>
            <p className="text-white/90 text-sm mt-1 font-medium max-w-xl">
              Geofence intrusion warnings, SOS distress dispatches, and automated boundary hazard triggers.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Incidents",
              value: alerts.length,
              card: "card-vibrant-indigo",
              text: "text-indigo-600",
            },
            {
              label: "Active Threats",
              value: alerts.filter(a => a.status === "active").length,
              card: "card-vibrant-rose",
              text: "text-rose-600",
              pulse: true,
            },
            {
              label: "Resolved Safely",
              value: alerts.filter(a => a.status === "resolved").length,
              card: "card-vibrant-emerald",
              text: "text-emerald-600",
            },
            {
              label: "SOS Panic Calls",
              value: alerts.filter(a => a.alert_type === "sos").length,
              card: "card-vibrant-amber",
              text: "text-amber-600",
            },
          ].map(({ label, value, card, text, pulse }) => (
            <div key={label} className={`${card} glass-hover p-5 rounded-3xl text-center relative overflow-hidden`}>
              {pulse && value > 0 && (
                <span className="absolute top-3.5 right-3.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
              )}
              <p className={`text-3xl sm:text-4xl font-black ${text} tracking-tight`}>{value}</p>
              <p className="text-slate-600 text-xs font-extrabold uppercase tracking-wider mt-2">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap p-2.5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm">
          {[
            { key: "all", label: "All Incidents", activeClass: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25" },
            { key: "active", label: "Active Threats Only", activeClass: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25" },
            { key: "danger_zone", label: "Danger Corridors", activeClass: "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-500/25" },
            { key: "sos", label: "SOS Alerts", activeClass: "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/25" },
            { key: "moderate_zone", label: "Caution Sectors", activeClass: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25" },
          ].map(({ key, label, activeClass }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 ${
                filter === key
                  ? activeClass
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Alert List */}
        {loading ? (
          <div className="text-center text-slate-500 py-12 animate-pulse font-bold">
            Scanning incident feed...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass p-12 text-center border border-white/90">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-md">
              <Shield className="w-8 h-8" />
            </div>
            <p className="text-slate-800 font-extrabold text-lg">No incidents reported</p>
            <p className="text-slate-500 text-sm mt-1">
              Your route and geofence areas are all clear. Stay safe!
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filtered.map(alert => {
              const cfg = typeConfig[alert.alert_type] || typeConfig.danger_zone;
              const Icon = cfg.icon;
              const isActive = alert.status === "active";

              return (
                <div
                  key={alert.id}
                  className={`glass p-5 border ${isActive ? cfg.border : "border-slate-200"} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:scale-[1.008]`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-extrabold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-rose-100 text-rose-700 animate-pulse border border-rose-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-slate-800 text-sm font-medium">
                        {alert.message || "Safety boundary trigger"}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-400 flex-wrap">
                        {alert.latitude && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="shrink-0 self-end sm:self-center flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
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