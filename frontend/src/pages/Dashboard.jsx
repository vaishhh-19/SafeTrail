import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/layout/MainLayout";
import LiveMap from "../components/map/LiveMap";
import RiskBadge from "../components/ui/RiskBadge";
import AlertPopup from "../components/ui/AlertPopup";
import useGPS from "../hooks/useGPS";
import useGeofence from "../hooks/useGeofence";
import API from "../services/api";
import {
  MapPin, Navigation, Phone, Clock,
  Wifi, RefreshCw, AlertTriangle
} from "lucide-react";

export default function Dashboard() {
  const { user }                     = useAuth();
  const { location, error, loading } = useGPS();
  const [zones, setZones]            = useState([]);
  const [riskLevel, setRiskLevel]    = useState("safe");
  const [confidence, setConfidence]  = useState(0.95);
  const [lastUpdate, setLastUpdate]  = useState(null);
  const [predicting, setPredicting]  = useState(false);
  const [showAlert, setShowAlert]    = useState(false);
  const [alertZone, setAlertZone]    = useState(null);

  const { activeZone, zoneStatus, justEntered, clearJustEntered } =
    useGeofence(location, zones);

  useEffect(() => {
    API.get("/api/geofence/zones")
      .then(res => setZones(res.data.zones || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (justEntered && justEntered.zone_type !== "safe") {
      setAlertZone(justEntered);
      setShowAlert(true);
      clearJustEntered();
    }
  }, [justEntered, clearJustEntered]);

  useEffect(() => {
    if (!location) return;
    const predict = async () => {
      setPredicting(true);
      try {
        await API.post("/api/user/location", {
          latitude:  location.lat,
          longitude: location.lon,
          accuracy:  location.accuracy,
        });
        const res = await API.post("/api/predict", {
          latitude:  location.lat,
          longitude: location.lon,
        });
        const mlRisk = res.data.risk_level || "safe";
        setRiskLevel(zoneStatus !== "safe" ? zoneStatus : mlRisk);
        setConfidence(res.data.confidence || 0.95);
        setLastUpdate(new Date().toLocaleTimeString());
      } catch {
        setLastUpdate(new Date().toLocaleTimeString());
      } finally {
        setPredicting(false);
      }
    };
    predict();
    const interval = setInterval(predict, 10000);
    return () => clearInterval(interval);
  }, [location, zoneStatus]);

  const emergency = user?.emergency_contacts?.[0];

  return (
    <MainLayout>
      {showAlert && alertZone && (
        <AlertPopup
          zone={alertZone}
          user={user}
          onDismiss={() => { setShowAlert(false); setAlertZone(null); }}
          onSOS={() => { setShowAlert(false); setAlertZone(null); }}
        />
      )}

      <div className="page-shell space-y-6">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-indigo-500/25 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 animated-gradient border border-white/20">
          <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute right-24 bottom-0 w-40 h-40 rounded-full bg-cyan-400/25 blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-10 w-48 h-48 rounded-full bg-pink-400/20 blur-2xl pointer-events-none" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs uppercase tracking-[0.2em] font-extrabold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Protection
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Welcome, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-white/90 text-sm sm:text-base mt-2 max-w-xl font-medium">
                SafeTrail neural defense is continuously scanning your geofence and route safety.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              {predicting ? (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-semibold shadow-md">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Analyzing Area...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-semibold shadow-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                  <span>Live & Protected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone Banner — only for danger/moderate */}
        {activeZone && activeZone.zone_type !== "safe" && (
          <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 shadow-lg ${
            activeZone.zone_type === "danger"
              ? "bg-gradient-to-r from-red-500/15 via-rose-500/15 to-red-500/20 border-red-300 text-danger shadow-red-500/10"
              : "bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-yellow-500/20 border-orange-300 text-moderate shadow-orange-500/10"
          }`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              activeZone.zone_type === "danger" ? "bg-red-500 text-white shadow-md shadow-red-300" : "bg-orange-500 text-white shadow-md shadow-orange-300"
            }`}>
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="font-extrabold text-base">Caution: Entered {activeZone.name}</p>
              <p className="text-sm opacity-90 font-medium">
                Zone classification: <span className="uppercase font-bold">{activeZone.zone_type}</span> • Center distance: {activeZone.distance}m
              </p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Risk Level Card */}
          <div className="card-vibrant-indigo glass-hover p-6 rounded-3xl text-center relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
            <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Current Safety Status
            </p>
            <div className="py-2">
              <RiskBadge level={riskLevel} size="lg" />
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Model Confidence</span>
              <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* GPS Location Card */}
          <div className="card-vibrant-cyan glass-hover p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-cyan-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> GPS Geolocation
              </p>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                <Navigation className="w-3.5 h-3.5" />
              </div>
            </div>

            {loading && <p className="text-cyan-600 text-sm font-semibold animate-pulse py-2">Acquiring satellite lock...</p>}
            {error && <p className="text-rose-600 text-sm font-semibold py-2">{error}</p>}
            {location && (
              <div className="space-y-2">
                <div className="bg-white/80 border border-cyan-200/80 rounded-2xl p-2.5 shadow-sm">
                  <p className="text-slate-800 font-mono text-sm font-bold tracking-tight">
                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Accuracy: <strong className="text-cyan-700">±{Math.round(location.accuracy)}m</strong></span>
                  {lastUpdate && (
                    <span className="flex items-center gap-1 text-slate-400 font-medium">
                      <Clock className="w-3 h-3 text-cyan-600" /> {lastUpdate}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact Card */}
          <div className="card-vibrant-rose glass-hover p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-rose-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Guardian Contact
              </p>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                <Phone className="w-3.5 h-3.5" />
              </div>
            </div>

            {emergency ? (
              <div className="space-y-2.5">
                <div>
                  <p className="text-slate-900 font-extrabold text-base">{emergency.name}</p>
                  <p className="text-rose-600 font-mono text-xs font-semibold">{emergency.phone}</p>
                </div>
                <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-300 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-emerald-800 text-xs font-bold">Auto-SOS Alert Linked</p>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="text-slate-400 text-xs">No primary contact added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Map */}
        <div className="glass p-5 border border-white/90 shadow-xl shadow-indigo-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-300">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-slate-800 font-extrabold text-base sm:text-lg">Real-Time Geofence Radar</h2>
                <p className="text-xs text-slate-400">Bangalore Metropolitan Safety Grid</p>
              </div>
            </div>
            {location && (
              <span className="text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-full shadow-md shadow-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-white rounded-full animate-ping inline-block" />
                Live Tracking Active
              </span>
            )}
          </div>
          <div style={{ height: "460px" }} className="rounded-2xl overflow-hidden border border-indigo-100">
            <LiveMap location={location} zones={zones} riskLevel={riskLevel} />
          </div>
        </div>

        {/* Zone Legend */}
        <div className="glass p-5 border border-white/90">
          <h3 className="text-slate-800 font-extrabold mb-3 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Safety Zone Classifications
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                color: "bg-emerald-500",
                bgGradient: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800",
                label: "Safe Haven",
                desc: "High lighting & police patrol",
              },
              {
                color: "bg-amber-500",
                bgGradient: "from-amber-50 to-orange-50 border-amber-200 text-amber-800",
                label: "Moderate Caution",
                desc: "Sparse lighting or reports",
              },
              {
                color: "bg-rose-500",
                bgGradient: "from-rose-50 to-red-50 border-rose-200 text-rose-800",
                label: "High Danger",
                desc: "Automated alert triggers",
              },
              {
                color: "bg-indigo-600",
                bgGradient: "from-indigo-50 to-purple-50 border-indigo-200 text-indigo-800",
                label: "Your Pin",
                desc: "Real-time user coordinates",
              },
            ].map(({ color, bgGradient, label, desc }) => (
              <div key={label} className={`p-3 rounded-2xl border bg-gradient-to-br ${bgGradient} flex items-start gap-3 shadow-sm`}>
                <div className={`w-3.5 h-3.5 rounded-full ${color} shrink-0 mt-0.5 shadow-sm`} />
                <div>
                  <p className="font-bold text-xs">{label}</p>
                  <p className="text-[10px] opacity-75 mt-0.5 leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}