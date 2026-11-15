'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, CalendarOff, CheckCircle2, Clock, Minus } from 'lucide-react';

import type { StudentDashboard } from '@/types.ts';
import { DashboardService } from '@/services';
import { apiErrorMessage } from '@/services/errors';
import { DAYS, MONTH_KEYS } from '@/constants.tsx';
import { LoadingSpinner, useNotification } from '@/components';
import { dayOfWeek, todayWIB } from '@/lib/date';
import { classLabel } from '@/lib/format';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

type Payment = StudentDashboard['months'][number]['payment'];
const PAYMENT: Record<Payment, { label: string; icon: React.ReactNode; tone: string }> = {
  PAID: { label: 'Lunas', icon: <CheckCircle2 size={16} aria-hidden />, tone: 'text-daun' },
  UNPAID: { label: 'Belum bayar', icon: <AlertCircle size={16} aria-hidden />, tone: 'text-udang' },
  HOLIDAY: { label: 'Libur', icon: <CalendarOff size={16} aria-hidden />, tone: 'text-slate-500' },
  UPCOMING: { label: 'Belum jatuh tempo', icon: <Clock size={16} aria-hidden />, tone: 'text-slate-400' },
  NOT_DUE: { label: 'Belum mulai iuran', icon: <Minus size={16} aria-hidden />, tone: 'text-slate-400' },
  NOT_ENROLLED: { label: 'Belum terdaftar', icon: <Minus size={16} aria-hidden />, tone: 'text-slate-300' },
};

function longDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return `${DAYS[dayOfWeek(date)]}, ${d} ${MONTH_KEYS[m - 1]} ${y}`;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export default function StudentView() {
  const { showNotification } = useNotification();
  const [data, setData] = useState<StudentDashboard | null>(null);

  useEffect(() => {
    DashboardService.getStudentDashboard()
      .then((res) => setData(res.data))
      .catch((e) => showNotification({ type: 'error', message: apiErrorMessage(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <LoadingSpinner text="Memuat data..." />;

  const today = todayWIB();
  const percent = data.meetings ? Math.round((data.attended / data.meetings) * 100) : null;
  const pay = PAYMENT[data.payment_status];
  const firstName = data.nickname || data.name.split(/\s+/)[0];
  const year = data.month.slice(0, 4);
  const held = data.months.filter((m) => m.meetings !== null);
  const yearAttended = held.reduce((a, m) => a + (m.attended ?? 0), 0);
  const yearMeetings = held.reduce((a, m) => a + (m.meetings ?? 0), 0);

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Greeting + next session: the one thing a student opens the app for. */}
      <section className="overflow-hidden rounded-2xl bg-pantai text-laut-dalam">
        <div className="grid gap-6 p-5 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <p className="text-sm font-bold">{data.class ? classLabel(data.class.name) : 'Belum terdaftar di kelas'}</p>
            <h2 className="mt-1 font-display text-5xl font-black uppercase leading-none md:text-6xl">Halo, {firstName}!</h2>
            <div className="mt-5 flex items-start gap-3">
              <CalendarClock size={22} className="mt-0.5 shrink-0" aria-hidden />
              {data.next_session ? (
                <div>
                  <p className="text-sm">{data.next_session.date === today ? 'Latihan hari ini' : 'Latihan berikutnya'}</p>
                  <p className="text-lg font-bold md:text-xl">{longDate(data.next_session.date)}</p>
                  <p className="tabular-nums">
                    {data.next_session.start_time}–{data.next_session.end_time} WIB
                  </p>
                </div>
              ) : (
                <p className="text-lg font-bold">Belum ada jadwal latihan</p>
              )}
            </div>
          </div>

          {data.coach && (
            <div className="flex items-center gap-4 self-end rounded-xl bg-white/60 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-laut font-display text-2xl font-black text-white">
                {data.coach.photo_url ? <img src={data.coach.photo_url} alt="" className="h-full w-full object-cover" /> : initials(data.coach.name)}
              </div>
              <div>
                <p className="text-sm">Pelatih kelasmu</p>
                <p className="text-lg font-bold leading-tight">{data.coach.name}</p>
                {data.coach.nickname && <p className="text-sm">Coach {data.coach.nickname}</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm text-slate-600">Kehadiran {MONTH_KEYS[Number(data.month.slice(5)) - 1]}</h3>
          <p className="mt-1 font-display text-5xl font-black tabular-nums text-laut-dalam">
            {data.attended}
            <span className="text-3xl text-slate-400">/{data.meetings}</span>
          </p>
          <div className="mt-3 h-2.5 w-full rounded-full bg-laut-muda" role="img" aria-label={percent === null ? 'Belum ada sesi' : `${percent}% hadir`}>
            <div className="h-full rounded-full bg-laut" style={{ width: `${percent ?? 0}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {percent === null ? 'Belum ada sesi latihan bulan ini.' : `${percent}% sesi latihan bulan ini sudah kamu ikuti.`}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm text-slate-600">Iuran {MONTH_KEYS[Number(data.month.slice(5)) - 1]}</h3>
          <p className={`mt-2 flex items-center gap-2 text-2xl font-bold ${pay.tone}`}>
            {React.cloneElement(pay.icon as React.ReactElement<{ size?: number }>, { size: 26 })}
            {data.payment_status === 'HOLIDAY' ? 'Bulan libur' : pay.label}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {data.payment_status === 'PAID' && 'Terima kasih, iuran bulan ini sudah tercatat.'}
            {data.payment_status === 'UNPAID' && 'Iuran bulan ini belum tercatat. Bayar ke pelatih atau pengurus, lalu minta dicatat.'}
            {data.payment_status === 'HOLIDAY' && 'Tidak ada iuran dan latihan bulan ini.'}
            {data.payment_status === 'NOT_DUE' && 'Iuranmu belum mulai dihitung bulan ini.'}
          </p>
          {data.unpaid_months.length === 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-daun">
              <CheckCircle2 size={16} aria-hidden /> Tidak ada tunggakan iuran
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm text-slate-600">Jadwal latihan</h3>
          {data.schedules.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Belum ada jadwal untuk kelasmu.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {data.schedules.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span className="font-bold text-laut-dalam">{DAYS[s.day_of_week]}</span>
                  <span className="tabular-nums text-slate-600">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.unpaid_months.length > 0 && (
        <section className="rounded-xl border border-udang/30 bg-white p-5" aria-labelledby="tunggakan">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="mt-0.5 shrink-0 text-udang" aria-hidden />
            <div className="flex-1">
              <h3 id="tunggakan" className="font-bold text-laut-dalam">
                Iuran belum dibayar: {data.unpaid_months.length} bulan
              </h3>
              <p className="text-sm text-slate-500">Bayar ke pelatih atau pengurus, lalu minta dicatat di AFKC.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.unpaid_months.map((m) => (
                  <li key={m} className="rounded-full border border-udang/30 bg-udang/5 px-3 py-1 text-sm font-bold text-udang-tua">
                    {MONTH_KEYS[Number(m.slice(5)) - 1]} {m.slice(0, 4)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* The year at a glance: one cell per month with attendance and fee status. */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-bold text-laut-dalam">Catatanmu tahun {year}</h3>
            <p className="text-sm text-slate-500">
              {yearMeetings ? `Hadir ${yearAttended} dari ${yearMeetings} sesi latihan sejauh ini.` : 'Belum ada sesi latihan tahun ini.'}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {(['PAID', 'UNPAID', 'HOLIDAY'] as Payment[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className={PAYMENT[k].tone}>{PAYMENT[k].icon}</span>
                {PAYMENT[k].label}
              </li>
            ))}
          </ul>
        </div>

        <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
          {data.months.map((m, i) => {
            const current = m.month === data.month;
            const future = m.meetings === null;
            const p = PAYMENT[m.payment];
            const rate = m.meetings ? (m.attended ?? 0) / m.meetings : 0;
            const detail = m.payment === 'NOT_ENROLLED'
              ? `${MONTH_KEYS[i]}: belum terdaftar`
              : future
              ? `${MONTH_KEYS[i]}: belum berjalan, iuran ${p.label.toLowerCase()}`
              : `${MONTH_KEYS[i]}: hadir ${m.attended}/${m.meetings}, iuran ${p.label.toLowerCase()}`;
            return (
              <li
                key={m.month}
                title={detail}
                aria-label={detail}
                className={`rounded-lg border p-3 ${current ? 'border-laut bg-laut-muda' : 'border-slate-200'} ${future ? 'opacity-60' : ''}`}
              >
                <p className="text-sm font-bold text-laut-dalam">{SHORT_MONTHS[i]}</p>
                <p className="mt-1 text-sm tabular-nums text-slate-600">{future ? '–' : m.payment === 'HOLIDAY' ? 'Libur' : `${m.attended}/${m.meetings}`}</p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                  {!future && m.meetings ? <div className="h-full rounded-full bg-laut" style={{ width: `${rate * 100}%` }} /> : null}
                </div>
                <p className={`mt-2 flex items-center gap-1 text-xs ${p.tone}`}>
                  {p.icon}
                  <span className="sr-only">{p.label}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
