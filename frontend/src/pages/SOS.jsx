import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/layout/MainLayout";
import useGPS from "../hooks/useGPS";
import { triggerSOS } from "../services/sosService";
import API from "../services/api";
import SOSTypePicker, { SOS_TYPES } from "../components/ui/SOSTypePicker";
import {
  Phone, MapPin, Shield, AlertOctagon,
  CheckCircle, Clock, User, PhoneCall, Mail, Building2, Plus, X, Save
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
    { label:"Police",         number:"100",  color:"text-danger",    bg:"bg-red-100"    },
    { label:"Ambulance",      number:"108",  color:"text-moderate",  bg:"bg-orange-100"  },
    { label:"Fire Brigade",   number:"101",  color:"text-safe",      bg:"bg-green-100"      },
    { label:"Women Helpline", number:"1091", color:"text-brand-500", bg:"bg-brand-100" },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Phone className="w-6 h-6 text-danger" />
            SOS Emergency
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Instantly alert your emergency contacts with your live location
          </p>
        </div>

        {/* GPS Status */}
        <div className="glass p-4 flex items-center gap-3">
          <MapPin className={`w-5 h-5 ${location ? "text-safe" : "text-danger"}`} />
          <div>
            {loading && (
              <p className="text-slate-500 text-sm animate-pulse">
                Getting your location...
              </p>
            )}
            {error && <p className="text-danger text-sm">GPS Error: {error}</p>}
            {location && (
              <div>
                <p className="text-safe text-sm font-medium">✅ GPS Ready</p>
                <p className="text-slate-400 text-xs font-mono">
                  {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                  {" "}• Accuracy: ±{Math.round(location.accuracy)}m
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="glass p-5 border-2 border-indigo-100/80">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-slate-800 font-extrabold flex items-center gap-2">
                <User className="w-5 h-5 text-violet-600" />
                Emergency Contacts
              </h3>
              <p className="text-slate-400 text-xs mt-1">These people receive your SOS alert and location.</p>
            </div>
            <span className="st-v2-pill text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              {emergencyContacts.length} configured
            </span>
          </div>

          {emergencyContacts.length ? (
            <div className="space-y-3">
              {emergencyContacts.map((contact, index) => (
                <div key={`${contact.phone}-${index}`} className="st-v2-contact p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-violet-200">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-800 font-semibold truncate">{contact.name}</p>
                        {index === 0 && <span className="st-v2-pill text-[9px] font-bold px-2 py-0.5 rounded-full">PRIMARY</span>}
                      </div>
                      <p className="text-slate-500 text-sm">{contact.phone} • {contact.relation || "Other"}</p>
                      {contact.email && <p className="text-brand-500 text-xs truncate">{contact.email}</p>}
                    </div>
                  </div>
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 bg-green-100 text-safe px-3 py-2 rounded-xl text-xs font-bold shrink-0">
                    <PhoneCall className="w-4 h-4" /> Call
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-danger">⚠️ No emergency contacts are configured yet.</div>
          )}

          {contactSuccess && <div className="mt-3 rounded-xl bg-green-50 border border-green-100 text-safe text-sm px-4 py-3">✓ {contactSuccess}</div>}

          <button onClick={openAddContact} className="mt-4 w-full py-3.5 rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 text-violet-700 font-extrabold hover:border-pink-300 hover:shadow-md transition flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Add Emergency Contact
          </button>

          {showAddContact && (
            <div className="mt-4 rounded-2xl bg-white border border-violet-100 p-4 shadow-lg shadow-violet-100/40">
              <div className="flex items-center justify-between mb-4">
                <div><h4 className="font-extrabold text-slate-800">Add another contact</h4><p className="text-xs text-slate-400">You can add multiple people for SOS notifications.</p></div>
                <button type="button" onClick={() => setShowAddContact(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"><X className="w-4 h-4"/></button>
              </div>
              {contactError && <div className="mb-3 rounded-xl bg-red-50 border border-red-100 text-danger text-xs px-3 py-2.5">{contactError}</div>}
              <form onSubmit={handleAddContact} className="space-y-3">
                <input value={newContact.name} onChange={e=>setNewContact({...newContact,name:e.target.value})} placeholder="Contact name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={newContact.phone} onChange={e=>setNewContact({...newContact,phone:e.target.value.replace(/\D/g,"").slice(0,10)})} placeholder="10-digit phone" inputMode="numeric" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" />
                  <select value={newContact.relation} onChange={e=>setNewContact({...newContact,relation:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"><option>Parent</option><option>Sibling</option><option>Friend</option><option>Spouse</option><option>Guardian</option><option>Other</option></select>
                </div>
                <input type="email" value={newContact.email} onChange={e=>setNewContact({...newContact,email:e.target.value})} placeholder="Email (optional)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" />
                <button disabled={addingContact} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4"/>{addingContact ? "Adding…" : "Save Contact"}</button>
              </form>
            </div>
          )}
        </div>

        {/* What SOS does */}
        <div className="glass p-5">
          <h3 className="text-slate-800 font-semibold mb-3">When you press SOS:</h3>
          <div className="space-y-3">
            {[
              { icon: Mail,         color: "text-brand-500", text: "Email sent to ALL emergency contacts with live location link" },
              { icon: MapPin,       color: "text-safe",      text: "Google Maps link with your exact GPS coordinates included"   },
              { icon: AlertOctagon, color: "text-moderate",  text: "Danger alert logged in system for admin/authority to see"   },
              { icon: Shield,       color: "text-safe",      text: "Admin dashboard shows your SOS in real time"                },
              { icon: Phone,        color: "text-danger",    text: "One-tap buttons to call Police (100) or Ambulance (108)"    },
            ].map(({ icon: Icon, color, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-slate-600 text-sm mt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SOS type classification */}
        {!sosSent && countdown === null && (
          <div className="glass p-5">
            <h3 className="text-slate-800 font-semibold mb-1">What's the emergency?</h3>
            <p className="text-slate-400 text-xs mb-3">
              Picking a type routes it to the right responder (medical → ambulance, fire → fire brigade, etc.)
            </p>
            <SOSTypePicker value={sosType} onChange={setSosType} />
          </div>
        )}

        {/* SOS Button or Result */}
        {!sosSent ? (
          <div className="text-center space-y-4">
            {countdown !== null ? (
              <div>
                <div className="w-40 h-40 bg-red-100 border-4 border-danger rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-6xl font-bold text-danger">{countdown}</span>
                </div>
                <p className="text-slate-500 animate-pulse">
                  Sending SOS alert to all contacts...
                </p>
              </div>
            ) : (
              <button
                onClick={handleSOS}
                disabled={sending || loading || !location}
                className="w-44 h-44 bg-danger hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xl shadow-danger/40 flex flex-col items-center justify-center gap-2 mx-auto border-4 border-red-400"
              >
                <Phone className="w-10 h-10" />
                <span className="text-2xl font-black">SOS</span>
                <span className="text-xs font-normal opacity-80">Press to alert</span>
              </button>
            )}
            <p className="text-slate-400 text-xs">
              Only press in genuine emergencies
            </p>
          </div>
        ) : (
          <div className="glass p-6 border border-green-200 space-y-4">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-safe mx-auto mb-3" />
              <h3 className="text-xl font-bold text-safe">SOS Alert Sent!</h3>
              <p className="text-slate-500 text-sm mt-1">
                All emergency contacts have been notified
              </p>
            </div>

            {/* Simulated authority notified */}
            {sosResult?.authority_notified?.length > 0 && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-2">
                <p className="text-brand-600 text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Nearest local authority notified
                </p>
                {sosResult.authority_notified.map((a, i) => (
                  <p key={i} className="text-slate-600 text-xs">
                    {a.name} ({a.type}) — {a.phone} • ~{a.distance_m}m away
                  </p>
                ))}
                <p className="text-slate-400 text-[11px]">
                  Simulated for this demo — no public dispatch API exists for student projects. Your real emergency contacts above were actually emailed/texted.
                </p>
              </div>
            )}

            {/* Email results */}
            {emailResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-500 text-sm font-medium">
                  Notification status:
                </p>
                {emailResults.map((r, i) => (
                  <div key={i}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                    <div>
                      <p className="text-slate-800 text-sm font-medium">{r.name}</p>
                      {r.email && (
                        <p className="text-slate-400 text-xs">{r.email}</p>
                      )}
                      {r.phone && (
                        <p className="text-slate-500 text-xs">{r.phone}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.success
                        ? "bg-green-100 text-safe"
                        : r.method === "no-email"
                        ? "bg-orange-100 text-moderate"
                        : "bg-red-100 text-danger"
                    }`}>
                      {r.success
                        ? "✅ Email Sent"
                        : r.method === "no-email"
                        ? "⚠️ No Email"
                        : "❌ Failed"}
                    </span>
                  </div>
                ))}
                {emailResults.some(r => r.method === "no-email") && (
                  <p className="text-moderate text-xs">
                    ⚠️ Some contacts have no email — go to Profile to add emails
                  </p>
                )}
              </div>
            )}

            {/* Location info */}
            <div className="bg-white rounded-xl p-4 space-y-2">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                Location Shared
              </p>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                {location?.lat.toFixed(6)}, {location?.lon.toFixed(6)}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                {new Date().toLocaleString()}
              </div>
              {sosResult?.location?.maps_link && (
                <a href={sosResult.location.maps_link}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-brand-500 text-sm hover:underline">
                  <MapPin className="w-3 h-3" />
                  Open in Google Maps
                </a>
              )}
            </div>

            <button onClick={handleReset}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 rounded-xl transition text-sm">
              Reset SOS
            </button>
          </div>
        )}

        {/* One-tap Emergency Numbers */}
        <div className="glass p-5">
          <h3 className="text-slate-800 font-semibold mb-1">
            One-Tap Emergency Calls
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Tap to call directly — works without internet
          </p>
          <div className="grid grid-cols-2 gap-3">
            {emergencyNumbers.map(({ label, number, color, bg }) => (
              <a key={label} href={`tel:${number}`}
                className={`flex items-center gap-3 ${bg} hover:opacity-80 rounded-xl p-4 transition border border-slate-200`}>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <PhoneCall className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-slate-800 text-sm font-semibold">{label}</p>
                  <p className={`text-lg font-black ${color}`}>{number}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}