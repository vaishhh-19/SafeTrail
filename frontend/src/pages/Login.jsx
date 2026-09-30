import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, Navigation, HeartHandshake } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await loginUser(form);
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-app-gradient relative overflow-hidden">
      {/* Dynamic ambient color orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-indigo-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-20 w-[450px] h-[450px] bg-pink-400/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Floating pill tags */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/80 backdrop-blur-md text-indigo-700 border border-indigo-200 shadow-sm flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-pink-500" /> Neural Corridor Safety
          </span>
          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/80 backdrop-blur-md text-emerald-700 border border-emerald-200 shadow-sm flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-emerald-500" /> Live GPS Guard
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 brand-gradient animated-gradient rounded-3xl p-4 mb-3 shadow-xl shadow-indigo-400/40 float-soft">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight gradient-text">
            SafeTrail
          </h1>
          <p className="text-slate-500 font-semibold text-sm mt-1">
            Intelligent Public Safety & Women's Navigation
          </p>
        </div>

        {/* Glass Login Card */}
        <div className="glass p-8 sm:p-9 border border-white/90 shadow-2xl shadow-indigo-500/15">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-800">Welcome Back</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Log in to enter your protected safety grid</p>
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-rose-600 rounded-2xl px-4 py-3 mb-4 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-10 pr-12 py-3 text-sm text-slate-800 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-indigo-600 hover:text-pink-600 font-extrabold transition">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full brand-gradient animated-gradient hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl transition duration-200 text-sm shadow-md shadow-indigo-300"
            >
              {loading ? "Authenticating..." : "Sign In to SafeTrail"}
            </button>
          </form>

          {/* Quick Admin Gateway */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 text-xs font-extrabold text-purple-600 hover:text-pink-600 transition bg-purple-50 hover:bg-purple-100 px-3.5 py-2 rounded-xl border border-purple-200"
            >
              <Shield className="w-3.5 h-3.5 text-pink-500" />
              <span>Admin / Law Enforcement Login</span>
            </Link>
          </div>

          <p className="text-center text-slate-500 text-xs mt-5 font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-600 hover:text-pink-600 font-extrabold">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}