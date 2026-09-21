import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, User, Mail, Lock, Phone, Eye, EyeOff,
  AlertCircle, CheckCircle, MapPin, ArrowRight, ArrowLeft
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../services/api";

const STEPS = ["Personal Info", "Emergency Contacts", "Location Access"];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  const [form, setForm] = useState({
    // Step 1
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    // Step 2
    emergency_name: "",
    emergency_phone: "",
    emergency_email: "",
    emergency_relation: "",
  });

  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: "", phone: "", email: "", relation: "Parent" }
  ]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // ── Step validations ──────────────────────────────────────────────
  const validateStep0 = () => {
    if (!form.name || !form.email || !form.phone || !form.password || !form.confirm_password)
      return "All fields are required";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return "Enter a valid email";
    if (!/^\d{10}$/.test(form.phone))
      return "Enter a valid 10-digit phone number";
    if (form.password.length < 6)
      return "Password must be at least 6 characters";
    if (form.password !== form.confirm_password)
      return "Passwords do not match";
    return null;
  };

  const validateStep1 = () => {
    if (!emergencyContacts.length) return "Add at least one emergency contact";

    const phones = new Set();
    for (let i = 0; i < emergencyContacts.length; i++) {
      const contact = emergencyContacts[i];
      if (!contact.name || !contact.phone || !contact.email)
        return `Contact ${i + 1}: name, phone and email are required`;
      if (!/^\d{10}$/.test(contact.phone))
        return `Contact ${i + 1}: enter a valid 10-digit phone number`;
      if (contact.phone === form.phone)
        return `Contact ${i + 1}: emergency contact must be different from your number`;
      if (phones.has(contact.phone))
        return `Contact ${i + 1}: this phone number is already added`;
      phones.add(contact.phone);
      if (!/^\S+@\S+\.\S+$/.test(contact.email))
        return `Contact ${i + 1}: enter a valid email address`;
    }
    return null;
  };

  const updateEmergencyContact = (index, field, value) => {
    setEmergencyContacts(prev => prev.map((contact, i) =>
      i === index ? { ...contact, [field]: value } : contact
    ));
    setError("");
  };

  const addEmergencyContact = () => {
    setEmergencyContacts(prev => [
      ...prev,
      { name: "", phone: "", email: "", relation: "Parent" }
    ]);
    setError("");
  };

  const removeEmergencyContact = (index) => {
    if (emergencyContacts.length === 1) return;
    setEmergencyContacts(prev => prev.filter((_, i) => i !== index));
    setError("");
  };

  // ── Navigation ────────────────────────────────────────────────────
  const nextStep = () => {
    let err = null;
    if (step === 0) err = validateStep0();
    if (step === 1) err = validateStep1();
    if (err) { setError(err); return; }
    setError("");
    setStep(step + 1);
  };

  const prevStep = () => {
    setError("");
    setStep(step - 1);
  };

  // ── Request GPS ───────────────────────────────────────────────────
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("GPS not supported on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocationGranted(true),
      () => setError("Location permission denied. You can enable it later in settings.")
    );
  };

  // ── Final submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name:     form.name,
        email:    form.email,
        phone:    form.phone,
        password: form.password,
        emergency_contacts: emergencyContacts.map(contact => ({
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
          relation: contact.relation || "Other",
        })),
      };
      const res = await registerUser(payload);
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Input style ───────────────────────────────────────────────────
  const inputClass =
    "w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 st-v2-page py-10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-20 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-20 w-96 h-96 bg-pink-200/35 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-100 rounded-2xl mb-3">
            <Shield className="w-7 h-7 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SafeTrail</h1>
          <p className="text-slate-500 text-sm mt-1">Create your safety profile</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? "bg-safe text-white" :
                  i === step ? "bg-brand-500 text-white" :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1 ${i === step ? "text-brand-500" : "text-slate-500"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-12 mx-2 mb-4 ${i < step ? "bg-safe" : "bg-slate-100"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass p-8 border-2 border-indigo-100/70">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {/* ── STEP 0: Personal Info ─────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h2>

              {/* Name */}
              <div>
                <label className="text-sm text-slate-500 mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" name="name" value={form.name}
                    onChange={handleChange} placeholder="Harshitha N"
                    className={inputClass} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm text-slate-500 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" name="email" value={form.email}
                    onChange={handleChange} placeholder="you@example.com"
                    className={inputClass} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm text-slate-500 mb-1 block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="tel" name="phone" value={form.phone}
                    onChange={handleChange} placeholder="10-digit mobile number"
                    className={inputClass} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-sm text-slate-500 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={showPass ? "text" : "password"} name="password"
                    value={form.password} onChange={handleChange} placeholder="Min 6 characters"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-12 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm text-slate-500 mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" name="confirm_password"
                    value={form.confirm_password} onChange={handleChange} placeholder="••••••••"
                    className={inputClass} />
                </div>
                {form.confirm_password && form.password === form.confirm_password && (
                  <p className="text-xs mt-1 text-safe flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              <button onClick={nextStep}
                className="w-full brand-gradient animated-gradient hover:shadow-lg hover:shadow-indigo-200/60 text-white font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 1: Emergency Contacts ────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="st-v2-hero mb-5">
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/75">Safety circle</p>
                      <h2 className="text-2xl font-extrabold">Emergency Contacts</h2>
                    </div>
                    <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur">
                      <span className="block text-2xl font-black">{emergencyContacts.length}</span>
                      <span className="text-[10px] uppercase tracking-wide text-white/75">contacts</span>
                    </div>
                  </div>
                <p className="text-slate-500 text-xs mt-1">
                  Add multiple people who should receive your SOS alerts and live location.
                </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
                <p className="text-danger text-xs font-medium">
                  🚨 All added contacts will be notified when you trigger SOS.
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  You can add as many emergency contacts as you need.
                </p>
              </div>

              {emergencyContacts.map((contact, index) => (
                <div key={index} className="st-v2-contact p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center">{index + 1}</span>
                      Contact {index + 1}
                      {index === 0 && <span className="st-v2-pill text-[10px] px-2 py-1 rounded-full">Primary</span>}
                    </h3>
                    {emergencyContacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmergencyContact(index)}
                        className="text-danger text-xs font-medium hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={contact.name}
                        onChange={e => updateEmergencyContact(index, "name", e.target.value)}
                        placeholder="Parent / Guardian name"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Relation</label>
                    <select
                      value={contact.relation}
                      onChange={e => updateEmergencyContact(index, "relation", e.target.value)}
                      className={inputClass + " appearance-none"}
                    >
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Friend">Friend</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={e => updateEmergencyContact(index, "phone", e.target.value)}
                        placeholder="10-digit mobile number"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={contact.email}
                        onChange={e => updateEmergencyContact(index, "email", e.target.value)}
                        placeholder="emergency@gmail.com"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addEmergencyContact}
                className="st-v2-add w-full font-extrabold py-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="text-2xl leading-none">＋</span> Add Another Emergency Contact
              </button>

              <div className="flex gap-3 pt-2">
                <button onClick={prevStep}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={nextStep}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Location Permission ───────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Enable Location Access</h2>
                <p className="text-slate-500 text-xs mt-1">
                  SafeTrail needs your GPS to monitor your safety in real time.
                </p>
              </div>

              {/* Location illustration */}
              <div className="text-center py-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
                  locationGranted ? "bg-green-100" : "bg-brand-100"
                }`}>
                  <MapPin className={`w-12 h-12 ${locationGranted ? "text-safe" : "text-brand-500"}`} />
                </div>
                {locationGranted ? (
                  <div>
                    <p className="text-safe font-semibold text-lg">Location Access Granted ✅</p>
                    <p className="text-slate-500 text-sm mt-1">SafeTrail can now monitor your safety</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-800 font-semibold">Allow Location Access</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Required for real-time safety monitoring and emergency alerts
                    </p>
                  </div>
                )}
              </div>

              {/* What we use location for */}
              <div className="bg-white rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 mb-2">Location is used for:</p>
                {[
                  "Real-time risk level prediction",
                  "Geofence zone entry/exit detection",
                  "Auto-sharing with emergency contact on SOS",
                  "Alert history and route tracking",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle className="w-3 h-3 text-safe shrink-0" />{item}
                  </div>
                ))}
              </div>

              {!locationGranted && (
                <button onClick={requestLocation}
                  className="w-full brand-gradient animated-gradient hover:shadow-lg hover:shadow-indigo-200/60 text-white font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" /> Allow Location Access
                </button>
              )}

              <div className="flex gap-3">
                <button onClick={prevStep}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-safe hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition">
                  {loading ? "Creating..." : locationGranted ? "Complete Setup ✅" : "Skip & Continue"}
                </button>
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-slate-400 text-sm mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}