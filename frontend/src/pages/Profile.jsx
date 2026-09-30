import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/layout/MainLayout";
import API, { updatePrimaryContact } from "../services/api";
import {
  User, Phone, Mail, Heart, Home,
  Plus, Trash2, Save, CheckCircle,
  AlertCircle, Shield, Pencil, X, Sparkles, LogOut
} from "lucide-react";

const relations = ["Parent", "Sibling", "Spouse", "Friend", "Guardian", "Other"];

export default function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name:         user?.name         || "",
    phone:        user?.phone        || "",
    blood_group:  user?.blood_group  || "",
    home_address: user?.home_address || "",
  });

  const [contacts, setContacts]       = useState([]);
  const [newContact, setNewContact]   = useState({ name:"", phone:"", email:"", relation:"Parent" });
  const [saving, setSaving]           = useState(false);
  const [adding, setAdding]           = useState(false);
  const [success, setSuccess]         = useState("");
  const [error, setError]             = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrimary, setEditingPrimary] = useState(false);
  const [primaryForm, setPrimaryForm] = useState({ name:"", phone:"", email:"", relation:"Other" });
  const [savingPrimary, setSavingPrimary] = useState(false);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const res         = await API.get("/api/user/emergency-contacts");
      const dbContacts  = res.data.contacts || [];
      const regContacts = (user?.emergency_contacts || []).map((c, i) => ({
        id:       `reg_${i}`,
        name:     c.name     || "",
        phone:    c.phone    || "",
        email:    c.email    || "",
        relation: c.relation || "Other",
        source:   "registration",
      }));

      // Merge both sources, deduplicate by phone
      const seen   = new Set();
      const merged = [];
      for (const c of [...regContacts, ...dbContacts]) {
        const key = c.phone || c.id;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(c);
        }
      }
      setContacts(merged);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res   = await API.put("/api/user/profile", profile);
      const token = localStorage.getItem("safetrail_token");
      login(token, res.data.user);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      setError("Name and phone are required"); return;
    }
    if (!/^\d{10}$/.test(newContact.phone)) {
      setError("Enter a valid 10-digit phone number"); return;
    }
    if (!newContact.email || !/\S+@\S+\.\S+/.test(newContact.email)) {
      setError("Enter a valid email address for SOS alerts"); return;
    }
    setAdding(true);
    setError("");
    try {
      const res = await API.post("/api/user/emergency-contact", newContact);
      setContacts([...contacts, res.data.contact]);
      setNewContact({ name:"", phone:"", email:"", relation:"Parent" });
      setShowAddForm(false);
      setSuccess("Emergency contact added!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to add contact");
    } finally {
      setAdding(false);
    }
  };

  const openEditPrimary = (contact) => {
    setPrimaryForm({
      name:     contact.name,
      phone:    contact.phone,
      email:    contact.email || "",
      relation: contact.relation || "Other",
    });
    setEditingPrimary(true);
    setError("");
  };

  const handleSavePrimary = async () => {
    if (!primaryForm.name || !primaryForm.phone) {
      setError("Name and phone are required"); return;
    }
    if (!/^\d{10}$/.test(primaryForm.phone)) {
      setError("Enter a valid 10-digit phone number"); return;
    }
    if (!primaryForm.email || !/\S+@\S+\.\S+/.test(primaryForm.email)) {
      setError("Enter a valid email address for SOS alerts"); return;
    }
    setSavingPrimary(true);
    setError("");
    try {
      const res = await updatePrimaryContact(primaryForm);
      const token = localStorage.getItem("safetrail_token");
      login(token, res.data.user);
      setContacts(prev => prev.map(c =>
        c.source === "registration" ? { ...c, ...primaryForm, source: "registration" } : c
      ));
      setEditingPrimary(false);
      setSuccess("Primary contact updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to update primary contact");
    } finally {
      setSavingPrimary(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (String(contactId).startsWith("reg_")) {
      setError("Primary contact cannot be deleted here.");
      return;
    }
    try {
      await API.delete(`/api/user/emergency-contact/${contactId}`);
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setSuccess("Contact removed");
      setTimeout(() => setSuccess(""), 2000);
    } catch (e) {
      setError("Failed to delete contact");
    }
  };

  const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
  const inputClass  = "w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:bg-white";

  return (
    <MainLayout>
      <div className="page-shell space-y-6 max-w-3xl mx-auto">

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-pink-500/20 bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 animated-gradient border border-white/20">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                Personal Safety Profile
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                <span>{user?.name || "My Account"}</span>
              </h1>
              <p className="text-white/90 text-sm mt-1 max-w-lg font-medium">
                Manage your credentials, medical metadata, and your linked guardian circle.
              </p>
            </div>
            <div className="shrink-0 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 text-xs font-extrabold flex items-center gap-1.5 shadow-md">
              <Shield className="w-4 h-4 text-emerald-300" />
              <span>{contacts.length} Guardians Active</span>
            </div>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-emerald-800 rounded-2xl p-4 text-sm font-bold shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-rose-600 rounded-2xl p-4 text-sm font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-xs font-black">✕</button>
          </div>
        )}

        {/* Personal Info Card */}
        <div className="glass p-6 sm:p-7 border border-white/90 shadow-xl shadow-indigo-500/10 space-y-5">
          <h2 className="text-slate-800 font-extrabold text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-300">
              <User className="w-4 h-4" />
            </div>
            <span>Personal Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile({...profile, name: e.target.value})}
                  className={`${inputClass} pl-10`}
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile({...profile, phone: e.target.value})}
                  className={`${inputClass} pl-10`}
                  placeholder="10-digit number"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 block">Email (Read Only)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className={`${inputClass} pl-10 opacity-60 cursor-not-allowed`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 block">Blood Group</label>
              <div className="relative">
                <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                <select
                  value={profile.blood_group}
                  onChange={e => setProfile({...profile, blood_group: e.target.value})}
                  className={`${inputClass} pl-10 appearance-none`}
                >
                  <option value="">Select blood group</option>
                  {bloodGroups.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 block">Home Address</label>
            <div className="relative">
              <Home className="absolute left-3.5 top-3.5 w-4 h-4 text-indigo-400" />
              <textarea
                value={profile.home_address}
                onChange={e => setProfile({...profile, home_address: e.target.value})}
                rows={2}
                placeholder="Your home address"
                className={`${inputClass} pl-10 resize-none`}
              />
            </div>
          </div>

          <button
            onClick={handleProfileSave}
            disabled={saving}
            className="w-full brand-gradient animated-gradient text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-indigo-300 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
          </button>
        </div>

        {/* Emergency Contacts Management */}
        <div className="glass p-6 sm:p-7 border border-white/90 shadow-xl shadow-indigo-500/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-800 font-extrabold text-base flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-300">
                <Phone className="w-4 h-4" />
              </div>
              <span>Emergency Guardians</span>
              <span className="text-xs font-bold text-slate-400">({contacts.length})</span>
            </h2>
            <button
              onClick={() => { setShowAddForm(!showAddForm); setError(""); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          </div>

          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-4">
            <p className="text-rose-700 text-xs font-black">
              🚨 Live SOS Broadcast List
            </p>
            <p className="text-slate-600 text-xs mt-0.5 font-medium">
              All registered guardians receive instant SMS and Email notifications with your live Google Maps coordinates when SOS is triggered.
            </p>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
              <Phone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-sm">No emergency guardians registered</p>
              <p className="text-slate-400 text-xs mt-1">Tap Add Contact above to safeguard your travels.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, i) => (
                <div
                  key={contact.id || i}
                  className="p-4 rounded-2xl bg-gradient-to-r from-white via-indigo-50/20 to-purple-50/20 border border-indigo-100 hover:border-purple-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-800 font-bold text-sm truncate">{contact.name}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {contact.relation}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs font-mono">{contact.phone}</p>
                      {contact.email ? (
                        <p className="text-indigo-600 text-xs truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-indigo-400" /> {contact.email}
                        </p>
                      ) : (
                        <p className="text-amber-600 text-xs font-semibold">⚠️ No email — tap Edit to add email</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {contact.source === "registration" ? (
                      <>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                          Primary
                        </span>
                        <button
                          onClick={() => openEditPrimary(contact)}
                          className="w-8 h-8 bg-white hover:bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition border border-slate-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="w-8 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center transition border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {editingPrimary && (
            <div className="border border-purple-200 bg-purple-50/50 rounded-2xl p-5 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 text-sm font-extrabold">Edit Primary Contact</h3>
                <button onClick={() => { setEditingPrimary(false); setError(""); }} className="text-slate-400 hover:text-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  value={primaryForm.name}
                  onChange={e => setPrimaryForm({...primaryForm, name: e.target.value})}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 mb-1 block">Phone Number *</label>
                <input
                  type="tel"
                  value={primaryForm.phone}
                  onChange={e => setPrimaryForm({...primaryForm, phone: e.target.value})}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 mb-1 block">Email Address * (For SOS Link)</label>
                <input
                  type="email"
                  value={primaryForm.email}
                  onChange={e => setPrimaryForm({...primaryForm, email: e.target.value})}
                  className={inputClass}
                  placeholder="guardian@example.com"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setEditingPrimary(false); setError(""); }}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl transition text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrimary}
                  disabled={savingPrimary}
                  className="flex-1 brand-gradient animated-gradient text-white font-extrabold py-2.5 rounded-xl transition text-xs shadow-md shadow-indigo-300"
                >
                  {savingPrimary ? "Saving..." : "Save Primary"}
                </button>
              </div>
            </div>
          )}

          {showAddForm && (
            <div className="border border-purple-200 bg-purple-50/50 rounded-2xl p-5 space-y-3.5 animate-fade-in">
              <h3 className="text-slate-800 text-sm font-extrabold">Add New Emergency Contact</h3>

              <div>
                <label className="text-xs font-extrabold text-slate-600 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  placeholder="e.g. Alex Green"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 mb-1 block">Phone Number *</label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={e => setNewContact({...newContact, phone: e.target.value})}
                    placeholder="10-digit number"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 mb-1 block">Relation</label>
                  <select
                    value={newContact.relation}
                    onChange={e => setNewContact({...newContact, relation: e.target.value})}
                    className={`${inputClass} appearance-none`}
                  >
                    {relations.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 mb-1 block">Email Address *</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={e => setNewContact({...newContact, email: e.target.value})}
                  placeholder="emergency@example.com"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl transition text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={adding}
                  className="flex-1 brand-gradient animated-gradient text-white font-extrabold py-2.5 rounded-xl transition text-xs shadow-md shadow-indigo-300"
                >
                  {adding ? "Adding..." : "Add Guardian"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Card */}
        <div className="glass p-5 border border-white/90">
          <button
            onClick={handleLogout}
            className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of SafeTrail</span>
          </button>
        </div>

      </div>
    </MainLayout>
  );
}