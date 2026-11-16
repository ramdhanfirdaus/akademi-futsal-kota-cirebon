'use client';

import React, { useState } from 'react';
import { Key, Save, Shield } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ProfileService } from '@/services';
import { apiErrorMessage } from '@/services/errors';
import { AppHeader, useNotification } from '@/components';
import PasswordInput from '@/components/Input/PasswordInput';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', COACH: 'Pelatih', STUDENT: 'Siswa' };

const inputCls =
  'w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-laut outline-none text-sm';

const Profile: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { showNotification } = useNotification();
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      showNotification({ type: 'error', message: 'Konfirmasi password tidak sama' });
      return;
    }
    setIsSaving(true);
    try {
      await ProfileService.changePassword(form.old_password, form.new_password);
      showNotification({ type: 'success', message: 'Password berhasil diubah' });
      setForm({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      showNotification({ type: 'error', message: apiErrorMessage(err, 'Gagal mengubah password') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AppHeader title="Profil Saya" subtitle="Informasi akun dan ganti password" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center h-fit">
          <div className="w-28 h-28 bg-laut-muda rounded-full flex items-center justify-center text-3xl font-bold text-laut border-4 border-white shadow-md uppercase">
            {user?.username?.charAt(0) ?? '?'}
          </div>
          <h3 className="mt-4 font-bold text-slate-800 text-lg">{user?.username}</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <Shield size={14} /> {user ? ROLE_LABEL[user.role] ?? user.role : '-'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Key size={18} className="text-laut" /> Ganti Password
          </h4>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Password Lama</label>
            <PasswordInput required autoComplete="current-password" value={form.old_password}
              onChange={(e) => setForm({ ...form, old_password: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password Baru</label>
              <PasswordInput required minLength={6} autoComplete="new-password" value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Ulangi Password Baru</label>
              <PasswordInput required minLength={6} autoComplete="new-password" value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={isSaving}
              className="bg-laut-dalam hover:bg-laut disabled:bg-slate-300 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-laut-dalam/20 flex items-center gap-2 transition-all active:scale-95">
              {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
              Simpan Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
