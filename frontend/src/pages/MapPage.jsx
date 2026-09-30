import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import LiveMap from "../components/map/LiveMap";
import RiskBadge from "../components/ui/RiskBadge";
import useGPS from "../hooks/useGPS";
import API from "../services/api";
import { MapPin, Layers, RefreshCw } from "lucide-react";

export default function MapPage() {
  const { location, error, loading } = useGPS();
  const [zones, setZones]            = useState([]);
  const [filter, setFilter]          = useState("all");
  const [riskLevel, setRiskLevel]    = useState("safe");

  useEffect(() => {
    API.get("/api/geofence/zones")
      .then(res => setZones(res.data.zones || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!location) return;
    API.post("/api/predict", {
      latitude:  location.lat,
      longitude: location.lon,
    })
    .then(res => setRiskLevel(res.data.risk_level || "safe"))
    .catch(() => {});
  }, [location]);

  const filteredZones = filter === "all"
    ? zones
    : zones.filter(z => z.zone_type === filter);

  const zoneCounts = {
    all:      zones.length,
    safe:     zones.filter(z => z.zone_type === "safe").length,
    moderate: zones.filter(z => z.zone_type === "moderate").length,
    danger:   zones.filter(z => z.zone_type === "danger").length,
  };

  return (
    <MainLayout>
      <div className="page-shell space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-100 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-300">
                <MapPin className="w-5 h-5" />
              </div>
              <span>Live Safety Map</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Real-time geofence corridors, high-risk intersections, and safe havens
            </p>
          </div>
          <div>
            <RiskBadge level={riskLevel} size="md" />
          </div>
        </div>

        {/* Filter buttons & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Filter:
            </div>
            {[
              {
                key: "all",
                label: "All Zones",
                count: zoneCounts.all,
                active: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30",
              },
              {
                key: "safe",
                label: "Safe Havens",
                count: zoneCounts.safe,
                active: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30",
              },
              {
                key: "moderate",
                label: "Moderate",
                count: zoneCounts.moderate,
                active: "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/30",
              },
              {
                key: "danger",
                label: "Danger Areas",
                count: zoneCounts.danger,
                active: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/35",
              },
            ].map(({ key, label, count, active }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                  filter === key
                    ? active
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === key ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600 font-extrabold"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* GPS Status */}
          {location && (
            <div className="px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200/70 text-cyan-800 text-xs font-mono font-semibold flex items-center gap-2 ml-auto">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span>{location.lat.toFixed(4)}, {location.lon.toFixed(4)} (±{Math.round(location.accuracy)}m)</span>
            </div>
          )}
        </div>

        {/* Full Map */}
        <div className="glass p-3.5 border border-white/90 shadow-xl shadow-indigo-500/5" style={{ height: "620px" }}>
          <LiveMap
            location={location}
            zones={filteredZones}
            riskLevel={riskLevel}
          />
        </div>

        {/* Zone List */}
        <div className="glass p-5">
          <h3 className="text-slate-800 font-semibold mb-4">
            Zone List ({filteredZones.length})
          </h3>
          <div className="space-y-2">
            {filteredZones.map(zone => (
              <div key={zone.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    zone.zone_type === "danger"   ? "bg-danger" :
                    zone.zone_type === "moderate" ? "bg-moderate" :
                    "bg-safe"
                  }`} />
                  <div>
                    <p className="text-slate-800 text-sm font-medium">{zone.name}</p>
                    <p className="text-slate-400 text-xs">{zone.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    zone.zone_type === "danger"   ? "bg-red-100 text-danger" :
                    zone.zone_type === "moderate" ? "bg-orange-100 text-moderate" :
                    "bg-green-100 text-safe"
                  }`}>
                    {zone.zone_type}
                  </span>
                  <p className="text-slate-400 text-xs mt-1">r: {zone.radius}m</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}