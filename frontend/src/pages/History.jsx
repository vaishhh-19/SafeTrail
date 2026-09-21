import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import API from "../services/api";
import {
  History, MapPin, Clock, Navigation,
  AlertOctagon, Shield
} from "lucide-react";

export default function HistoryPage() {
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [tab, setTab]             = useState("locations");
  const [loading, setLoading]     = useState(true);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const [locRes, alertRes] = await Promise.all([
        API.get("/api/user/location/history"),
        API.get("/api/alert/history"),
      ]);
      setLocations(locRes.data.locations || []);
      setAlerts(alertRes.data.alerts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const alertTypeConfig = {
    danger_zone:   { label:"Danger Zone",   color:"text-danger",   bg:"bg-red-50"   },
    moderate_zone: { label:"Moderate Zone", color:"text-moderate", bg:"bg-orange-50" },
    sos:           { label:"SOS",           color:"text-danger",   bg:"bg-red-50"   },
  };

  const mapsUrl = (lat, lon) => `https://maps.google.com/?q=${lat},${lon}`;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-brand-500" />
            History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your location history and past alerts
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label:"Locations Tracked", value:locations.length,                                              color:"text-brand-500" },
            { label:"Total Alerts",      value:alerts.length,                                                 color:"text-moderate"  },
            { label:"SOS Triggered",     value:alerts.filter(a => a.alert_type === "sos").length,             color:"text-danger"    },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key:"locations", label:"Location History", icon:Navigation   },
            { key:"alerts",    label:"Alert History",    icon:AlertOctagon },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${
                tab === key
                  ? "bg-brand-100 text-brand-500 border-brand-200"
                  : "bg-white text-slate-500 border-slate-100 hover:bg-slate-100"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">
            Loading history...
          </div>
        ) : (
          <>
            {/* Location History */}
            {tab === "locations" && (
              <div className="space-y-2">
                {locations.length === 0 ? (
                  <div className="glass p-10 text-center">
                    <Navigation className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-800 font-semibold">No location history yet</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Your GPS locations will appear here
                    </p>
                  </div>
                ) : (
                  locations.map((loc, i) => (
                    <div key={loc.id || i}
                      className="glass p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-brand-500" />
                        </div>
                        <div>
                          <p className="text-slate-800 font-mono text-sm">
                            {Number(loc.latitude).toFixed(6)},{" "}
                            {Number(loc.longitude).toFixed(6)}
                          </p>
                          {loc.accuracy && (
                            <p className="text-slate-400 text-xs">
                              Accuracy: ±{Math.round(loc.accuracy)}m
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-slate-400 text-xs justify-end">
                          <Clock className="w-3 h-3" />
                          {new Date(loc.timestamp).toLocaleString()}
                        </div>
                        <a href={mapsUrl(loc.latitude, loc.longitude)}
                          target="_blank" rel="noreferrer"
                          className="text-brand-500 text-xs hover:underline">
                          View on map →
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Alert History */}
            {tab === "alerts" && (
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="glass p-10 text-center">
                    <Shield className="w-12 h-12 text-safe mx-auto mb-3" />
                    <p className="text-slate-800 font-semibold">No alerts triggered</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Stay safe — no danger zones entered
                    </p>
                  </div>
                ) : (
                  alerts.map((alert, i) => {
                    const cfg = alertTypeConfig[alert.alert_type] || alertTypeConfig.danger_zone;
                    return (
                      <div key={alert.id || i} className="glass p-4 border border-slate-100">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0`}>
                              <AlertOctagon className={`w-4 h-4 ${cfg.color}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${cfg.color}`}>
                                {cfg.label}
                              </p>
                              <p className="text-slate-800 text-sm">
                                {alert.message || "Safety alert triggered"}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-slate-400 text-xs flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {Number(alert.latitude).toFixed(4)},{" "}
                                  {Number(alert.longitude).toFixed(4)}
                                </span>
                                <a href={mapsUrl(alert.latitude, alert.longitude)}
                                  target="_blank" rel="noreferrer"
                                  className="text-brand-500 text-xs hover:underline">
                                  Map →
                                </a>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              alert.status === "active"
                                ? "bg-red-100 text-danger"
                                : "bg-green-100 text-safe"
                            }`}>
                              {alert.status}
                            </span>
                            <p className="text-slate-400 text-xs mt-1 flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" />
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}