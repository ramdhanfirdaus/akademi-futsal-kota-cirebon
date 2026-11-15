import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Calendar,
} from 'lucide-react';
import { Attendance, Class } from '@/types.ts';
import {
  useNotification,
  AppHeader,
  SelectInput,
  EmptyState,
  BaseButton,
  DateInput
} from "@/components";
import { ClassService, AttendanceService } from "@/services";

const App: React.FC = () => {
  const { showNotification } = useNotification();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | number>('');
  const [attendanceData, setAttendanceData] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const classOptions = classes.map(cls => ({
    value: cls.id,
    label: cls.name
  }));

  // Date range state
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const [startDate, setStartDate] = useState(weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await ClassService.getClasses();
      setClasses(res.data);
    } catch (error) {
      showNotification({ type: 'error', message: error.message })
    }
  }, []);

  const fetchAttendance = async () => {
    if (!selectedClassId) return;
    setIsLoading(true);
    try {
      const res = await AttendanceService.getAttendances(selectedClassId, startDate, endDate);
      const raw = res.data;
      const attendanceData: Attendance = {
        ...raw,
        dates: Object.values(raw.dates)
      };

      setAttendanceData(attendanceData);
    } catch (error) {
      showNotification({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const toggleAttendance = (studentId: number, date: string) => {
    if (!attendanceData) return;

    setAttendanceData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        students: prev.students.map(student => {
          if (student.student_id === studentId) {
            return {
              ...student,
              attendance: {
                ...student.attendance,
                [date]: !student.attendance[date]
              }
            };
          }
          return student;
        })
      };
    });
  };

  const handleSave = async () => {
    if (!attendanceData) return;
    setIsSubmitting(true);
    try {
      const scheduleByDate = Object.fromEntries(
          attendanceData.dates.map(d => [d.date, d.class_schedule_id])
      );
      const list = attendanceData.students.flatMap(student =>
          Object.entries(student.attendance).map(([date, status]) => ({
            student_id: student.student_id,
            class_schedule_id: scheduleByDate[date],
            date,
            is_present: status
          }))
      );

      await AttendanceService.saveAttendances(list)
      showNotification({ type: 'success', message: 'Absensi berhasil disimpan' })
    } catch (error) {
      showNotification({ type: 'error', message: 'Gagal menyimpan absensi' })
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className="space-y-6">
        {/* Top Header */}
        <AppHeader
            title="Absensi"
            subtitle="Management Absensi"
            actions={[
              {
                label: "Simpan Perubahan",
                icon: Plus,
                onClick: handleSave,
                disabled: isSubmitting || !attendanceData
              },
            ]}
        />

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6">
          {/* Controls Card */}
          <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-100 shadow-md">
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

              {/* Start Date */}
              <div className="space-y-2">
                <DateInput
                    value={startDate}
                    onChange={setStartDate}
                    label="Tanggal Mulai"
                    icon={ChevronLeft}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <DateInput
                    value={endDate}
                    onChange={setEndDate}
                    label="Tanggal Selesai"
                    icon={ChevronRight}
                    iconPosition="right"
                />
              </div>

              <div className="flex gap-2">
                <BaseButton
                    icon={Search}
                    onClick={fetchAttendance}
                    className="flex-1"
                >
                  Cari
                </BaseButton>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-md font-medium px-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Hadir</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <span>Absen</span>
              </div>
            </div>
          </div>

          {/* Main Grid Card */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative">
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent animate-spin rounded-full mb-3"></div>
                  <p className="text-slate-400 font-bold text-sm">Memuat data kelas...</p>
                </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent animate-spin rounded-full mb-3"></div>
                <p className="text-slate-400 font-bold text-sm">Memuat data kelas...</p>
              </div>
            ) : !attendanceData ? (
                <div className="bg-white rounded-3xl border border-slate-100 py-6">
                  <EmptyState
                      icon={Calendar}
                      title="Tidak ada data"
                      description="Setup data kelas dan siswa anda."
                  />
                </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>
                      <th className="sticky left-0 z-10 bg-slate-50 px-8 py-5 min-w-[240px]">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">Nama Lengkap Siswa</span>
                        </div>
                      </th>
                      {attendanceData?.dates.map(date => {
                        const d = new Date(date.date);
                        const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
                        const dayNum = d.getDate();
                        const isToday = date.date === today.toISOString().split('T')[0];

                        return (
                            <th key={date.class_schedule_id} className={`px-4 py-5 min-w-[100px] text-center border-l border-slate-100 ${isToday ? 'bg-blue-50/50' : ''}`}>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayName}</span>
                                <span className={`text-lg font-black ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{dayNum}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
                              </div>
                            </th>
                        );
                      })}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {attendanceData.students.map((student) => {
                      return (
                          <tr key={student.student_id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-8 py-4 border-r border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-700">{student.name}</span>
                              </div>
                            </td>
                            {attendanceData?.dates.map(date => (
                                <td key={date.class_schedule_id} className="px-4 py-4 text-center border-l border-slate-50">
                                  <button
                                      onClick={() => toggleAttendance(student.student_id, date.date)}
                                      className={`
                                w-10 h-10 rounded-2xl flex items-center justify-center mx-auto transition-all transform hover:scale-110 active:scale-95
                                ${student.attendance[date.date]
                                          ? 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-100/50'
                                          : 'bg-rose-50 text-rose-300 hover:text-rose-400'}
                              `}
                                  >
                                    {student.attendance[date.date] ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                  </button>
                                </td>
                            ))}
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </main>
      </div>
  );
};

export default App;
