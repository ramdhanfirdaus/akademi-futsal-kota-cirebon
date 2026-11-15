'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Users, School, CalendarCheck, Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { useSelector } from 'react-redux';

import { ParticipantStats, StudentDashboard, UserRole } from '@/types.ts';
import { BarList, Panel, SplitBar, StatTile } from './charts';
import { RootState } from '@/store';
import { DashboardService } from '@/services';
import { apiErrorMessage } from '@/services/errors';
import { DAYS, MONTH_KEYS } from '@/constants.tsx';
import { LoadingSpinner, useNotification } from '@/components';

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${MONTH_KEYS[Number(m) - 1]} ${y}`;
}

const POSITION_LABEL: Record<string, string> = { ANCHOR: 'Anchor', FLANK: 'Flank', PIVOT: 'Pivot', KIPER: 'Kiper' };
// Validated categorical pair (blue/amber) plus a neutral for "not filled in".
const GENDER_COLORS = { MALE: '#0A72B8', FEMALE: '#E0A800', UNKNOWN: '#CBD5E1' };

const StaffDashboard: React.FC = () => {
  const { showNotification } = useNotification();
  const [classId, setClassId] = useState<number | undefined>(undefined);
  const [stats, setStats] = useState<ParticipantStats | null>(null);
  const [allClasses, setAllClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    DashboardService.getParticipants(classId)
      .then((res) => {
        setStats(res.data);
        if (!classId) setAllClasses(res.data.by_class.map(({ id, name }) => ({ id, name })));
      })
      .catch((e) => showNotification({ type: 'error', message: apiErrorMessage(e) }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const toggleClass = (id: number) => setClassId((cur) => (cur === id ? undefined : id));
  const scope = classId ? `Kelas ${allClasses.find((c) => c.id === classId)?.name ?? ''}` : 'Semua kelas';

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <h2 className="font-display text-4xl font-black uppercase text-laut-dalam">Peserta</h2>
          <p className="text-slate-500">{stats ? `${scope}, ${monthLabel(stats.month)}` : 'Memuat…'}</p>
        </div>
        {allClasses.length > 0 && (
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:overflow-visible md:px-0" role="group" aria-label="Pilih kelas">
            <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
              {[{ id: undefined as number | undefined, name: 'Semua kelas' }, ...allClasses].map((c) => {
                const active = classId === c.id;
                return (
                  <button
                    key={c.id ?? 'all'}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setClassId(c.id)}
                    className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
                      active ? 'border-laut-dalam bg-laut-dalam text-white' : 'border-slate-300 bg-white text-laut-dalam hover:border-laut'
                    }`}
                  >
                    {c.id ? `Kelas ${c.name}` : c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {!stats ? (
        <LoadingSpinner text="Memuat data peserta..." />
      ) : (
        <div className={`space-y-4 transition-opacity md:space-y-5 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatTile
              icon={<Users size={18} />}
              label="Siswa aktif"
              value={String(stats.totals.active)}
              note={`${stats.totals.new_this_year} bergabung tahun ${stats.month.slice(0, 4)}`}
            />
            <StatTile icon={<School size={18} />} label="Kelas" value={String(stats.totals.classes)} note={classId ? 'Kelas dipilih' : 'Kelas berjalan'} />
            <StatTile
              icon={<CalendarCheck size={18} />}
              label="Kehadiran bulan ini"
              value={stats.attendance.rate === null ? '–' : `${stats.attendance.rate}%`}
              note={stats.attendance.meetings ? `${stats.attendance.attended} dari ${stats.attendance.meetings} kehadiran` : 'Belum ada sesi latihan'}
            />
            <StatTile
              icon={<Wallet size={18} />}
              label="Iuran bulan ini"
              value={stats.payments.holiday ? 'Libur' : `${stats.payments.paid}/${stats.totals.active}`}
              note={stats.payments.holiday ? 'Tidak ada iuran bulan ini' : `${stats.payments.unpaid} siswa belum bayar`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Siswa per kelas" description="Ketuk kelas untuk melihat datanya saja.">
              <BarList
                rows={stats.by_class.map((c) => ({ key: c.id, label: `Kelas ${c.name}`, value: c.students, detail: `Kelas ${c.name}: ${c.students} siswa aktif` }))}
                onSelect={(k) => toggleClass(Number(k))}
                selectedKey={classId}
                emptyText="Belum ada kelas"
              />
            </Panel>
            <Panel title="Kehadiran per kelas" description={`Persentase hadir ${monthLabel(stats.month)} sampai hari ini.`}>
              <BarList
                rows={stats.by_class.map((c) => ({
                  key: c.id,
                  label: `Kelas ${c.name}`,
                  value: c.attendance_rate,
                  detail: c.attendance_rate === null ? `Kelas ${c.name}: belum ada sesi latihan` : `Kelas ${c.name}: ${c.attendance_rate}% hadir`,
                }))}
                max={100}
                format={(v) => `${v}%`}
                emptyText="Belum ada kelas"
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Iuran bulan ini"
              description={stats.payments.holiday ? 'Bulan ini ditandai sebagai bulan libur.' : 'Siswa yang belum tercatat membayar.'}
              action={
                !stats.payments.holiday && (
                  <Link href="/app/payments" className="shrink-0 text-sm font-bold text-laut hover:underline">
                    Buka Iuran
                  </Link>
                )
              }
            >
              {!stats.payments.holiday && (
                <>
                  <SplitBar
                    parts={[
                      { label: 'Lunas', value: stats.payments.paid, color: '#12893B', icon: <CheckCircle2 size={16} className="text-daun" aria-hidden /> },
                      { label: 'Belum bayar', value: stats.payments.unpaid, color: '#D62B1F', icon: <AlertCircle size={16} className="text-udang" aria-hidden /> },
                    ]}
                  />
                  {stats.unpaid_students.length > 0 ? (
                    <ul className="mt-4 max-h-64 divide-y divide-slate-100 overflow-y-auto">
                      {stats.unpaid_students.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className="truncate text-slate-700">{s.name}</span>
                          <span className="shrink-0 text-slate-500">Kelas {s.class}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    stats.totals.active > 0 && <p className="mt-4 text-sm text-slate-600">Semua siswa sudah membayar iuran bulan ini.</p>
                  )}
                </>
              )}
            </Panel>

            <Panel title="Kelompok usia" description="Berdasarkan tanggal lahir.">
              <BarList rows={stats.age_groups.map((g) => ({ key: g.label, label: g.label === 'Belum diisi' ? g.label : `${g.label} th`, value: g.count }))} />
            </Panel>

            <div className="space-y-4">
              <Panel title="Jenis kelamin">
                <SplitBar
                  parts={[
                    { label: 'Laki-laki', value: stats.gender.MALE, color: GENDER_COLORS.MALE },
                    { label: 'Perempuan', value: stats.gender.FEMALE, color: GENDER_COLORS.FEMALE },
                    ...(stats.gender.UNKNOWN ? [{ label: 'Belum diisi', value: stats.gender.UNKNOWN, color: GENDER_COLORS.UNKNOWN }] : []),
                  ]}
                />
              </Panel>
              <Panel title="Posisi">
                <BarList rows={Object.entries(stats.positions).map(([k, v]) => ({ key: k, label: POSITION_LABEL[k], value: v }))} />
              </Panel>
            </div>
          </div>

          <Panel title="Tahun bergabung" description="Jumlah siswa aktif menurut tahun masuk akademi.">
            <BarList rows={stats.year_join.map((y) => ({ key: y.year, label: String(y.year), value: y.count }))} />
          </Panel>
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
