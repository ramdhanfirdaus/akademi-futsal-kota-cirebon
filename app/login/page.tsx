'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import { fetchMe, login } from '@/store/slices/authSlice';
import PasswordInput from '@/components/Input/PasswordInput';
import Waves from '@/components/landing/Waves';
import { publicFonts } from '@/lib/fonts';

const field =
  'w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-base text-laut-dalam placeholder:text-slate-400 focus:border-laut focus:outline-none';

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const authStatus = useSelector((state: RootState) => state.auth.status);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (authStatus === 'idle') dispatch(fetchMe());
  }, [authStatus, dispatch]);
  useEffect(() => {
    if (user) router.replace('/app/dashboard');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await dispatch(login({ username: username.trim(), password })).unwrap();
      router.replace('/app/dashboard');
    } catch {
      setError('Username atau password salah. Periksa lagi, atau minta pelatih mereset password Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={`${publicFonts} font-body grid min-h-screen bg-white text-laut-dalam lg:grid-cols-2`}>
      {/* Crest panel */}
      <div className="relative flex flex-col bg-pantai">
        <div className="px-4 pt-4 sm:px-8 sm:pt-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded px-1 py-1 text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-laut-dalam">
            <ArrowLeft size={16} aria-hidden /> Kembali ke beranda
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-4 pt-2 text-center lg:pb-10">
          <img src="/logo.png" alt="Lambang Futsal Kota Cirebon" className="w-32 sm:w-40 lg:w-72" />
          <p className="font-display text-3xl font-black uppercase leading-none sm:text-4xl lg:text-5xl">
            Akademi Futsal
            <br />
            Kota Cirebon
          </p>
        </div>
        <Waves className="hidden lg:block" />
      </div>

      {/* Form */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:bg-laut-muda">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="font-display text-5xl font-black uppercase">Masuk</h1>
            <p className="mt-2 text-laut-dalam/75">Gunakan username dan password yang diberikan pelatih atau admin AFKC.</p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-udang/30 bg-udang/10 px-4 py-3 text-sm text-udang-tua">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-bold">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={field}
              placeholder="contoh: budi01"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-bold">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
              toggleClassName="text-laut-dalam/60 hover:text-laut-dalam focus-visible:outline-laut"
              placeholder="Masukkan password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-laut-dalam py-3.5 text-base font-bold text-white transition-colors hover:bg-laut disabled:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam"
          >
            {isLoggingIn && <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {isLoggingIn ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
      </main>
    </div>
  );
}
