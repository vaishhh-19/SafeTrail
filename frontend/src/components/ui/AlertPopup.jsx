import { useEffect, useState, useRef } from "react";
import { AlertOctagon, AlertTriangle, X, Phone, Shield, Loader2 } from "lucide-react";
import { triggerSOS } from "../../services/sosService";

const COUNTDOWN_SECONDS = 30;

export default function AlertPopup({ zone, onDismiss, onSOS, user }) {
  const [countdown, setCountdown]   = useState(COUNTDOWN_SECONDS);
  const [sosSent, setSosSent]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [sosOk, setSosOk]           = useState(false);
  const [emailResults, setEmailResults] = useState([]);
  const intervalRef                 = useRef(null);

  const isDanger   = zone?.zone_type === "danger";
  const isModerate = zone?.zone_type === "moderate";

  // Countdown timer — only for danger zones
  useEffect(() => {
    if (!isDanger) return;

    // Vibrate phone if supported
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          handleAutoSOS(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isDanger]);

  // Auto SOS when countdown reaches 0 (or manual button pressed)
  const handleAutoSOS = async (auto = true) => {
    if (sosSent || sending) return;
    setSending(true);
    const { ok, emailResults: results } = await triggerSOS({
      user,
      latitude:  zone?.latitude,
      longitude: zone?.longitude,
      zoneName:  zone?.name,
      auto,
    });
    setEmailResults(results);
    setSosOk(ok);
    setSosSent(true);
    setSending(false);
  };

  // Manual SOS button
  const handleManualSOS = async () => {
    clearInterval(intervalRef.current);
    await handleAutoSOS(false);
    if (onSOS) onSOS();
  };

  // User is safe — dismiss
  const handleSafe = () => {
    clearInterval(intervalRef.current);
    onDismiss();
  };

  const emergency = user?.emergency_contacts?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Popup */}
      <div className={`relative w-full max-w-md rounded-2xl border-2 p-6 shadow-2xl
        ${isDanger
          ? "bg-white border-danger shadow-danger/20"
          : "bg-white border-moderate shadow-moderate/20"
        }`}>

        {/* Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
          ${isDanger ? "bg-red-100" : "bg-orange-100"}`}>
          {isDanger
            ? <AlertOctagon className="w-8 h-8 text-danger" />
            : <AlertTriangle className="w-8 h-8 text-moderate" />
          }
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold text-center mb-2
          ${isDanger ? "text-danger" : "text-moderate"}`}>
          {isDanger ? "⚠️ DANGER ZONE" : "⚠️ Moderate Risk Area"}
        </h2>

        {/* Zone name */}
        <p className="text-slate-800 text-center font-medium mb-1">
          {zone?.name || "Unknown Zone"}
        </p>
        <p className="text-slate-500 text-sm text-center mb-6">
          You have entered a {zone?.zone_type} risk area.
          {isDanger && " Please leave immediately or press SOS."}
        </p>

        {/* Countdown — only for danger */}
        {isDanger && !sosSent && !sending && (
          <div className="mb-6">
            <div className="text-center mb-2">
              <span className={`text-5xl font-bold ${
                countdown <= 10 ? "text-danger animate-pulse" : "text-slate-800"
              }`}>
                {countdown}
              </span>
              <p className="text-slate-500 text-sm mt-1">
                seconds until auto-alert to emergency contact
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-danger h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Sending state */}
        {sending && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
            <p className="text-slate-600 text-sm">Notifying emergency contacts…</p>
          </div>
        )}

        {/* SOS sent confirmation — reflects the real outcome per contact */}
        {sosSent && (
          <div className={`border rounded-xl p-4 mb-4 ${
            sosOk ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"
          }`}>
            <p className={`font-semibold text-center ${sosOk ? "text-danger" : "text-moderate"}`}>
              {sosOk ? "🚨 SOS Alert Sent" : "⚠️ SOS logged, but sending failed"}
            </p>
            {emailResults.length > 0 ? (
              <div className="mt-2 space-y-1">
                {emailResults.map((r, i) => (
                  <p key={i} className="text-slate-500 text-xs text-center">
                    {r.name}{r.phone ? ` (${r.phone})` : ""} —{" "}
                    {r.success ? "email sent ✅" : r.method === "no-email" ? "no email on file ⚠️" : "email failed ❌"}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center mt-1">
                No emergency contacts with an email were found — add one in Profile.
              </p>
            )}
          </div>
        )}

        {/* Emergency contact info */}
        {emergency && !sosSent && (
          <div className="bg-white rounded-xl p-3 mb-4 flex items-center gap-3">
            <Phone className="w-4 h-4 text-danger shrink-0" />
            <div>
              <p className="text-slate-800 text-sm font-medium">
                {emergency.name}
              </p>
              <p className="text-slate-500 text-xs">
                {emergency.phone} • {emergency.relation}
              </p>
            </div>
          </div>
        )}

        {/* Buttons */}
        {!sosSent && (
          <div className="space-y-3">
            {isDanger && (
              <button onClick={handleManualSOS} disabled={sending}
                className="w-full bg-danger hover:bg-red-600 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 text-lg">
                <Phone className="w-5 h-5" />
                {sending ? "Sending…" : "SOS — Notify Emergency Contact Now"}
              </button>
            )}
            <button onClick={handleSafe}
              className="w-full bg-green-100 hover:bg-green-100 text-safe font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              I am Safe — Dismiss
            </button>
          </div>
        )}

        {sosSent && (
          <button onClick={handleSafe}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-xl transition">
            Close
          </button>
        )}
      </div>
    </div>
  );
}