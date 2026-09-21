import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import {
  Shield, User, Mail, Phone, Save,
  CheckCircle, AlertCircle, ArrowLeft, KeyRound
} from "lucide-react";

export default function AdminProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:  user?.name  || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const inputClass =
    "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition";

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res   = await API.put("/api/user/profile", form);
      const token = localStorage.getItem("safetrail_token");
      login(token, res.data.user);
      setSuccess("Admin profile updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/admin")}
          className="text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-500" />
        </div>
        <div>
          <h1 className="text-slate-800 font-bold">Admin Profile</h1>
          <p className="text-slate-400 text-xs">Manage your administrator account</p>
        </div>
      </div>

      <div className="p-6 max-w-xl mx-auto space-y-6">
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-safe rounded-xl px-4 py-3 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />{success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <div className="glass p-6 space-y-4">
          <h2 className="text-slate-800 font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            Account Details
          </h2>

          <div>
            <label className="text-slate-500 text-sm mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`${inputClass} pl-10`} placeholder="Your name" />
            </div>
          </div>

          <div>
            <label className="text-slate-500 text-sm mb-1 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className={`${inputClass} pl-10`} placeholder="10-digit number" />
            </div>
          </div>

          <div>
            <label className="text-slate-500 text-sm mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" value={user?.email || ""} disabled
                className={`${inputClass} pl-10 opacity-50 cursor-not-allowed`} />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="glass p-5">
          <h3 className="text-slate-800 font-semibold mb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-moderate" />
            Password
          </h3>
          <p className="text-slate-500 text-sm">
            To change your password, log out and use "Forgot Password" on the sign-in screen.
          </p>
        </div>
      </div>
    </div>
  );
}
