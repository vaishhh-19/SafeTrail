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
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-indigo-200/40 brand-gradient animated-gradient">
          <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-20 bottom-0 w-32 h-32 rounded-full bg-cyan-300/15 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-white/75 text-xs uppercase tracking-[.18em] font-semibold mb-2">Your safety companion</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-white/80 text-sm mt-1">
                Real-time safety monitoring is active around you.
              </p>
            </div>
          <div className="flex items-center gap-2">
            {predicting ? (
              <div className="flex items-center gap-2 text-brand-500 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> Updating...
              </div>
            ) : (
              <div className="flex items-center gap-2 text-safe text-sm">
                <Wifi className="w-4 h-4" /> Live
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Zone Banner — only for danger/moderate */}
        {activeZone && activeZone.zone_type !== "safe" && (
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
            activeZone.zone_type === "danger"
              ? "bg-red-50 border-red-200 text-danger"
              : "bg-orange-50 border-orange-200 text-moderate"
          }`}>
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">You are inside: {activeZone.name}</p>
              <p className="text-sm opacity-80">
                Zone type: {activeZone.zone_type} • Distance from center: {activeZone.distance}m
              </p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass glass-hover p-5 text-center bg-gradient-to-br from-white via-indigo-50/30 to-white">
            <p className="text-slate-500 text-xs mb-3 uppercase tracking-wider">
              Current Risk Level
            </p>
            <RiskBadge level={riskLevel} size="lg" />
            <p className="text-slate-400 text-xs mt-3">
              Confidence: {(confidence * 100).toFixed(0)}%
            </p>
          </div>

          <div className="glass glass-hover p-5 bg-gradient-to-br from-white via-cyan-50/20 to-white">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-brand-500" />
              <p className="text-slate-500 text-xs uppercase tracking-wider">GPS Location</p>
            </div>
            {loading && <p className="text-slate-400 text-sm animate-pulse">Getting your location...</p>}
            {error && <p className="text-danger text-sm">{error}</p>}
            {location && (
              <div className="space-y-1">
                <p className="text-slate-800 font-mono text-sm">
                  {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                </p>
                <p className="text-slate-400 text-xs">Accuracy: ±{Math.round(location.accuracy)}m</p>
                {lastUpdate && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Clock className="w-3 h-3" />Updated: {lastUpdate}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass glass-hover p-5 bg-gradient-to-br from-white via-pink-50/20 to-white">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-danger" />
              <p className="text-slate-500 text-xs uppercase tracking-wider">Emergency Contact</p>
            </div>
            {emergency ? (
              <div>
                <p className="text-slate-800 font-medium">{emergency.name}</p>
                <p className="text-slate-500 text-sm">{emergency.phone}</p>
                <p className="text-slate-400 text-xs mt-1">{emergency.relation}</p>
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                  <p className="text-safe text-xs">✅ Auto-notified if danger detected</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No emergency contact set</p>
            )}
          </div>
        </div>

        {/* Live Map */}
        <div className="glass p-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-brand-500" />
            <h2 className="text-slate-800 font-semibold">Live Location Map</h2>
            {location && (
              <span className="ml-auto text-xs text-safe flex items-center gap-1">
                <span className="w-2 h-2 bg-safe rounded-full animate-pulse inline-block" />
                Tracking Active
              </span>
            )}
          </div>
          <div style={{ height: "450px" }}>
            <LiveMap location={location} zones={zones} riskLevel={riskLevel} />
          </div>
        </div>

        {/* Legend */}
        <div className="glass p-4">
          <h3 className="text-slate-800 font-semibold mb-3 text-sm">Zone Legend</h3>
          <div className="flex flex-wrap gap-6">
            {[
              { color: "bg-safe",      label: "Safe Zone"     },
              { color: "bg-moderate",  label: "Moderate Zone" },
              { color: "bg-danger",    label: "Danger Zone"   },
              { color: "bg-brand-500", label: "Your Location" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-slate-500 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}