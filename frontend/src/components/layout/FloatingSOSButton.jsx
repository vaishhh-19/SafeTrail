import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Phone, X, Loader2, CheckCircle, Building2, Radio } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useGPS from "../../hooks/useGPS";
import { triggerSOS } from "../../services/sosService";
import SOSTypePicker from "../ui/SOSTypePicker";

/**
 * Fast-access SOS — a pulsing button pinned to the bottom-right corner of
 * every page (mounted once, in MainLayout) so a user never has to
 * navigate to the SOS page during an actual emergency.
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
      {/* Floating trigger with radiant gradient and concentric ripples */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Emergency SOS"
          className="sos-fab fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-red-500 via-rose-600 to-red-700 hover:from-red-600 hover:to-rose-800
            text-white shadow-2xl shadow-rose-600/50 flex flex-col items-center justify-center gap-0.5 border-4 border-white
            transition-transform hover:scale-110 active:scale-95 shimmer-sweep"
        >
          <Phone className="w-5 h-5 animate-pulse" />
          <span className="text-[10px] font-black tracking-wider leading-none">SOS</span>
        </button>
      )}

      {/* Quick panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={sending ? undefined : reset} />

          <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-rose-300 p-6 animate-scale-up">
            <button
              onClick={reset}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {!sent ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-300">
                    <Phone className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">
                    Emergency Fast SOS
                  </h3>
                </div>
                <p className="text-slate-400 text-xs mb-4">
                  Transmits high-accuracy live coordinates to your emergency guardians instantly.
                </p>

                <SOSTypePicker value={sosType} onChange={setSosType} size="sm" />

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="mt-4 w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-600/40 transition-all flex items-center justify-center gap-2 text-sm shimmer-sweep"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting Signal...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      <span>Transmit SOS Alert Now</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => { reset(); navigate("/sos"); }}
                  className="mt-3 w-full text-indigo-600 hover:text-indigo-800 text-xs font-bold py-1 text-center"
                >
                  Open full emergency command center →
                </button>
              </>
            ) : (
              <div className="text-center space-y-3.5 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-emerald-800">SOS Distress Sent!</h3>
                <p className="text-slate-600 text-xs font-medium">
                  {sent.contacts_notified || 0} emergency contact{sent.contacts_notified === 1 ? "" : "s"} alerted with live location coordinates.
                </p>
                {sent.authority_notified?.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-left">
                    <p className="text-emerald-800 text-[11px] font-extrabold flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Nearest authority notified
                    </p>
                    {sent.authority_notified.map((a, i) => (
                      <p key={i} className="text-slate-600 text-xs">{a.name} — {a.phone}</p>
                    ))}
                  </div>
                )}
                <button
                  onClick={reset}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3 rounded-2xl transition text-xs"
                >
                  Close Panel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
