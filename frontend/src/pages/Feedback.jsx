import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import useGPS from "../hooks/useGPS";
import API from "../services/api";
import {
  MessageSquare, MapPin, Star, Send,
  CheckCircle, AlertCircle, Clock, Sparkles, ShieldAlert
} from "lucide-react";

export default function Feedback() {
  const { location } = useGPS();
  const [tab, setTab]         = useState("submit");
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState({
    comment:  "",
    rating:   1,
    address:  "",
  });

  useEffect(() => {
    if (tab === "history") {
      API.get("/api/feedback/my")
        .then(res => setMyFeedback(res.data.feedback || []))
        .catch(() => {});
    }
  }, [tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      setError("GPS location required to submit feedback");
      return;
    }
    if (!form.comment) {
      setError("Please write a comment describing the hazard or area");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post("/api/feedback/submit", {
        latitude:  location.lat,
        longitude: location.lon,
        address:   form.address,
        comment:   form.comment,
        rating:    form.rating,
      });
      setSuccess(true);
      setForm({ comment: "", rating: 1, address: "" });
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setError(e.response?.data?.error || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = {
    1: { label: "Very Unsafe Area",  color: "text-rose-600",   bg: "bg-rose-50 border-rose-200"   },
    2: { label: "Unsafe / Dark",     color: "text-rose-500",   bg: "bg-rose-50/70 border-rose-200" },
    3: { label: "Moderate Caution",  color: "text-amber-600",  bg: "bg-amber-50 border-amber-200"  },
    4: { label: "Fairly Safe",       color: "text-teal-600",   bg: "bg-teal-50 border-teal-200"   },
    5: { label: "Very Safe Haven",   color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
  };

  const statusColors = {
    pending:  "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  };

  return (
    <MainLayout>
      <div className="page-shell space-y-6 max-w-3xl mx-auto">

        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 animated-gradient border border-white/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-pink-200" />
              Community Safety Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>Report Safety Hazards</span>
            </h1>
            <p className="text-white/90 text-sm mt-1 font-medium max-w-xl">
              Crowdsourced hazard reports train our DBSCAN clustering and neural defense system to protect other travelers.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/90 shadow-sm">
          {[
            { id: "submit", label: "Submit New Hazard", icon: ShieldAlert },
            { id: "history", label: "My Submitted Reports", icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-200 ${
                tab === id
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Submit Form */}
        {tab === "submit" && (
          <div className="space-y-4">
            {/* Current GPS Geolocation */}
            <div className="card-vibrant-cyan p-4 rounded-3xl flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
                location ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-400/30" : "bg-rose-500 shadow-rose-400/30"
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                {location ? (
                  <div>
                    <p className="text-emerald-800 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      GPS Coordinate Locked for Report
                    </p>
                    <p className="text-slate-700 text-xs font-mono font-bold mt-0.5">
                      {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-rose-600 text-xs font-bold">
                    GPS not available — please grant location permissions to report.
                  </p>
                )}
              </div>
            </div>

            {success && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-emerald-800 rounded-3xl p-4 shadow-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm font-bold">
                  Report submitted successfully! The administration and AI pipeline will process it to update corridor safety.
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-rose-600 rounded-3xl p-4 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="glass p-6 sm:p-7 border border-white/90 shadow-xl shadow-indigo-500/10 space-y-5">
              {/* Safety Rating */}
              <div>
                <label className="text-slate-800 text-sm font-extrabold mb-2 block">
                  Perceived Safety Rating
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, rating: r })}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all duration-200 ${
                        form.rating === r
                          ? "border-purple-500 bg-gradient-to-br from-purple-500/15 via-pink-500/15 to-purple-500/20 shadow-md scale-105"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <Star
                        className={`w-6 h-6 transition-transform ${
                          form.rating >= r
                            ? "text-amber-400 fill-amber-400 scale-110 drop-shadow-sm"
                            : "text-slate-300"
                        }`}
                      />
                      <span className="text-xs font-black text-slate-700">{r} / 5</span>
                    </button>
                  ))}
                </div>
                {form.rating && (
                  <div className={`mt-3 p-2.5 rounded-xl border text-center font-bold text-xs ${ratingLabels[form.rating].bg} ${ratingLabels[form.rating].color}`}>
                    {ratingLabels[form.rating].label}
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 block">
                  Street Landmark / Nearby Place
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Near KR Market Underpass, 5th Cross"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:bg-white"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 block">
                  Detailed Hazard Description *
                </label>
                <textarea
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  placeholder="e.g. Street lights are completely non-functional, no police presence, aggressive catcalling noticed near the junction..."
                  rows={4}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:bg-white resize-none"
                />
              </div>

              {/* Info banner */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 rounded-2xl p-4">
                <p className="text-purple-800 text-xs font-black mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  How Community Input Affects SafeTrail:
                </p>
                <ul className="text-slate-600 text-xs space-y-1 font-medium">
                  <li>• Verified reports feed the spatial DBSCAN clustering engine</li>
                  <li>• Zone risk classification elevates automatically for other commuters</li>
                  <li>• Alert corridors generate dynamic detour recommendations</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading || !location}
                className="w-full py-4 rounded-2xl brand-gradient animated-gradient text-white font-extrabold shadow-lg shadow-indigo-400/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? "Submitting Intelligence..." : "Submit Hazard Report"}</span>
              </button>
            </form>
          </div>
        )}

        {/* My Reports History */}
        {tab === "history" && (
          <div className="space-y-3.5">
            {myFeedback.length === 0 ? (
              <div className="glass p-12 text-center border border-white/90">
                <MessageSquare className="w-14 h-14 text-purple-300 mx-auto mb-3" />
                <p className="text-slate-800 font-extrabold text-base">No previous hazard reports found</p>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  Your submitted community reports will be logged here with their moderation status.
                </p>
              </div>
            ) : (
              myFeedback.map(fb => (
                <div key={fb.id} className="glass p-5 border border-white/90 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${fb.rating >= s ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusColors[fb.status] || statusColors.pending}`}>
                        {fb.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(fb.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-slate-800 text-sm font-semibold">{fb.comment}</p>
                  {fb.address && (
                    <p className="text-purple-700 text-xs mt-1.5 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" />
                      <span>{fb.address}</span>
                    </p>
                  )}
                  <p className="text-slate-400 text-[11px] mt-1 font-mono">
                    📍 {fb.latitude?.toFixed(4)}, {fb.longitude?.toFixed(4)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </MainLayout>
  );
}