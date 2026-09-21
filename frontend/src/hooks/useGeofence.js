import { useState, useEffect, useCallback } from "react";

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function useGeofence(location, zones) {
  const [activeZone, setActiveZone]     = useState(null);
  const [zoneStatus, setZoneStatus]     = useState("safe");
  const [justEntered, setJustEntered]   = useState(null);
  const [previousZoneId, setPreviousZoneId] = useState(null);

  const checkZones = useCallback(() => {
    if (!location || !zones || zones.length === 0) return;

    // If GPS accuracy is worse than 80m don't trigger any zone alerts —
    // tightened from 150m now that zones themselves are smaller/more
    // precise, so a coarse fix could otherwise misfire against them.
    if (location.accuracy && location.accuracy > 80) {
      setActiveZone(null);
      setZoneStatus("safe");
      return;
    }

    let closestZone   = null;
    let closestDist   = Infinity;
    let currentStatus = "safe";

    for (const zone of zones) {
      const dist = calculateDistance(
        location.lat, location.lon,
        zone.latitude, zone.longitude
      );

      // User must be well inside the zone radius
      if (dist <= zone.radius) {
        if (dist < closestDist) {
          closestDist = dist;
          closestZone = { ...zone, distance: Math.round(dist) };
        }
        if (zone.zone_type === "danger") {
          currentStatus = "danger";
        } else if (zone.zone_type === "moderate" && currentStatus !== "danger") {
          currentStatus = "moderate";
        }
      }
    }

    // Detect zone entry
    const newZoneId = closestZone?.id || null;
    if (newZoneId !== previousZoneId) {
      if (closestZone && closestZone.zone_type !== "safe") {
        setJustEntered(closestZone);
      }
      setPreviousZoneId(newZoneId);
    }

    setActiveZone(closestZone);
    setZoneStatus(currentStatus);

  }, [location, zones, previousZoneId]);

  useEffect(() => {
    checkZones();
  }, [checkZones]);

  const clearJustEntered = useCallback(() => {
    setJustEntered(null);
  }, []);

  return { activeZone, zoneStatus, justEntered, clearJustEntered };
}