import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import {
  Activity, AlertOctagon, BarChart3, Bell, CheckCircle, ChevronRight,
  CircleDot, LogOut, Map as MapIcon, MapPin, MessageSquare, Plus,
  Radio, Shield, Trash2, Users, X, Route, RefreshCw
} from "lucide-react";

const DEFAULT_CENTER = [12.9716, 77.5946];
const SOS_TYPE_LABELS = {
  medical: "Medical", fire: "Fire", crime: "Crime", harassment: "Harassment",
  accident: "Accident", other: "Other"
};

function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    let layer;
    let cancelled = false;
    import("leaflet.heat").then(() => {
      if (cancelled || !L.heatLayer) return;
      layer = L.heatLayer(points.map(p => [p[0], p[1], p[2] || 0.6]), {
        radius: 28, blur: 20, maxZoom: 17, minOpacity: 0.35
      }).addTo(map);
    });
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

function AdminMap({ alerts, zones, liveOnly = false, heat = false }) {
  const visibleAlerts = liveOnly
    ? alerts.filter(a => a.status === "active" && a.alert_type === "sos")
    : alerts;
  const points = visibleAlerts
    .filter(a => a.latitude != null && a.longitude != null)
    .map(a => [Number(a.latitude), Number(a.longitude), a.alert_type === "sos" ? 1 : 0.55]);

  const center = points.length ? [points[0][0], points[0][1]] : DEFAULT_CENTER;
  return (
    <div className="h-[430px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {heat && <HeatLayer points={points} />}
        {zones.map(z => (
          <Circle key={z.id} center={[Number(z.latitude), Number(z.longitude)]} radius={Number(z.radius || 100)}
            pathOptions={{ color: z.zone_type === "danger" ? "#ef4444" : z.zone_type === "moderate" ? "#f59e0b" : "#22c55e", fillOpacity: 0.16 }}>
            <Popup><strong>{z.name}</strong><br />{z.zone_type.toUpperCase()} zone<br />Radius: {z.radius}m</Popup>
          </Circle>
        ))}
        {!heat && visibleAlerts.filter(a => a.latitude != null && a.longitude != null).map(a => (
          <CircleMarker key={a.id} center={[Number(a.latitude), Number(a.longitude)]} radius={a.alert_type === "sos" ? 10 : 7}
            pathOptions={{ color: a.alert_type === "sos" ? "#dc2626" : "#f59e0b", fillColor: a.alert_type === "sos" ? "#ef4444" : "#f59e0b", fillOpacity: 0.85 }}>
            <Popup>
              <strong>{a.alert_type === "sos" ? "🚨 SOS" : "⚠️ Alert"}</strong><br />
              {a.sos_type ? SOS_TYPE_LABELS[a.sos_type] : "Danger zone"}<br />
              Status: {a.status}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [zoneForm, setZoneForm] = useState({ name: "", zone_type: "danger", latitude: "", longitude: "", radius: 150, description: "" });
  const [savingZone, setSavingZone] = useState(false);
  const [toast, setToast] = useState("");
  const [roadIntel, setRoadIntel] = useState(null);
  const [areaIntel, setAreaIntel] = useState(null);

  const loadData = async () => {
    try {
      const [a, u, f, al, z, ri, ai] = await Promise.all([
        API.get("/api/admin/analytics"), API.get("/api/admin/users"),
        API.get("/api/admin/feedback"), API.get("/api/admin/alerts"),
        API.get("/api/geofence/zones"), API.get("/api/admin/road-intelligence"), API.get("/api/admin/area-intelligence")
      ]);
      setAnalytics(a.data.analytics);
      setUsers(u.data.users || []);
      setFeedback(f.data.feedback || []);
      setAlerts(al.data.alerts || []);
      setZones(z.data.zones || []);
      setRoadIntel({ metrics: ri.data.metrics || {}, segments: ri.data.road_segments || [], meta: ri.data.meta || {} });
      setAreaIntel({ areas: ai.data.areas || [], meta: ai.data.meta || {}, modelMetrics: ai.data.model_metrics || {} });
    } catch (e) {
      console.error("Admin load failed", e);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i); }, []);

  const activeSOS = alerts.filter(a => a.alert_type === "sos" && a.status === "active");
  const dangerAlerts = alerts.filter(a => a.alert_type === "danger_zone");
  const dangerRoads = useMemo(() => {
    const groups = {};
    alerts.filter(a => a.latitude != null && a.longitude != null).forEach(a => {
      const key = `${Number(a.latitude).toFixed(3)},${Number(a.longitude).toFixed(3)}`;
      if (!groups[key]) groups[key] = { lat: Number(a.latitude), lon: Number(a.longitude), count: 0, sos: 0 };
      groups[key].count += 1;
      if (a.alert_type === "sos") groups[key].sos += 1;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [alerts]);

  const handleLogout = () => { logout(); navigate("/admin/login", { replace: true }); };
  const mapsLink = (lat, lon) => `https://maps.google.com/?q=${lat},${lon}`;

  const deactivate = async id => { await API.put(`/api/admin/users/${id}/deactivate`); setUsers(p => p.map(u => u.id === id ? { ...u, is_active: false } : u)); };
  const activate = async id => { await API.put(`/api/admin/users/${id}/activate`); setUsers(p => p.map(u => u.id === id ? { ...u, is_active: true } : u)); };
  const resolveAlert = async id => { await API.put(`/api/alert/resolve/${id}`); setAlerts(p => p.map(a => a.id === id ? { ...a, status: "resolved" } : a)); };
  const approveFeedback = async id => { await API.put(`/api/admin/feedback/${id}/approve`); setFeedback(p => p.map(f => f.id === id ? { ...f, status: "approved" } : f)); };
  const rejectFeedback = async id => { await API.put(`/api/admin/feedback/${id}/reject`); setFeedback(p => p.map(f => f.id === id ? { ...f, status: "rejected" } : f)); };

  const addZone = async e => {
    e.preventDefault(); setSavingZone(true);
    try {
      const payload = { ...zoneForm, latitude: Number(zoneForm.latitude), longitude: Number(zoneForm.longitude), radius: Number(zoneForm.radius) };
      const res = await API.post("/api/geofence/zones", payload);
      setZones(p => [...p, { ...payload, id: res.data.id, is_active: true }]);
      setZoneForm({ name: "", zone_type: "danger", latitude: "", longitude: "", radius: 150, description: "" });
      setToast("Safety zone created"); setTimeout(() => setToast(""), 2500);
    } catch (e) { setToast(e.response?.data?.error || "Could not create zone"); setTimeout(() => setToast(""), 3000); }
    finally { setSavingZone(false); }
  };
  const deleteZone = async id => {
    if (!window.confirm("Remove this zone?")) return;
    await API.delete(`/api/geofence/zones/${id}`);
    setZones(p => p.filter(z => z.id !== id));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-violet-600 animate-pulse">Loading SafeTrail Admin…</p></div>;

  const nav = [
    ["overview", "Dashboard", BarChart3], ["heatmap", "Heatmap", MapIcon], ["live", "Live SOS", Radio],
    ["roads", "Danger Roads", Route], ["areas", "Area Intelligence", MapPin], ["zones", "Zone Management", CircleDot], ["users", "User Management", Users], ["feedback", "Feedback", MessageSquare]
  ];
  const statCards = [
    ["How many people used the app", analytics?.total_users ?? 0, Users, "from registered users", "from-indigo-50 to-violet-50", "text-indigo-600"],
    ["Alerts were triggered", analytics?.total_alerts ?? 0, Bell, "all safety alerts", "from-amber-50 to-orange-50", "text-orange-600"],
    ["SOS pressed", analytics?.sos_alerts ?? 0, AlertOctagon, "emergency activations", "from-red-50 to-rose-50", "text-red-600"],
    ["Feedback reports", analytics?.total_feedback ?? 0, MessageSquare, "reports received", "from-cyan-50 to-blue-50", "text-cyan-600"]
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/60 text-slate-800">
      {toast && <div className="fixed top-5 right-5 z-[1000] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl text-sm">{toast}</div>}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 px-5 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center shadow-lg"><Shield className="w-5 h-5" /></div><div><h1 className="font-black text-lg">SafeTrail Admin</h1><p className="text-xs text-slate-400">Safety Operations Center</p></div></div>
        <div className="flex items-center gap-3"><span className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-600"><Activity className="w-4 h-4" /> Live monitoring</span><button onClick={() => navigate("/admin/profile")} className="hidden sm:block text-sm font-semibold text-slate-500 hover:text-violet-600">Admin Profile</button><button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"><LogOut className="w-4 h-4" /> Logout</button></div>
      </header>

      <div className="max-w-[1500px] mx-auto p-4 lg:p-7 grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white rounded-3xl border border-slate-200 p-3 h-fit lg:sticky lg:top-24 shadow-sm">
          <p className="px-3 pt-2 pb-3 text-[10px] uppercase tracking-[.18em] text-slate-400 font-bold">Control panel</p>
          <div className="space-y-1">{nav.map(([key, label, Icon]) => <button key={key} onClick={() => setTab(key)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition ${tab === key ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md" : "text-slate-500 hover:bg-violet-50 hover:text-violet-700"}`}><Icon className="w-4 h-4" />{label}<ChevronRight className="w-3 h-3 ml-auto opacity-50" /></button>)}</div>
        </aside>

        <main className="min-w-0 space-y-6">
          {tab === "overview" && <>
            <div><p className="text-sm font-semibold text-violet-600">Overview</p><h2 className="text-3xl font-black mt-1">Safety at a glance</h2><p className="text-slate-500 mt-1">One screen for the numbers that matter most.</p></div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{statCards.map(([label, value, Icon, sub, bg, color]) => <div key={label} className={`bg-gradient-to-br ${bg} border border-white rounded-3xl p-5 shadow-sm`}><div className="flex justify-between"><div className={`w-11 h-11 rounded-2xl bg-white flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div><span className="text-xs font-bold text-slate-400">LIVE</span></div><p className={`text-4xl font-black mt-5 ${color}`}>{value}</p><p className="font-bold text-sm mt-1">{label}</p><p className="text-xs text-slate-400 mt-1">{sub}</p></div>)}</div>
            <div className="grid xl:grid-cols-[1.5fr_1fr] gap-5"><section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm"><div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-lg">Incident heatmap</h3><p className="text-xs text-slate-400">Concentration of recorded alerts</p></div><button onClick={() => setTab("heatmap")} className="text-violet-600 text-sm font-bold">Open map →</button></div><AdminMap alerts={alerts} zones={zones} heat /></section><section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm"><div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-lg">Live SOS</h3><p className="text-xs text-slate-400">Currently active emergencies</p></div><span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">{activeSOS.length} active</span></div>{activeSOS.slice(0,5).map(a => <div key={a.id} className="flex items-center gap-3 py-3 border-b last:border-0 border-slate-100"><div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Radio className="w-4 h-4" /></div><div className="flex-1"><p className="text-sm font-bold">{SOS_TYPE_LABELS[a.sos_type] || "Emergency"}</p><p className="text-xs text-slate-400">{new Date(a.timestamp).toLocaleString()}</p></div><a className="text-xs font-bold text-violet-600" href={mapsLink(a.latitude,a.longitude)} target="_blank" rel="noreferrer">Map</a></div>)}{!activeSOS.length && <div className="py-12 text-center text-slate-400 text-sm">No active SOS incidents</div>}</section></div>
          </>}

          {tab === "heatmap" && <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm"><div className="mb-5"><h2 className="text-2xl font-black">Incident Heatmap</h2><p className="text-sm text-slate-400">Areas with more recorded alerts appear with greater intensity.</p></div><AdminMap alerts={alerts} zones={zones} heat /></section>}

          {tab === "live" && <section className="space-y-5"><div><h2 className="text-2xl font-black">Live SOS Map</h2><p className="text-sm text-slate-400">Only active SOS incidents are shown here. Data refreshes automatically.</p></div><AdminMap alerts={alerts} zones={zones} liveOnly />{activeSOS.length > 0 && <div className="grid md:grid-cols-2 gap-4">{activeSOS.map(a => <div key={a.id} className="bg-white rounded-3xl border border-red-100 p-5 shadow-sm"><div className="flex justify-between"><div><p className="text-red-600 font-black">🚨 {SOS_TYPE_LABELS[a.sos_type] || "SOS"}</p><p className="text-xs text-slate-400 mt-1">{new Date(a.timestamp).toLocaleString()}</p></div><button onClick={() => resolveAlert(a.id)} className="text-xs px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold"><CheckCircle className="inline w-3 h-3 mr-1"/>Resolve</button></div><p className="text-sm text-slate-600 mt-3">{a.message || "Emergency alert triggered."}</p><a href={mapsLink(a.latitude,a.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-violet-600"><MapPin className="w-3 h-3"/>Open location</a></div>)}</div>}</section>}

          {tab === "roads" && (
            <section className="space-y-5">
              <div>
                <h2 className="text-2xl font-black">Danger Roads</h2>
                <p className="text-sm text-slate-400">
                  Road-segment risk learned from historical incidents and calibrated with the global ML model.
                </p>
              </div>

              {roadIntel && roadIntel.metrics && roadIntel.metrics.global && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    ["Global precision", roadIntel.metrics.global.precision],
                    ["Road-calibrated precision", roadIntel.metrics.road_calibrated && roadIntel.metrics.road_calibrated.precision],
                    ["Road segments", roadIntel.meta && (roadIntel.meta.segment_count || (roadIntel.segments || []).length)],
                    ["Training samples", roadIntel.meta && (roadIntel.meta.training_rows || roadIntel.metrics.training_samples)]
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-400 font-semibold">{label}</p>
                      <p className="text-2xl font-black text-violet-700 mt-1">
                        {typeof value === "number" && value <= 1 ? `${(value * 100).toFixed(1)}%` : (value ?? "—")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                <AdminMap alerts={dangerAlerts} zones={zones} />
                <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {dangerRoads.map((r, i) => (
                    <div key={`${r.lat}-${r.lon}`} className="border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${r.count >= 5 ? "bg-red-100 text-red-600" : r.count >= 3 ? "bg-orange-100 text-orange-600" : "bg-amber-50 text-amber-600"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">Hotspot #{i + 1}</p>
                        <p className="text-xs text-slate-400">{r.count} alerts • {r.sos} SOS</p>
                      </div>
                      <a href={mapsLink(r.lat, r.lon)} target="_blank" rel="noreferrer" className="text-xs text-violet-600 font-bold">
                        Open
                      </a>
                    </div>
                  ))}
                  {dangerRoads.length === 0 && (
                    <p className="text-sm text-slate-400">No location-based alerts yet.</p>
                  )}
                </div>

                {roadIntel && Array.isArray(roadIntel.segments) && roadIntel.segments.length > 0 && (
                  <div className="mt-5">
                    <h3 className="font-bold mb-3">Trained road segments</h3>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {roadIntel.segments.slice(0, 12).map((r) => (
                        <div key={r.road_segment_id} className="border border-slate-100 rounded-2xl p-4">
                          <div className="flex justify-between items-start gap-3">
                            <p className="font-bold text-sm">{r.road_segment_id}</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.danger_rate >= 0.66 ? "bg-red-50 text-red-600" : r.danger_rate >= 0.33 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                              {Math.round(r.danger_rate * 100)}% risk
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            {r.sample_count} training incidents • {r.danger_count} danger • {r.night_incidents} night
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "areas" && (
            <section className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-violet-600">Area Intelligence</p>
                <h2 className="text-2xl font-black">Area-by-area safety precision</h2>
                <p className="text-sm text-slate-400">
                  Every learned area has its own historical risk profile and
                  evaluation metrics. New named areas in the training data are
                  picked up automatically.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 font-semibold">Areas learned</p>
                  <p className="text-3xl font-black text-violet-700 mt-1">{areaIntel?.areas?.length || 0}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 font-semibold">Global precision</p>
                  <p className="text-3xl font-black text-indigo-700 mt-1">
                    {areaIntel?.modelMetrics?.global?.precision != null
                      ? `${(areaIntel.modelMetrics.global.precision * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 font-semibold">Area-calibrated precision</p>
                  <p className="text-3xl font-black text-emerald-700 mt-1">
                    {areaIntel?.modelMetrics?.area_calibrated?.precision != null
                      ? `${(areaIntel.modelMetrics.area_calibrated.precision * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-400 font-semibold">Training samples</p>
                  <p className="text-3xl font-black text-orange-600 mt-1">
                    {areaIntel?.meta?.training_rows || 0}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(areaIntel?.areas || []).map((a) => {
                  const ev = a.evaluation || {};
                  const risk = Number(a.danger_rate || 0);

                  return (
                    <div key={a.area_name} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-lg">
                            {a.area_name.replaceAll("_", " ")}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {a.sample_count} training incidents
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          risk >= 0.66
                            ? "bg-red-50 text-red-600"
                            : risk >= 0.33
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {Math.round(risk * 100)}% risk
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[10px] text-slate-400">Precision</p>
                          <p className="font-black text-sm">
                            {ev.precision != null ? `${(ev.precision * 100).toFixed(1)}%` : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[10px] text-slate-400">Recall</p>
                          <p className="font-black text-sm">
                            {ev.recall != null ? `${(ev.recall * 100).toFixed(1)}%` : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[10px] text-slate-400">F1</p>
                          <p className="font-black text-sm">
                            {ev.f1 != null ? `${(ev.f1 * 100).toFixed(1)}%` : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 text-xs text-slate-500 space-y-1">
                        <p>🚨 Danger incidents: <b>{a.danger_count}</b></p>
                        <p>🌙 Night incidents: <b>{a.night_incidents}</b></p>
                        <p>📍 Centre: {a.centroid_lat}, {a.centroid_lon}</p>
                      </div>

                      <a
                        href={mapsLink(a.centroid_lat, a.centroid_lon)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex mt-4 text-xs font-bold text-violet-600"
                      >
                        Open area on map →
                      </a>
                    </div>
                  );
                })}
              </div>

              {!areaIntel?.areas?.length && (
                <div className="bg-white rounded-3xl p-10 text-center text-slate-400">
                  No area intelligence available. Run ML training first.
                </div>
              )}
            </section>
          )}

          {tab === "zones" && <section className="space-y-5"><div><h2 className="text-2xl font-black">Zone Management</h2><p className="text-sm text-slate-400">Create and remove safe, moderate and danger zones.</p></div><div className="grid xl:grid-cols-[360px_1fr] gap-5"><form onSubmit={addZone} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3"><h3 className="font-bold">Add new zone</h3>{[["name","Zone name","text"],["latitude","Latitude","number"],["longitude","Longitude","number"],["radius","Radius (m)","number"]].map(([k,l,t])=><label key={k} className="block"><span className="text-xs font-bold text-slate-500">{l}</span><input required={k!=="radius"} type={t} value={zoneForm[k]} onChange={e=>setZoneForm({...zoneForm,[k]:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-200" /></label>)}<label className="block"><span className="text-xs font-bold text-slate-500">Risk type</span><select value={zoneForm.zone_type} onChange={e=>setZoneForm({...zoneForm,zone_type:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="danger">Danger</option><option value="moderate">Moderate</option><option value="safe">Safe</option></select></label><label className="block"><span className="text-xs font-bold text-slate-500">Description</span><textarea value={zoneForm.description} onChange={e=>setZoneForm({...zoneForm,description:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" rows="3" /></label><button disabled={savingZone} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold rounded-xl py-3 flex justify-center gap-2">{savingZone?<RefreshCw className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>}Add Zone</button></form><div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm"><AdminMap alerts={alerts} zones={zones}/><div className="mt-4 space-y-2">{zones.map(z=><div key={z.id} className="flex items-center gap-3 border border-slate-100 rounded-2xl p-3"><div className={`w-3 h-3 rounded-full ${z.zone_type === "danger" ? "bg-red-500" : z.zone_type === "moderate" ? "bg-amber-500" : "bg-emerald-500"}`}/><div className="flex-1"><p className="font-bold text-sm">{z.name}</p><p className="text-xs text-slate-400">{z.zone_type} • {z.radius}m</p></div><button onClick={()=>deleteZone(z.id)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-4 h-4"/></button></div>)}</div></div></div></section>}

          {tab === "users" && <section className="space-y-4"><div><h2 className="text-2xl font-black">User Management</h2><p className="text-sm text-slate-400">Registered users and account status.</p></div><div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"><div className="p-4 border-b border-slate-100 font-bold">{users.length} registered users</div>{users.map(u=><div key={u.id} className="p-4 flex items-center gap-4 border-b last:border-0 border-slate-100"><div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black">{(u.name||"U").charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="font-bold truncate">{u.name}</p><p className="text-xs text-slate-400 truncate">{u.email} • {u.phone}</p></div><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.is_active?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{u.is_active?"Active":"Disabled"}</span><span className="hidden sm:inline px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">{u.role}</span>{u.is_active?<button onClick={()=>deactivate(u.id)} className="text-xs font-bold text-red-600">Disable</button>:<button onClick={()=>activate(u.id)} className="text-xs font-bold text-emerald-600">Enable</button>}</div>)}</div></section>}

          {tab === "feedback" && <section className="space-y-4"><div><h2 className="text-2xl font-black">Feedback Reports</h2><p className="text-sm text-slate-400">Review reports submitted by users.</p></div>{feedback.map(f=><div key={f.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm"><div className="flex gap-4"><div className="flex-1"><div className="flex items-center gap-2"><span className="text-amber-400">{"★".repeat(Number(f.rating||0))}</span><span className="text-xs px-2 py-1 rounded-full bg-slate-100">{f.status}</span></div><p className="font-semibold mt-2">{f.comment}</p>{f.address&&<p className="text-xs text-slate-400 mt-1">📍 {f.address}</p>}<p className="text-xs text-slate-400 mt-2">{new Date(f.timestamp).toLocaleString()}</p></div>{f.status === "pending" && <div className="flex gap-2"><button onClick={()=>approveFeedback(f.id)} className="h-fit px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">Approve</button><button onClick={()=>rejectFeedback(f.id)} className="h-fit px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">Reject</button></div>}</div></div>)}{!feedback.length&&<div className="bg-white rounded-3xl p-10 text-center text-slate-400">No feedback reports yet.</div>}</section>}
        </main>
      </div>
    </div>
  );
}
