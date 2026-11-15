
import React, { useState } from 'react';
import { User, Save, Camera, Shield, Mail, Key } from 'lucide-react';

const Profile: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    phone: '',
    notifications: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      // onUpdate(formData);
      setIsSaving(false);
      alert('Profile updated successfully!');
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
        <p className="text-slate-500">Manage your personal information and account settings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white shadow-md overflow-hidden">
                {/*{user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user?.name?.charAt(0)}*/}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-colors">
                <Camera size={18} />
              </button>
            </div>
            {/*<h3 className="mt-4 font-bold text-slate-800 text-lg">{user?.name}</h3>*/}
            {/*<p className="text-sm text-slate-500">{user?.role}</p>*/}
          </div>

          <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <Shield className="absolute -right-4 -bottom-4 text-blue-800 opacity-20" size={120} />
            <div className="relative z-10">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <Shield size={18} /> Account Status
              </h4>
              <p className="text-xs text-blue-100/70 mb-4">Your account is verified and secure.</p>
              <div className="bg-blue-800/50 p-3 rounded-lg text-xs">
                Last login: Today, 10:42 AM
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+62 812..."
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Bio</label>
              <textarea 
                rows={3}
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
              ></textarea>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="notif"
                  checked={formData.notifications}
                  onChange={e => setFormData({...formData, notifications: e.target.checked})}
                  className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500" 
                />
                <label htmlFor="notif" className="text-sm text-slate-600">Receive email notifications</label>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </form>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Key size={18} className="text-blue-600" /> Security Settings
            </h4>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-700">Change Password</p>
                <p className="text-xs text-slate-500">Update your account password regularly to keep it secure.</p>
              </div>
              <button className="text-blue-600 font-bold text-sm px-4 py-2 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">
                Reset Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm font-medium px-4">
        <p>© 2026 Akademi Futsal Kota Cirebon • @r_adam29</p>
      </div>
    </div>
  );
};

export default Profile;
