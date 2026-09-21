import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/layout/MainLayout";
import API, { updatePrimaryContact } from "../services/api";
import {
  User, Phone, Mail, Heart, Home,
  Plus, Trash2, Save, CheckCircle,
  AlertCircle, Shield, Pencil, X
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
      setContacts(prev => [...prev, {
        id:       res.data.id,
        name:     newContact.name,
        phone:    newContact.phone,
        email:    newContact.email,
        relation: newContact.relation,
      }]);
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
      name:     contact.name     || "",
      phone:    contact.phone    || "",
      email:    contact.email    || "",
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
      login(token, res.data.user); // keeps AuthContext (and SOS/AlertPopup) in sync
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
  const inputClass  = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition";

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto st-v2-page">

        <div className="st-v2-hero">
          <div className="relative z-10">
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <User className="w-6 h-6 text-brand-500" />
            My Profile
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Manage your personal info and your complete emergency safety circle.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur">
            🛡️ {contacts.length} emergency contact{contacts.length === 1 ? "" : "s"} configured
          </div>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-safe rounded-xl px-4 py-3 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />{success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError("")} className="ml-auto text-xs">✕</button>
          </div>
        )}

        {/* Personal Info */}
        <div className="glass p-6 space-y-4">
          <h2 className="text-slate-800 font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-500 text-sm mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={profile.name}
                  onChange={e => setProfile({...profile, name: e.target.value})}
                  className={`${inputClass} pl-10`} placeholder="Your name" />
              </div>
            </div>

            <div>
              <label className="text-slate-500 text-sm mb-1 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="tel" value={profile.phone}
                  onChange={e => setProfile({...profile, phone: e.target.value})}
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

            <div>
              <label className="text-slate-500 text-sm mb-1 block">Blood Group</label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select value={profile.blood_group}
                  onChange={e => setProfile({...profile, blood_group: e.target.value})}
                  className={`${inputClass} pl-10 appearance-none`}>
                  <option value="" className="bg-white">Select blood group</option>
                  {bloodGroups.map(b => (
                    <option key={b} value={b} className="bg-white">{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-500 text-sm mb-1 block">Home Address</label>
            <div className="relative">
              <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea value={profile.home_address}
                onChange={e => setProfile({...profile, home_address: e.target.value})}
                rows={2} placeholder="Your home address"
                className={`${inputClass} pl-10 resize-none`} />
            </div>
          </div>

          <button onClick={handleProfileSave} disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Emergency Contacts */}
        <div className="glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-800 font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-danger" />
              Emergency Contacts
              <span className="text-xs text-slate-400">({contacts.length})</span>
            </h2>
            <button onClick={() => { setShowAddForm(!showAddForm); setError(""); }}
              className="flex items-center gap-2 bg-brand-100 hover:bg-brand-100 text-brand-500 text-sm px-3 py-1.5 rounded-xl transition">
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-danger text-xs font-medium">
              🚨 All contacts receive SOS email alert with live location
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Add as many people as you need — email is required for SOS notifications
            </p>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
              <Phone className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No emergency contacts yet</p>
              <p className="text-slate-500 text-xs mt-1">Add someone who can help in emergencies</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, i) => (
                <div key={contact.id || i}
                  className="st-v2-contact flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200/60">
                      <span className="text-white font-black text-sm">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-slate-800 font-medium">{contact.name}</p>
                      <p className="text-slate-500 text-sm">{contact.phone}</p>
                      {contact.email ? (
                        <p className="text-brand-500 text-xs">{contact.email}</p>
                      ) : (
                        <p className="text-moderate text-xs">⚠️ No email — tap Edit to add one</p>
                      )}
                      <p className="text-slate-400 text-xs">{contact.relation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.source === "registration" ? (
                      <>
                        <span className="text-xs bg-brand-100 text-brand-500 px-2 py-1 rounded-full">
                          Primary
                        </span>
                        <button onClick={() => openEditPrimary(contact)}
                          className="w-8 h-8 bg-white hover:bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleDeleteContact(contact.id)}
                        className="w-8 h-8 bg-red-50 hover:bg-red-100 text-danger rounded-lg flex items-center justify-center transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {editingPrimary && (
            <div className="border border-brand-200 bg-brand-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 text-sm font-semibold">Edit Primary Contact</h3>
                <button onClick={() => { setEditingPrimary(false); setError(""); }}
                  className="text-slate-400 hover:text-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">Full Name *</label>
                <input type="text" value={primaryForm.name}
                  onChange={e => setPrimaryForm({...primaryForm, name: e.target.value})}
                  className={inputClass} />
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">Phone Number *</label>
                <input type="tel" value={primaryForm.phone}
                  onChange={e => setPrimaryForm({...primaryForm, phone: e.target.value})}
                  className={inputClass} />
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">
                  Email Address * (SOS alerts sent here)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={primaryForm.email}
                    onChange={e => setPrimaryForm({...primaryForm, email: e.target.value})}
                    placeholder="emergency@gmail.com"
                    className={`${inputClass} pl-10`} />
                </div>
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">Relation</label>
                <select value={primaryForm.relation}
                  onChange={e => setPrimaryForm({...primaryForm, relation: e.target.value})}
                  className={`${inputClass} appearance-none`}>
                  {relations.map(r => (
                    <option key={r} value={r} className="bg-white">{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setEditingPrimary(false); setError(""); }}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-500 py-2.5 rounded-xl transition text-sm">
                  Cancel
                </button>
                <button onClick={handleSavePrimary} disabled={savingPrimary}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {savingPrimary ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {showAddForm && (
            <div className="border border-brand-200 bg-brand-50 rounded-xl p-4 space-y-3">
              <h3 className="text-slate-800 text-sm font-semibold">
                Add Emergency Contact
              </h3>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">Full Name *</label>
                <input type="text" value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  placeholder="Contact's full name" className={inputClass} />
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">Phone Number *</label>
                <input type="tel" value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                  placeholder="10-digit mobile number" className={inputClass} />
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">
                  Email Address * (SOS alerts sent here)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={newContact.email}
                    onChange={e => setNewContact({...newContact, email: e.target.value})}
                    placeholder="emergency@gmail.com"
                    className={`${inputClass} pl-10`} />
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  They will receive email with your live Google Maps location on SOS
                </p>
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-1 block">Relation</label>
                <select value={newContact.relation}
                  onChange={e => setNewContact({...newContact, relation: e.target.value})}
                  className={`${inputClass} appearance-none`}>
                  {relations.map(r => (
                    <option key={r} value={r} className="bg-white">{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setError("");
                    setNewContact({ name:"", phone:"", email:"", relation:"Parent" });
                  }}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-500 py-2.5 rounded-xl transition text-sm">
                  Cancel
                </button>
                <button onClick={handleAddContact} disabled={adding}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  {adding ? "Adding..." : "Add Contact"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Safety Info */}
        <div className="glass p-5">
          <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-safe" />
            How Emergency Contacts Are Notified
          </h3>
          <div className="space-y-2">
            {[
              "All contacts receive email when you press the SOS button",
              "Auto-alert sent if you don't respond to danger zone in 30 seconds",
              "Email includes live Google Maps location link",
              "Email shows your name, phone, zone name and exact time",
              "Contacts listed in order — contact 1 is your primary contact",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-500">
                <span className="text-safe mt-0.5 shrink-0">✓</span>
                {text}
              </div>
            ))}
          </div>
        </div>
            {/* Logout */}
<div className="glass p-5">
  <button
    onClick={handleLogout}
    className="w-full bg-red-600 hover:bg-red-700 text-slate-800 font-semibold py-3 rounded-xl transition"
  >
    Logout
  </button>
</div>
      </div>
    </MainLayout>
  );
}