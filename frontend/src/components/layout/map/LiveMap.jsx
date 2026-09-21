import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored icons
const createIcon = (color) => new L.DivIcon({
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:${color};border:3px solid white;
    box-shadow:0 0 8px ${color};
  "></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const userIcon = new L.DivIcon({
  html: `<div style="
    width:24px;height:24px;border-radius:50%;
    background:#0ea5e9;border:3px solid white;
    box-shadow:0 0 12px #0ea5e9;
    animation:pulse 2s infinite;
  "></div>
  <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}</style>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Zone colors
const zoneColors = {
  safe:     "#22c55e",
  moderate: "#f97316",
  danger:   "#ef4444",
};

// Auto-pan map to user location
function MapUpdater({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}

export default function LiveMap({ location, zones = [], riskLevel = "safe" }) {
  const defaultCenter = [12.9716, 77.5946]; // Bangalore
  const center = location ? [location.lat, location.lon] : defaultCenter;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        {/* Dark map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Auto-pan to user */}
        {location && <MapUpdater lat={location.lat} lon={location.lon} />}

        {/* User location marker */}
        {location && (
          <>
            <Marker position={[location.lat, location.lon]} icon={userIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>Your Location</strong><br />
                  Lat: {location.lat.toFixed(6)}<br />
                  Lon: {location.lon.toFixed(6)}<br />
                  Accuracy: ±{Math.round(location.accuracy)}m
                </div>
              </Popup>
            </Marker>

            {/* Accuracy circle */}
            <Circle
              center={[location.lat, location.lon]}
              radius={location.accuracy || 50}
              pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.1, weight: 1 }}
            />
          </>
        )}

        {/* Geofence zones */}
        {zones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.latitude, zone.longitude]}
            radius={zone.radius}
            pathOptions={{
              color:       zoneColors[zone.zone_type] || "#888",
              fillColor:   zoneColors[zone.zone_type] || "#888",
              fillOpacity: 0.15,
              weight:      2,
            }}
          >
            <Popup>
              <strong>{zone.name}</strong><br />
              Type: {zone.zone_type}<br />
              Radius: {zone.radius}m
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}