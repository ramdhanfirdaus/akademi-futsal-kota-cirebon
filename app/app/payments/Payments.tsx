import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  Search
} from 'lucide-react';
import { Class, PaymentStudent } from "@/types.ts";
import { getYearOptions, MONTH_OPTIONS } from "@/constants.tsx";
import PaymentTable from "@/app/app/payments/PaymentTable.tsx";
import { AppHeader, BaseButton, SelectInput, useNotification } from "@/components";
import { ClassService, PaymentService } from "@/services";
import { apiErrorMessage } from '@/services/errors';
import SaveBar from '@/components/SaveBar';

const Payments: React.FC = () => {
  const { showNotification } = useNotification();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | number>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [records, setRecords] = useState<PaymentStudent[]>([]);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(new Date().getMonth());
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const yearOptions = getYearOptions();
  const classOptions = classes.map(cls => ({
    value: cls.id,
    label: cls.name
  }));

  const fetchClasses = useCallback(async () => {
    try {
      const res = await ClassService.getClasses();
      setClasses(res.data);
    } catch (error) {
      showNotification({ type: 'error', message: apiErrorMessage(error) })
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const fetchPayments = async () => {
    if (!selectedClassId) return;

    setIsLoading(true);
    try {
      const res = await PaymentService.getPayments(selectedClassId, selectedYear);
      setRecords(res.data);
    } catch (error) {
      showNotification({ type: 'error', message: apiErrorMessage(error) })
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const togglePayment = (studentId: number, monthIndex: number) => {
    setRecords(prev =>
      prev.map(student => {
        if (student.student_id !== studentId) return student;

        const updatedMonths = student.months.map((m, i) =>
          i === monthIndex && !m.is_holiday
            ? { ...m, is_paid: !m.is_paid }
            : m
        );

        return { ...student, months: updatedMonths };
      })
    );
  };

  const handleSave = async () => {
    if (records.length === 0) return;

    setIsSubmitting(true);
    try {
      await PaymentService.savePayments(selectedClassId, selectedYear, records);
      showNotification({ type: 'success', message: 'Berhasil menyimpan perubahan pembayaran' })
    } catch (error) {
      showNotification({ type: 'error', message: apiErrorMessage(error, 'Gagal menyimpan perubahan pembayaran') })
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <AppHeader title="Iuran" subtitle="Catat iuran bulanan siswa per kelas" />

      {/* Controls Card */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-end">
          {/* Class Select */}
          <div className="space-y-2">
            <SelectInput
              value={selectedClassId}
              onChange={setSelectedClassId}
              options={classOptions}
              label="Pilih Kelas"
              icon={Users}
              placeholder="-- Pilih Kelas --"
            />
          </div>

          {/* Year Selector */}
          <div className="space-y-2">
            <SelectInput
                value={selectedYear}
                onChange={(val) => setSelectedYear(Number(val))}
                options={yearOptions}
                label="Pilih Tahun"
                icon={Calendar}
            />
          </div>

          {isMobile && (
            <div className="space-y-2">
              <SelectInput
                  value={selectedMonthIdx}
                  onChange={(val) => setSelectedMonthIdx(Number(val))}
                  options={MONTH_OPTIONS}
                  label="Pilih Bulan"
                  icon={Clock}
              />
            </div>
          )}

          <div className="flex gap-2">
            <BaseButton
                icon={Search}
                onClick={fetchPayments}
                className="flex-1"
            >
              Cari
            </BaseButton>
          </div>
        </div>
      </div>

      <SaveBar onSave={handleSave} disabled={records.length === 0} saving={isSubmitting}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex items-center gap-3 text-sm font-bold text-laut-dalam">
          <AlertCircle size={16} />
          <span>Klik status untuk merubah pembayaran siswa.</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Lunas
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div> Belum
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Libur
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
            <span className="text-slate-300">–</span> Belum mulai iuran
          </div>
        </div>
      </div>
      </SaveBar>

      {/* Table Container */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden">
        <PaymentTable
          records={records}
          isMobile={isMobile}
          selectedMonthIdx={selectedMonthIdx}
          onToggle={togglePayment}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Payments;
