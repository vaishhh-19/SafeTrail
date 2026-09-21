import { useState, useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import useGPS from "../hooks/useGPS";
import API from "../services/api";
import {
  MessageSquare, MapPin, Star, Send,
  CheckCircle, AlertCircle, Clock
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
      setError("Please write a comment");
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
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = {
    1: { label: "Very Unsafe",  color: "text-danger"   },
    2: { label: "Unsafe",       color: "text-danger"   },
    3: { label: "Neutral",      color: "text-moderate" },
    4: { label: "Safe",         color: "text-safe"     },
    5: { label: "Very Safe",    color: "text-safe"     },
  };

  const statusColors = {
    pending:  "bg-orange-100 text-moderate",
    approved: "bg-green-100 text-safe",
    rejected: "bg-red-100 text-danger",
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-brand-500" />
            Report Unsafe Area
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your reports help improve safety predictions for everyone
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["submit", "history"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === t
                  ? "bg-brand-100 text-brand-500 border border-brand-200"
                  : "bg-white text-slate-500 hover:bg-slate-100"
              }`}>
              {t === "submit" ? "Submit Report" : "My Reports"}
            </button>
          ))}
        </div>

        {/* Submit Form */}
        {tab === "submit" && (
          <div className="space-y-4">

            {/* Current location */}
            <div className="glass p-4 flex items-center gap-3">
              <MapPin className={`w-5 h-5 ${location ? "text-safe" : "text-danger"}`} />
              <div>
                {location ? (
                  <div>
                    <p className="text-safe text-sm font-medium">
                      📍 Reporting for current location
                    </p>
                    <p className="text-slate-400 text-xs font-mono">
                      {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-danger text-sm">
                    GPS not available — enable location access
                  </p>
                )}
              </div>
            </div>

            {success && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-safe rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4" />
                Report submitted successfully! Admin will review it shortly.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Safety Rating */}
              <div className="glass p-5">
                <label className="text-slate-500 text-sm mb-3 block">
                  How safe did you feel here?
                </label>
                <div className="flex gap-2 justify-between">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} type="button"
                      onClick={() => setForm({ ...form, rating: r })}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition ${
                        form.rating === r
                          ? "border-brand-500 bg-brand-100"
                          : "border-slate-200 bg-white hover:bg-slate-100"
                      }`}>
                      <Star className={`w-5 h-5 ${
                        form.rating >= r ? "text-yellow-400 fill-yellow-400" : "text-slate-500"
                      }`} />
                      <span className="text-xs text-slate-500">{r}</span>
                    </button>
                  ))}
                </div>
                {form.rating && (
                  <p className={`text-center text-sm mt-2 font-medium ${ratingLabels[form.rating].color}`}>
                    {ratingLabels[form.rating].label}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="text-sm text-slate-500 mb-1 block">
                  Address / Landmark (optional)
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Near KR Market bus stop"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm text-slate-500 mb-1 block">
                  Describe what happened *
                </label>
                <textarea
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  placeholder="e.g. I witnessed chain snatching near the market. Two people on a bike snatched a lady's chain and fled..."
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition resize-none"
                />
              </div>

              {/* Info box */}
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                <p className="text-brand-500 text-xs font-medium mb-1">
                  How your report helps:
                </p>
                <ul className="text-slate-500 text-xs space-y-1">
                  <li>• Admin reviews and approves your report</li>
                  <li>• Approved reports are added to ML training data</li>
                  <li>• DBSCAN re-clusters the area as a hotspot</li>
                  <li>• Zone risk level updates automatically</li>
                  <li>• Future users get alerted in this area</li>
                </ul>
              </div>

              <button type="submit" disabled={loading || !location}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </div>
        )}

        {/* My Reports History */}
        {tab === "history" && (
          <div className="space-y-3">
            {myFeedback.length === 0 ? (
              <div className="glass p-10 text-center">
                <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-800 font-semibold">No reports yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Submit your first safety report above
                </p>
              </div>
            ) : (
              myFeedback.map(fb => (
                <div key={fb.id} className="glass p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s}
                          className={`w-4 h-4 ${fb.rating >= s ? "text-yellow-400 fill-yellow-400" : "text-slate-500"}`}
                        />
                      ))}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[fb.status] || statusColors.pending}`}>
                        {fb.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Clock className="w-3 h-3" />
                      {new Date(fb.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-slate-800 text-sm">{fb.comment}</p>
                  {fb.address && (
                    <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{fb.address}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs mt-1 font-mono">
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