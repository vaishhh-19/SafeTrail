import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/layout/MainLayout";
import useGPS from "../hooks/useGPS";
import { triggerSOS } from "../services/sosService";
import API from "../services/api";
import SOSTypePicker, { SOS_TYPES } from "../components/ui/SOSTypePicker";
import {
  Phone, MapPin, Shield, AlertOctagon,
  CheckCircle, Clock, User, PhoneCall, Mail, Building2, Plus, X, Save, Radio
} from "lucide-react";

export default function SOS() {
  const { user, refreshUser }        = useAuth();
  const { location, loading, error } = useGPS();
  const [sosType, setSosType]        = useState("other");
  const [sosSent, setSosSent]        = useState(false);
  const [sending, setSending]        = useState(false);
  const [sosResult, setSosResult]    = useState(null);
  const [countdown, setCountdown]    = useState(null);
  const [emailResults, setEmailResults] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [newContact, setNewContact] = useState({ name: "", relation: "Parent", phone: "", email: "" });
  const [contacts, setContacts] = useState([]);

  const loadContacts = async () => {
    try {
      const res = await API.get("/api/user/emergency-contacts");
      setContacts(res.data.contacts || []);
    } catch {
      setContacts(user?.emergency_contacts || []);
    }
  };

  useEffect(() => {
    refreshUser?.().catch(() => {});
    loadContacts();
  }, []);

  const emergencyContacts = contacts.length ? contacts : (user?.emergency_contacts || []);

  const openAddContact = () => {
    setContactError("");
    setContactSuccess("");
    setNewContact({ name: "", relation: "Parent", phone: "", email: "" });
    setShowAddContact(true);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setContactError("");
    setContactSuccess("");
    const phone = newContact.phone.replace(/\D/g, "");
    if (!newContact.name.trim() || !phone) {
      setContactError("Name and phone number are required");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setContactError("Enter a valid 10-digit phone number");
      return;
    }
    if (phone === user?.phone) {
      setContactError("Emergency contact must be different from your number");
      return;
    }
    if (emergencyContacts.some(c => String(c.phone).replace(/\D/g, "") === phone)) {
      setContactError("This emergency contact is already added");
      return;
    }
    if (newContact.email && !/^\S+@\S+\.\S+$/.test(newContact.email)) {
      setContactError("Enter a valid email address");
      return;
    }

    setAddingContact(true);
    try {
      await API.post("/api/user/emergency-contact", {
        name: newContact.name.trim(),
        phone,
        relation: newContact.relation || "Other",
        email: newContact.email.trim(),
      });
      await refreshUser?.();
      await loadContacts();
      setContactSuccess("Emergency contact added successfully");
      setShowAddContact(false);
    } catch (err) {
      setContactError(err.response?.data?.error || "Could not add emergency contact");
    } finally {
      setAddingContact(false);
    }
  };

  const handleSOS = async () => {
    if (!location) {
      alert("GPS location not available. Please enable location access.");
      return;
    }
    setSending(true);

    // 3 second countdown
    let count = 3;
    setCountdown(count);
    const countInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) clearInterval(countInterval);
    }, 1000);

    setTimeout(async () => {
      const { ok, sosResult: result, emailResults: results, error: err } =
        await triggerSOS({
          user,
          latitude:  location.lat,
          longitude: location.lon,
          zoneName:  "SOS manually triggered",
          sosType,
        });

      if (ok) {
        setSosResult(result);
        setEmailResults(results);
        setSosSent(true);
      } else {
        alert(err || "SOS failed. Please call 100 directly.");
      }
      setSending(false);
      setCountdown(null);
    }, 3000);
  };

  const handleReset = () => {
    setSosSent(false);
    setSosResult(null);
    setEmailResults([]);
  };

  const emergencyNumbers = [
    {
      label: "Police Hotline",
      number: "100",
      gradient: "from-rose-500 to-red-600",
      bg: "from-rose-500/10 via-red-500/10 to-rose-500/15",
      border: "border-rose-200",
      color: "text-rose-600",
      badge: "24/7 Police",
    },
    {
      label: "Emergency Medical",
      number: "108",
      gradient: "from-amber-500 to-orange-600",
      bg: "from-amber-500/10 via-orange-500/10 to-amber-500/15",
      border: "border-amber-200",
      color: "text-amber-600",
      badge: "Ambulance",
    },
    {
      label: "Fire Rescue",
      number: "101",
      gradient: "from-emerald-500 to-teal-600",
      bg: "from-emerald-500/10 via-teal-500/10 to-emerald-500/15",
      border: "border-emerald-200",
      color: "text-emerald-600",
      badge: "Fire Brigade",
    },
    {
      label: "Women Safety",
      number: "1091",
      gradient: "from-indigo-600 to-pink-600",
      bg: "from-indigo-500/10 via-purple-500/10 to-pink-500/15",
      border: "border-purple-200",
      color: "text-pink-600",
      badge: "National Helpline",
    },
  ];

  return (
    <MainLayout>
      <div className="page-shell space-y-6 max-w-3xl mx-auto">

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 text-white shadow-2xl shadow-rose-500/20 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 animated-gradient border border-white/20">
          <div className="absolute -right-8 -top-12 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute right-20 bottom-0 w-36 h-36 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs uppercase tracking-widest font-extrabold mb-2.5">
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
                Emergency Panic Node
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                <span>SOS Distress Broadcast</span>
              </h1>
              <p className="text-white/90 text-sm mt-1 max-w-lg font-medium">
                One-tap instant broadcast to all emergency contacts and local public safety authorities with live GPS coordinates.
              </p>
            </div>

            <div className="shrink-0">
              <div className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-2 text-white text-xs font-bold shadow-md">
                <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>Ready & Armed</span>
              </div>
            </div>
          </div>
        </div>

        {/* GPS Live Geolocation Bar */}
        <div className="card-vibrant-cyan p-4 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              location ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-400/30" : "bg-rose-500 shadow-rose-400/30"
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              {loading && <p className="text-cyan-700 text-sm font-bold animate-pulse">Acquiring high-accuracy GPS coordinates...</p>}
              {error && <p className="text-rose-600 text-sm font-bold">GPS Error: {error}</p>}
              {location && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 text-sm font-extrabold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      GPS Satellite Locked
                    </span>
                    <span className="text-[10px] bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded-full">
                      ±{Math.round(location.accuracy)}m precision
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs font-mono font-semibold mt-0.5">
                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="glass p-6 border border-white/90 shadow-xl shadow-indigo-500/10">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-slate-800 font-extrabold text-base flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-300">
                  <User className="w-4 h-4" />
                </div>
                <span>Linked Guardians & Emergency Contacts</span>
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                These trusted contacts will receive instant SMS & email distress links when triggered.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200">
              {emergencyContacts.length} Registered
            </span>
          </div>

          {emergencyContacts.length ? (
            <div className="space-y-3">
              {emergencyContacts.map((contact, index) => (
                <div
                  key={`${contact.phone}-${index}`}
                  className="p-4 rounded-2xl bg-gradient-to-r from-white via-indigo-50/20 to-purple-50/20 border border-indigo-100/90 hover:border-purple-300 hover:shadow-md transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-300 shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-900 font-bold text-sm truncate">{contact.name}</p>
                        {index === 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                            PRIMARY
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {contact.relation || "Contact"}
                        </span>
                      </div>
                      <p className="text-slate-500 font-mono text-xs mt-0.5">{contact.phone}</p>
                      {contact.email && (
                        <p className="text-indigo-600 text-[11px] truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-indigo-400" /> {contact.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform shrink-0"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Direct Call
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 p-4 text-sm text-rose-700 font-medium">
              ⚠️ No emergency contacts are configured yet. Add at least one person below so they can be notified.
            </div>
          )}

          {contactSuccess && (
            <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{contactSuccess}</span>
            </div>
          )}

          <button
            onClick={openAddContact}
            className="mt-4 w-full py-3.5 rounded-2xl border-2 border-dashed border-purple-200 bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-pink-50/50 text-purple-700 font-extrabold hover:border-pink-300 hover:shadow-md transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 text-pink-500" /> Add Another Emergency Guardian
          </button>

          {showAddContact && (
            <div className="mt-4 rounded-3xl bg-white border border-purple-100 p-5 shadow-xl shadow-purple-500/10 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Add New Emergency Contact</h4>
                  <p className="text-xs text-slate-400">Save someone who should receive your panic broadcast.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {contactError && (
                <div className="mb-3 rounded-xl bg-red-50 border border-red-200 text-rose-600 text-xs px-3.5 py-2.5 font-semibold">
                  {contactError}
                </div>
              )}

              <form onSubmit={handleAddContact} className="space-y-3">
                <input
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Contact Name (e.g. Mom, Maya, Dad)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={newContact.phone}
                    onChange={e => setNewContact({ ...newContact, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="10-digit Phone Number"
                    inputMode="numeric"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500"
                  />
                  <select
                    value={newContact.relation}
                    onChange={e => setNewContact({ ...newContact, relation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500"
                  >
                    <option>Parent</option>
                    <option>Sibling</option>
                    <option>Friend</option>
                    <option>Spouse</option>
                    <option>Guardian</option>
                    <option>Other</option>
                  </select>
                </div>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="Email Address (required for instant email alerts)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500"
                />
                <button
                  disabled={addingContact}
                  className="w-full py-3.5 rounded-2xl brand-gradient animated-gradient text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-300 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{addingContact ? "Saving Contact..." : "Save Guardian"}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* SOS Emergency Classification */}
        {!sosSent && countdown === null && (
          <div className="glass p-6 border border-white/90 shadow-xl shadow-indigo-500/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-800 font-extrabold text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Select Emergency Nature
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Routes to appropriate dispatch</span>
            </div>
            <p className="text-slate-500 text-xs mb-4">
              Choose the category to prioritize police, medical, or fire response teams:
            </p>
            <SOSTypePicker value={sosType} onChange={setSosType} />
          </div>
        )}

        {/* Central SOS Trigger Button */}
        {!sosSent ? (
          <div className="glass p-8 text-center relative overflow-hidden border border-white/90 shadow-2xl shadow-rose-500/20">
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-red-500/10 pointer-events-none" />

            {countdown !== null ? (
              <div className="py-6">
                <div className="w-48 h-48 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex flex-col items-center justify-center mx-auto mb-4 shadow-2xl shadow-rose-600/50 border-4 border-white animate-pulse">
                  <span className="text-6xl font-black text-white">{countdown}</span>
                  <span className="text-white/90 text-xs font-bold uppercase tracking-wider mt-1">Transmitting</span>
                </div>
                <p className="text-rose-600 font-extrabold text-base animate-pulse">
                  Broadcasting live coordinates to all guardians & dispatch...
                </p>
              </div>
            ) : (
              <div className="py-4">
                <div className="relative inline-block my-3">
                  {/* Concentric radar rings */}
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping pointer-events-none scale-125" />
                  <div className="absolute inset-0 rounded-full bg-red-500/25 blur-xl pointer-events-none" />

                  <button
                    onClick={handleSOS}
                    disabled={sending || loading || !location}
                    className="sos-pulse-wave relative z-10 w-48 h-48 sm:w-52 sm:h-52 bg-gradient-to-br from-red-500 via-rose-600 to-red-700 hover:from-red-600 hover:to-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl shadow-rose-600/60 flex flex-col items-center justify-center gap-1.5 mx-auto border-4 border-white/90 shimmer-sweep"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Phone className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-3xl font-black tracking-wider">PANIC SOS</span>
                    <span className="text-[11px] font-bold text-white/90 uppercase tracking-widest px-3 py-0.5 rounded-full bg-black/20">
                      Tap to Alert
                    </span>
                  </button>
                </div>

                <p className="text-slate-500 text-xs font-semibold mt-4">
                  🔒 Encrypted transmission • Instant SMS, Email & Police Dispatch
                </p>
              </div>
            )}
          </div>
        ) : (
          /* SOS Confirmation Card */
          <div className="card-vibrant-emerald p-6 rounded-3xl space-y-4 text-center border-emerald-300 shadow-xl shadow-emerald-500/20">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-400/40">
              <CheckCircle className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-emerald-800">Distress Broadcast Transmitted!</h3>
              <p className="text-emerald-700 text-sm mt-1 font-semibold">
                Your coordinates have been dispatched to all emergency guardians and local safety monitoring nodes.
              </p>
            </div>

            {sosResult?.authority_notified?.length > 0 && (
              <div className="bg-white/90 border border-emerald-200 rounded-2xl p-4 text-left space-y-2 shadow-sm">
                <p className="text-emerald-800 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Nearest Law Enforcement & First Responders Notified
                </p>
                {sosResult.authority_notified.map((a, i) => (
                  <p key={i} className="text-slate-700 text-xs font-medium">
                    📍 {a.name} ({a.type}) — {a.phone} • ~{a.distance_m}m away
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-extrabold border border-slate-200 shadow-sm transition"
            >
              Reset SOS Status
            </button>
          </div>
        )}

        {/* Speed-Dial Emergency Numbers */}
        <div className="glass p-6 border border-white/90 shadow-xl shadow-indigo-500/10">
          <div className="mb-4">
            <h3 className="text-slate-800 font-extrabold text-base flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-rose-500" />
              <span>One-Tap Offline Emergency Hotlines</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Direct telephone dialer links — connects even if mobile data is turned off.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {emergencyNumbers.map(({ label, number, gradient, bg, border, color, badge }) => (
              <a
                key={label}
                href={`tel:${number}`}
                className={`p-4 rounded-2xl bg-gradient-to-br ${bg} border ${border} hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-between shadow-sm group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:rotate-6 transition-transform`}>
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{badge}</span>
                    <p className="text-slate-800 font-extrabold text-sm">{label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black ${color} block`}>{number}</span>
                  <span className="text-[10px] text-slate-400 font-bold">Tap to call</span>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}