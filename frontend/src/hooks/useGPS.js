import { useState, useEffect, useCallback, useRef } from "react";

// Above this accuracy (in meters) a GPS fix is considered too imprecise
// to trust for zone-entry / SOS location purposes.
const MAX_TRUSTED_ACCURACY_M = 100;
// Don't let a stale-but-precise fix linger forever — force-accept a
// newer (even if slightly worse) reading after this many ms.
const MAX_FIX_AGE_MS = 8000;

export default function useGPS() {
  const [location, setLocation] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const lastUpdateRef = useRef(0);

  const updateLocation = useCallback((position) => {
    const accuracy = position.coords.accuracy;
    const now      = Date.now();

    setLocation(prev => {
      // If we already have a materially more precise fix and it's
      // still fresh, don't let a noisier reading replace it — this
      // keeps the displayed/used location as precise as possible.
      if (
        prev &&
        prev.accuracy != null &&
        accuracy > prev.accuracy * 1.5 &&
        now - lastUpdateRef.current < MAX_FIX_AGE_MS
      ) {
        return prev;
      }
      lastUpdateRef.current = now;
      return {
        lat:       position.coords.latitude,
        lon:       position.coords.longitude,
        accuracy,
        isPrecise: accuracy <= MAX_TRUSTED_ACCURACY_M,
        timestamp: new Date().toISOString(),
      };
    });
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err) => {
    setError(err.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    // maximumAge: 0 forces a brand-new GPS fix instead of a cached one,
    // so the very first reading is as precise as the device can give.
    navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    // Tighter maximumAge (was 5000ms) so watchPosition refreses more
    // often and stale/low-precision fixes don't linger on screen.
    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateLocation, handleError]);

  return { location, error, loading };
}