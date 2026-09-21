import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { forgotPassword } from "../services/api";

export default function ForgotPassword() {
  const [form, setForm]       = useState({ email: "", new_password: "", confirm: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.new_password || !form.confirm) {
      setError("All fields are required"); return;
    }
    if (form.new_password !== form.confirm) {
      setError("Passwords do not match"); return;
    }
    if (form.new_password.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    setLoading(true);
    try {
      await forgotPassword({ email: form.email, new_password: form.new_password });
      setSuccess("Password updated! You can now log in.");
      setForm({ email: "", new_password: "", confirm: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Failed. Check your email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">SafeTrail</h1>
          <p className="text-slate-500 mt-1">Reset your password</p>
        </div>

        <div className="glass p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Forgot Password</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-safe rounded-xl px-4 py-3 mb-4 text-sm">
              <CheckCircle className="w-4 h-4" />{success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" name="new_password" value={form.new_password} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" name="confirm" value={form.confirm} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition">
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Remember it?{" "}
            <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}