'use client';

import React, { useEffect, useState } from 'react';
import { Users, School, CalendarCheck, UserSquare2, Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { useSelector } from 'react-redux';

import { DashboardSummary, StudentDashboard, UserRole } from '@/types.ts';
import { RootState } from '@/store';
import { DashboardService } from '@/services';
import { apiErrorMessage } from '@/services/errors';
import { DAYS, MONTH_KEYS } from '@/constants.tsx';
import { LoadingSpinner, useNotification } from '@/components';

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${MONTH_KEYS[Number(m) - 1]} ${y}`;
}

const StatCard = ({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const StaffDashboard: React.FC = () => {
  const { showNotification } = useNotification();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    DashboardService.getSummaries()
      .then((res) => setSummary(res.data))
      .catch((e) => showNotification({ type: 'error', message: apiErrorMessage(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Ringkasan Akademi</h2>
        <p className="text-slate-500">Data terkini siswa, pelatih, kelas, dan kehadiran.</p>
      </header>

      {!summary ? (
        <LoadingSpinner text="Memuat ringkasan..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Siswa" value={String(summary.total_students)} icon={<Users className="text-blue-600" />} color="bg-blue-50" />
          <StatCard label="Pelatih Aktif" value={String(summary.total_coaches)} icon={<UserSquare2 className="text-sky-600" />} color="bg-sky-50" />
          <StatCard label="Total Kelas" value={String(summary.total_classes)} icon={<School className="text-indigo-600" />} color="bg-indigo-50" />
          <StatCard
            label="Rata-rata Kehadiran (tahun ini)"
            value={`${summary.average_attendance}%`}
            icon={<CalendarCheck className="text-amber-600" />}
            color="bg-amber-50"
          />
        </div>
      )}
    </div>
  );
};

const PAYMENT_LABEL: Record<StudentDashboard['payment_status'], { text: string; cls: string }> = {
  PAID: { text: 'Lunas', cls: 'text-emerald-700' },
  UNPAID: { text: 'Belum dibayar', cls: 'text-rose-600' },
  HOLIDAY: { text: 'Libur (tidak ada iuran)', cls: 'text-amber-700' },
};

const StudentView: React.FC = () => {
  const { showNotification } = useNotification();
  const [data, setData] = useState<StudentDashboard | null>(null);

  useEffect(() => {
    DashboardService.getStudentDashboard()
      .then((res) => setData(res.data))
      .catch((e) => showNotification({ type: 'error', message: apiErrorMessage(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <LoadingSpinner text="Memuat data..." />;

  const percent = data.meetings ? Math.round((data.attended / data.meetings) * 100) : 0;
  const payment = PAYMENT_LABEL[data.payment_status];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Halo!</h2>
        <p className="text-slate-500">Ringkasan latihanmu bulan {monthLabel(data.month)}.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle2 /></div>
            <span className="text-2xl font-bold text-slate-800">{data.attended} / {data.meetings}</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Kehadiran bulan ini</p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Calendar /></div>
            <p className="text-sm font-bold text-slate-800">{data.class ? `Kelas ${data.class.name}` : 'Belum ada kelas'}</p>
          </div>
          <p className="text-sm font-medium text-slate-500">Jadwal latihan</p>
          {data.schedules.length === 0 ? (
            <p className="text-xs text-slate-400 mt-2">Belum ada jadwal</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {data.schedules.map((s) => (
                <li key={s.id} className="text-xs text-slate-600">
                  {DAYS[s.day_of_week]}, {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Wallet /></div>
            <span className={`text-sm font-bold ${payment.cls}`}>{payment.text}</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Iuran bulan ini</p>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  if (!role) return null;
  return role === UserRole.STUDENT ? <StudentView /> : <StaffDashboard />;
};

export default Dashboard;
