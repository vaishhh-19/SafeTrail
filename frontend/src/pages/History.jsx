import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import API from "../services/api";
import {
  History, MapPin, Clock, Navigation,
  AlertOctagon, Shield, Sparkles, ExternalLink
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
    danger_zone:   { label:"High Danger Sector",   color:"text-rose-600",   bg:"bg-rose-500 text-white"   },
    moderate_zone: { label:"Caution Corridor",     color:"text-amber-600",  bg:"bg-amber-500 text-white"  },
    sos:           { label:"SOS Panic Distress",   color:"text-red-600",    bg:"bg-red-600 text-white animate-pulse" },
  };

  const mapsUrl = (lat, lon) => `https://maps.google.com/?q=${lat},${lon}`;

  return (
    <MainLayout>
      <div className="page-shell space-y-6 max-w-4xl mx-auto">

        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20 animated-gradient border border-white/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-cyan-200" />
              Audit Log & Timeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>Safety History & Tracks</span>
            </h1>
            <p className="text-white/90 text-sm mt-1 font-medium max-w-xl">
              Chronological log of GPS breadcrumbs, boundary violations, and emergency distress broadcasts.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Breadcrumbs Logged",
              value: locations.length,
              card: "card-vibrant-cyan",
              text: "text-cyan-700",
            },
            {
              label: "Boundary Alerts",
              value: alerts.length,
              card: "card-vibrant-amber",
              text: "text-amber-700",
            },
            {
              label: "SOS Panic Calls",
              value: alerts.filter(a => a.alert_type === "sos").length,
              card: "card-vibrant-rose",
              text: "text-rose-700",
            },
          ].map(({ label, value, card, text }) => (
            <div key={label} className={`${card} glass-hover p-5 rounded-3xl text-center shadow-sm`}>
              <p className={`text-3xl font-black ${text}`}>{value}</p>
              <p className="text-slate-600 text-xs font-extrabold uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm">
          {[
            { key: "locations", label: "Location Breadcrumbs", icon: Navigation },
            { key: "alerts",    label: "Incident & Threat History", icon: AlertOctagon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-200 ${
                tab === key
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse font-bold">
            Retrieving safety audit log...
          </div>
        ) : (
          <>
            {/* Location History */}
            {tab === "locations" && (
              <div className="space-y-3">
                {locations.length === 0 ? (
                  <div className="glass p-12 text-center border border-white/90">
                    <Navigation className="w-12 h-12 text-cyan-300 mx-auto mb-3" />
                    <p className="text-slate-800 font-extrabold text-base">No location history recorded yet</p>
                    <p className="text-slate-400 text-xs mt-1">
                      As you navigate with SafeTrail, periodic coordinates will be recorded here.
                    </p>
                  </div>
                ) : (
                  locations.map((loc, i) => (
                    <div
                      key={loc.id || i}
                      className="glass p-4 rounded-2xl border border-white/90 hover:shadow-md transition flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-slate-800 font-mono text-sm font-bold">
                            {Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}
                          </p>
                          {loc.accuracy && (
                            <p className="text-cyan-700 text-xs font-semibold">
                              Accuracy: ±{Math.round(loc.accuracy)}m
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold justify-end">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <a
                          href={mapsUrl(loc.latitude, loc.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-indigo-600 font-extrabold text-xs hover:text-indigo-800"
                        >
                          <span>Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
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
                  <div className="glass p-12 text-center border border-white/90">
                    <Shield className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                    <p className="text-slate-800 font-extrabold text-base">No boundary alerts triggered</p>
                    <p className="text-slate-400 text-xs mt-1">
                      No dangerous geofence violations or SOS distress calls in your log.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert, i) => {
                    const cfg = alertTypeConfig[alert.alert_type] || alertTypeConfig.danger_zone;
                    return (
                      <div
                        key={alert.id || i}
                        className="glass p-5 rounded-2xl border border-white/90 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`w-10 h-10 rounded-2xl ${cfg.bg} flex items-center justify-center shrink-0 shadow-md`}>
                            <AlertOctagon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className={`text-sm font-black ${cfg.color}`}>
                              {cfg.label}
                            </p>
                            <p className="text-slate-800 text-sm font-medium mt-0.5">
                              {alert.message || "Safety boundary intrusion recorded"}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-semibold">
                              {alert.latitude && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-indigo-500" />
                                  {Number(alert.latitude).toFixed(4)}, {Number(alert.longitude).toFixed(4)}
                                </span>
                              )}
                              <a
                                href={mapsUrl(alert.latitude, alert.longitude)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5"
                              >
                                Maps <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 sm:self-center">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            alert.status === "active" ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}>
                            {alert.status}
                          </span>
                          <p className="text-slate-400 text-xs font-medium mt-1">
                            {new Date(alert.timestamp).toLocaleDateString()}
                          </p>
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