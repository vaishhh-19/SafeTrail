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
      <div className="p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-brand-500" />
              Live Safety Map
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              All geofence zones in Bangalore
            </p>
          </div>
          <RiskBadge level={riskLevel} size="md" />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="w-4 h-4 text-slate-500" />
          {[
            { key: "all",      label: `All (${zoneCounts.all})`,           color: "bg-slate-100 text-slate-800"         },
            { key: "safe",     label: `Safe (${zoneCounts.safe})`,         color: "bg-green-100 text-safe"           },
            { key: "moderate", label: `Moderate (${zoneCounts.moderate})`, color: "bg-orange-100 text-moderate"   },
            { key: "danger",   label: `Danger (${zoneCounts.danger})`,     color: "bg-red-100 text-danger"       },
          ].map(({ key, label, color }) => (
            <button key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
                filter === key
                  ? color + " border-slate-300"
                  : "bg-white text-slate-500 border-slate-100 hover:bg-slate-100"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* GPS Status */}
        {loading && (
          <div className="flex items-center gap-2 text-brand-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Getting your location...
          </div>
        )}
        {error && (
          <div className="text-danger text-sm">GPS Error: {error}</div>
        )}
        {location && (
          <div className="text-slate-500 text-xs">
            📍 Your location: {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
            {" "}• Accuracy: ±{Math.round(location.accuracy)}m
          </div>
        )}

        {/* Full Map */}
        <div className="glass p-3" style={{ height: "600px" }}>
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