import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import LiveMap from "../components/map/LiveMap";
import RiskBadge from "../components/ui/RiskBadge";
import useGPS from "../hooks/useGPS";
import API from "../services/api";
import { MapPin, Layers, Sparkles, Navigation, ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";

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
      <div className="page-shell space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl shadow-indigo-500/20 animated-gradient border border-white/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-pink-300" />
              Live Interactive Grid
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>Dynamic Safety Map</span>
            </h1>
            <p className="text-white/90 text-sm mt-1 font-medium max-w-xl">
              Real-time geofence corridors, crime prediction overlays, and safe navigation havens.
            </p>
          </div>
          <div className="shrink-0 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20">
            <RiskBadge level={riskLevel} size="md" />
          </div>
        </div>

        {/* Filter buttons & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 text-xs font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
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
                label: "High Danger",
                count: zoneCounts.danger,
                active: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/35",
              },
            ].map(({ key, label, count, active }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 ${
                  filter === key
                    ? active
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  filter === key ? "bg-white/25 text-white" : "bg-slate-100 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* GPS Status Chip */}
          {location && (
            <div className="px-3.5 py-1.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-mono font-bold flex items-center gap-2 ml-auto shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              <span>{location.lat.toFixed(4)}, {location.lon.toFixed(4)} (±{Math.round(location.accuracy)}m)</span>
            </div>
          )}
        </div>

        {/* Full Map Canvas */}
        <div className="glass p-4 border border-white/90 shadow-2xl shadow-indigo-500/10" style={{ height: "640px" }}>
          <LiveMap
            location={location}
            zones={filteredZones}
            riskLevel={riskLevel}
          />
        </div>

        {/* Colorful Zone Catalog */}
        <div className="glass p-6 border border-white/90 shadow-xl shadow-indigo-500/10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-slate-800 font-black text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>Active Geofence Corridors</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Showing {filteredZones.length} geofence sectors currently monitored in database.
              </p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredZones.length} Sectors
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredZones.map(zone => {
              const isDanger = zone.zone_type === "danger";
              const isModerate = zone.zone_type === "moderate";
              const borderStyle = isDanger
                ? "border-rose-200 hover:border-rose-400 bg-gradient-to-br from-rose-50/50 to-red-50/30"
                : isModerate
                ? "border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50/50 to-orange-50/30"
                : "border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50/50 to-teal-50/30";

              const badgeStyle = isDanger
                ? "bg-rose-500 text-white"
                : isModerate
                ? "bg-amber-500 text-white"
                : "bg-emerald-500 text-white";

              return (
                <div
                  key={zone.id || zone.name}
                  className={`p-4 rounded-2xl border ${borderStyle} shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isDanger ? "bg-red-500 animate-ping" : isModerate ? "bg-orange-500" : "bg-emerald-500"}`} />
                      <h4 className="font-extrabold text-slate-800 text-sm">{zone.name}</h4>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${badgeStyle} shadow-sm`}>
                      {zone.zone_type}
                    </span>
                  </div>

                  <p className="text-slate-500 text-xs line-clamp-2 mb-3">
                    {zone.description || "Monitored geofence corridor with automated intrusion warning."}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 pt-2 border-t border-slate-200/60">
                    <span>Radius: <strong className="text-slate-700 font-bold">{zone.radius}m</strong></span>
                    {zone.latitude && (
                      <span>{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}