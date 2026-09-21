import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { adminLoginUser } from "../services/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) return setError("Enter your admin email and password");
    setLoading(true);
    try {
      const res = await adminLoginUser(form);
      login(res.data.token, res.data.user);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-12 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-app-gradient relative overflow-hidden">
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-violet-300/35 blur-3xl" />
      <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-pink-300/30 blur-3xl" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-7">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-xl shadow-violet-300/50">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-white text-violet-700 text-xs font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" /> Authority Access
          </div>
          <h1 className="text-3xl font-black mt-3 gradient-text">SafeTrail Admin</h1>
          <p className="text-slate-500 mt-1">Secure control centre for safety monitoring</p>
        </div>

        <div className="glass p-8 border-2 border-violet-100/80 shadow-2xl shadow-violet-100/50">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-800">Admin sign in</h2>
            <p className="text-sm text-slate-500 mt-1">This portal is restricted to authorised administrators.</p>
          </div>

          {error && <div className="mb-4 flex gap-2 items-center bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Admin email</label>
              <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" /><input className={input} type="email" name="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="admin@example.com" /></div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Password</label>
              <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" /><input className={input} type={showPass ? "text" : "password"} name="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="••••••••" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600">{showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button></div>
            </div>
            <button disabled={loading} className="w-full py-3.5 rounded-2xl text-white font-extrabold bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 shadow-lg shadow-violet-200 hover:-translate-y-0.5 transition disabled:opacity-50">{loading ? "Verifying access…" : "Enter Admin Portal"}</button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-sm">
            <Link to="/login" className="text-slate-500 hover:text-violet-600 flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> User login</Link>
            <span className="text-slate-400">Protected access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
