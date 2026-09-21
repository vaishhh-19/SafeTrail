import { useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, useMap, ZoomControl
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Pulsing user location icon
const userIcon = new L.DivIcon({
  html: `
    <div style="position:relative;width:30px;height:30px;">
      <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:16px;height:16px;
        background:#0ea5e9;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 0 0 rgba(14,165,233,0.4);
        animation:ripple 1.5s ease-out infinite;
        z-index:2;
      "></div>
      <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:30px;height:30px;
        background:rgba(14,165,233,0.2);
        border-radius:50%;
        animation:ripple-outer 1.5s ease-out infinite;
        z-index:1;
      "></div>
    </div>
    <style>
      @keyframes ripple {
        0%   { box-shadow: 0 0 0 0 rgba(14,165,233,0.6); }
        70%  { box-shadow: 0 0 0 10px rgba(14,165,233,0); }
        100% { box-shadow: 0 0 0 0 rgba(14,165,233,0); }
      }
      @keyframes ripple-outer {
        0%   { opacity:0.6; transform:translate(-50%,-50%) scale(0.5); }
        100% { opacity:0;   transform:translate(-50%,-50%) scale(1.5); }
      }
    </style>
  `,
  className: "",
  iconSize:   [30, 30],
  iconAnchor: [15, 15],
  popupAnchor:[0, -15],
});

const zoneColors = {
  safe:     { color: "#22c55e", fill: "#22c55e" },
  moderate: { color: "#f97316", fill: "#f97316" },
  danger:   { color: "#ef4444", fill: "#ef4444" },
};

// Smoothly pan map to user location
function MapController({ lat, lon }) {
  const map     = useMap();
  const firstRef = useRef(true);

  useEffect(() => {
    if (!lat || !lon) return;
    if (firstRef.current) {
      map.setView([lat, lon], 15, { animate: true });
      firstRef.current = false;
    } else {
      map.panTo([lat, lon], { animate: true, duration: 1 });
    }
  }, [lat, lon, map]);

  return null;
}

export default function LiveMap({ location, zones = [] }) {
  const defaultCenter = [12.9716, 77.5946];
  const center = location ? [location.lat, location.lon] : defaultCenter;

  return (
    <div style={{ height: "100%", width: "100%", borderRadius: "16px", overflow: "hidden" }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
      >
        {/* Google Maps style tile — much better than dark tiles */}
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={["mt0","mt1","mt2","mt3"]}
          attribution="&copy; Google Maps"
          maxZoom={20}
          tileSize={256}
        />

        {/* Zoom control — bottom right */}
        <ZoomControl position="bottomright" />

        {/* Pan to user */}
        {location && (
          <MapController lat={location.lat} lon={location.lon} />
        )}

        {/* User location */}
        {location && (
          <>
            <Marker
              position={[location.lat, location.lon]}
              icon={userIcon}
            >
              <Popup>
                <div style={{ minWidth: "150px" }}>
                  <strong>📍 Your Location</strong><br />
                  Lat: {location.lat.toFixed(6)}<br />
                  Lon: {location.lon.toFixed(6)}<br />
                  Accuracy: ±{Math.round(location.accuracy || 0)}m
                </div>
              </Popup>
            </Marker>

            {/* Accuracy circle */}
            {location.accuracy && location.accuracy < 500 && (
              <Circle
                center={[location.lat, location.lon]}
                radius={location.accuracy}
                pathOptions={{
                  color:       "#0ea5e9",
                  fillColor:   "#0ea5e9",
                  fillOpacity: 0.08,
                  weight:      1,
                  dashArray:   "4",
                }}
              />
            )}
          </>
        )}

        {/* Geofence zones */}
        {zones.map((zone) => {
          const colors = zoneColors[zone.zone_type] || zoneColors.safe;
          return (
            <Circle
              key={zone.id}
              center={[zone.latitude, zone.longitude]}
              radius={zone.radius}
              pathOptions={{
                color:       colors.color,
                fillColor:   colors.fill,
                fillOpacity: 0.15,
                weight:      2,
              }}
            >
              <Popup>
                <div style={{ minWidth: "160px" }}>
                  <strong>{zone.name}</strong><br />
                  <span style={{
                    color: colors.color,
                    fontWeight: "bold",
                    textTransform: "capitalize"
                  }}>
                    {zone.zone_type} Zone
                  </span><br />
                  Radius: {zone.radius}m<br />
                  {zone.description && (
                    <span style={{ color: "#666", fontSize: "12px" }}>
                      {zone.description}
                    </span>
                  )}
                </div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}