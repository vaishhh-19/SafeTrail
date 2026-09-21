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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-500" />
            Alert History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            All safety alerts triggered for your account
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",    value: alerts.length,                                          color: "text-slate-800"    },
            { label: "Active",   value: alerts.filter(a => a.status === "active").length,       color: "text-danger"   },
            { label: "Resolved", value: alerts.filter(a => a.status === "resolved").length,     color: "text-safe"     },
            { label: "SOS",      value: alerts.filter(a => a.alert_type === "sos").length,      color: "text-moderate" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "danger_zone", "sos", "moderate_zone"].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                filter === f
                  ? "bg-brand-100 text-brand-500 border-brand-200"
                  : "bg-white text-slate-500 border-slate-100 hover:bg-slate-100"
              }`}>
              {f.replace("_", " ").toUpperCase()}
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