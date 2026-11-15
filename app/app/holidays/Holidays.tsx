import React, { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { HolidayPeriod } from '@/types.ts';
import { HolidayService } from '@/services';
import { apiErrorMessage } from '@/services/errors';
import { getYearOptions, MONTH_KEYS, MONTH_OPTIONS } from '@/constants.tsx';
import { AppHeader, BaseButton, ConfirmModal, EmptyState, LoadingSpinner, SelectInput, useNotification } from '@/components';
import { todayWIB } from '@/lib/date';

function label(period: string) {
  const [y, m] = period.split('-');
  return `${MONTH_KEYS[Number(m) - 1]} ${y}`;
}

const Holidays: React.FC = () => {
  const { showNotification } = useNotification();
  const today = todayWIB();
  const [holidays, setHolidays] = useState<HolidayPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [month, setMonth] = useState<number>(Number(today.slice(5, 7)) - 1);
  const [year, setYear] = useState<number>(Number(today.slice(0, 4)));
  const [deleteTarget, setDeleteTarget] = useState<HolidayPeriod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await HolidayService.getHolidays();
      setHolidays(res.data);
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      const period = `${year}-${String(month + 1).padStart(2, '0')}`;
      await HolidayService.createHoliday(period);
      showNotification({ type: 'success', message: `${label(period)} ditandai sebagai bulan libur` });
      fetchHolidays();
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e, 'Gagal menambah bulan libur') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await HolidayService.deleteHoliday(deleteTarget.id);
      showNotification({ type: 'success', message: 'Bulan libur dihapus' });
      setDeleteTarget(null);
      fetchHolidays();
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AppHeader title="Bulan Libur" subtitle="Bulan libur tidak dihitung iuran dan tidak masuk rata-rata kehadiran" />

      <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-100 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-end">
          <SelectInput value={month} onChange={(v) => setMonth(Number(v))} options={MONTH_OPTIONS} label="Bulan" icon={Clock} />
          <SelectInput value={year} onChange={(v) => setYear(Number(v))} options={getYearOptions()} label="Tahun" icon={Calendar} />
          <BaseButton icon={Plus} onClick={handleAdd} disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Tambah'}
          </BaseButton>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Memuat bulan libur..." />
      ) : holidays.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 py-6">
          <EmptyState icon={CalendarOff} title="Belum ada bulan libur" description="Tambahkan bulan saat akademi libur (misalnya Lebaran)." />
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><CalendarOff size={18} /></div>
                <span className="font-bold text-slate-700">{label(h.period)}</span>
              </div>
              <BaseButton size="sm" variant="soft-danger" icon={Trash2} onClick={() => setDeleteTarget(h)}>
                HAPUS
              </BaseButton>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Bulan Libur"
        description={deleteTarget ? `Hapus ${label(deleteTarget.period)} dari daftar bulan libur?` : ''}
        confirmText="Hapus"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Holidays;
