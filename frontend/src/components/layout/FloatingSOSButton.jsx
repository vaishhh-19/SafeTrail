import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Phone, X, Loader2, CheckCircle, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useGPS from "../../hooks/useGPS";
import { triggerSOS } from "../../services/sosService";
import SOSTypePicker from "../ui/SOSTypePicker";

/**
 * Fast-access SOS — a pulsing button pinned to the bottom-right corner of
 * every page (mounted once, in MainLayout) so a user never has to
 * navigate to the SOS page during an actual emergency. Tapping it opens
 * a small type-picker + one-tap send, using the exact same triggerSOS()
 * pipeline as the full SOS page and the danger-zone auto-alert popup.
 */
export default function FloatingSOSButton() {
  const { user } = useAuth();
  const { location } = useGPS();
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [open, setOpen]       = useState(false);
  const [sosType, setSosType] = useState("other");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(null); // sosResult on success

  // Don't show the FAB on auth pages, or float it over the dedicated SOS
  // page itself (that page already has the big central button).
  const hiddenOn = ["/login", "/register", "/forgot-password", "/sos"];
  if (!user || hiddenOn.includes(routerLocation.pathname)) return null;

  const reset = () => {
    setOpen(false);
    setSent(null);
    setSosType("other");
  };

  const handleSend = async () => {
    if (!location) {
      alert("GPS location not available yet. Please enable location access and try again.");
      return;
    }
    setSending(true);
    const { ok, sosResult, error } = await triggerSOS({
      user,
      latitude: location.lat,
      longitude: location.lon,
      zoneName: "Fast-access SOS",
      sosType,
    });
    setSending(false);
    if (ok) {
      setSent(sosResult);
    } else {
      alert(error || "SOS failed to send. Please call 100 directly.");
    }
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Emergency SOS"
          className="sos-fab fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-danger hover:bg-red-600
            text-white shadow-2xl flex flex-col items-center justify-center gap-0.5 border-4 border-white
            transition-transform hover:scale-105 active:scale-95"
        >
          <Phone className="w-5 h-5" />
          <span className="text-[10px] font-bold leading-none">SOS</span>
        </button>
      )}

      {/* Quick panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={sending ? undefined : reset} />

          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-red-200 p-5">
            <button onClick={reset} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            {!sent ? (
              <>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <Phone className="w-5 h-5 text-danger" />
                  Quick SOS
                </h3>
                <p className="text-slate-400 text-xs mb-4">
                  Sends your live location to your emergency contacts right now.
                </p>

                <SOSTypePicker value={sosType} onChange={setSosType} size="sm" />

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="mt-4 w-full bg-danger hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      Send SOS Now
                    </>
                  )}
                </button>

                <button
                  onClick={() => { reset(); navigate("/sos"); }}
                  className="mt-2 w-full text-slate-400 hover:text-slate-600 text-xs py-1"
                >
                  Open full SOS page instead →
                </button>
              </>
            ) : (
              <div className="text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-safe mx-auto" />
                <h3 className="text-lg font-bold text-safe">SOS Sent</h3>
                <p className="text-slate-500 text-sm">
                  {sent.contacts_notified || 0} emergency contact{sent.contacts_notified === 1 ? "" : "s"} notified.
                </p>
                {sent.authority_notified?.length > 0 && (
                  <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-left">
                    <p className="text-brand-600 text-xs font-medium flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Nearest authority notified
                    </p>
                    {sent.authority_notified.map((a, i) => (
                      <p key={i} className="text-slate-500 text-xs">{a.name} — {a.phone}</p>
                    ))}
                  </div>
                )}
                <button onClick={reset}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl transition text-sm">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
