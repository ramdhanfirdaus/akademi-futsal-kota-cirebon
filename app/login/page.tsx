'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { login } from '@/store/slices/authSlice.ts';
import { LogIn, Lock, User as UserIcon, Sparkles, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '../../constants';

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.push('/app/dashboard');
    }
  }, [auth.isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      await dispatch(login({ username, password })).unwrap();
      router.push('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Cek username & password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[80px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-200/40 rounded-full blur-[100px] animate-bounce duration-[10s]"></div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8 animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block group">
            <div className="w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40 transform group-hover:rotate-12 transition-transform cursor-pointer overflow-hidden">
              <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-cover"
              />
            </div>
            <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-bounce" size={24} />
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
            Halo! <span className="text-blue-600">{APP_NAME}</span> 👋
          </h1>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white space-y-6 animate-in slide-in-from-bottom-8 duration-700"
        >
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold text-center border border-rose-100">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="group">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold"
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95 group"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                Masuk Sekarang
              </>
            )}
          </button>
          
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <Heart size={10} className="inline text-rose-400" /> AFKC Hub • 2026
          </p>
        </form>
      </div>
    </div>
  );
}
