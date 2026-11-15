import React, {useState, useEffect, useCallback} from 'react';
import { Trash2, X, Plus } from 'lucide-react';
import { ApiResponse, Class, Coach, Schedule } from '@/types.ts';
import { EmptyState, AppHeader, useNotification } from '@/components';
import { DAY_OPTIONS } from "@/constants.tsx";
import { ClassCard } from './';
import { CoachService, ClassService } from "@/services";

const Classes: React.FC = () => {
    const { showNotification } = useNotification();
    const [classes, setClasses] = useState<Class[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);

    const fetchClasses = useCallback(async () => {
        setIsLoading(true);
        try {
            const response: ApiResponse<Class[]> = await ClassService.getClasses();
            setClasses(response.data);
        } catch (e) {
            showNotification({ type: 'error', message: e.message })
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchCoaches = useCallback(async () => {
        try {
            const response: ApiResponse<Coach[]> = await CoachService.getAllCoaches();
            setCoaches(response.data);
        } catch (e) {
            showNotification({ type: 'error', message: e.message })
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    useEffect(() => {
        fetchCoaches();
    }, [fetchCoaches]);

    const handleDelete = async (id: number, name: string) => {
        if (window.confirm(`Hapus Kelas ${name}?`)) {
            try {
                await ClassService.deleteClass(id);
            } catch (e) {
                showNotification({ type: 'error', message: e.message || 'Gagal menghapus kelas' })
            }
        }
    };

    const handleAddSchedule = () => {
        const currentSchedules = editingClass?.schedules || [];
        setEditingClass({
            ...editingClass,
            schedules: [
                ...currentSchedules,
                {day_of_week: 1, start_time: '16:00', end_time: '18:00'}
            ]
        });
    };

    const handleRemoveSchedule = (index: number) => {
        const currentSchedules = [...(editingClass?.schedules || [])];
        currentSchedules.splice(index, 1);
        setEditingClass({...editingClass, schedules: currentSchedules});
    };

    const handleScheduleChange = (index: number, field: keyof Schedule, value: any) => {
        const currentSchedules = [...(editingClass?.schedules || [])];
        currentSchedules[index] = {...currentSchedules[index], [field]: value};
        setEditingClass({...editingClass, schedules: currentSchedules});
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass?.name) return;

        setIsSaving(true);
        try {
            if (editingClass.id) {
                await ClassService.updateClass(editingClass.id, editingClass);
                showNotification({ type: 'success', message: 'Berhasil menyimpan kelas' })
            } else {
                await ClassService.createClass(editingClass);
                showNotification({ type: 'success', message: 'Berhasil membuat kelas' })
            }

            setIsFormOpen(false);
            setEditingClass(null);
            fetchClasses();
        } catch (e: any) {
            showNotification({ type: 'error', message: e.message || 'Gagal menyimpan kelas' })
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Main Controls */}
            <AppHeader
                title="Daftar Kelas"
                subtitle="Atur kelas akademi dan jadwal latihan mingguan"
                actions={[
                    {
                        label: "Tambah Kelas",
                        icon: Plus,
                        onClick: () => {
                            setEditingClass(null);
                            setIsFormOpen(true);
                        },
                    },
                ]}
            />

            <div className="space-y-4">
                {/* List Container */}
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <div
                            className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-medium animate-pulse">Memuat data kelas...</p>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 py-6">
                        <EmptyState
                            title="Tidak ada kelas ditemukan"
                            description="Tambahkan kelas baru."
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {classes.map((cls) => (
                            <ClassCard
                                key={cls.id}
                                cls={cls}
                                onEdit={(cls) => {
                                    setEditingClass(cls);
                                    setIsFormOpen(true);
                                }}
                                onDelete={(cls) => {
                                    handleDelete(cls.id, cls.name);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {isFormOpen && (
                <div
                    className="fixed !m-0 inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div
                        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div
                            className="bg-blue-600 p-8 flex justify-between items-center text-white relative overflow-hidden">
                            <div
                                className="absolute top-0 right-0 w-48 h-48 bg-white/10 -mr-24 -mt-24 rounded-full"></div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black">{editingClass?.id ? 'Edit Data Kelas' : 'Kelas Baru'}</h3>
                                <p className="text-blue-100 text-sm font-medium">Lengkapi informasi kelas dan
                                    jadwal.</p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={28}/>
                            </button>
                        </div>

                        <form onSubmit={handleSave}
                              className="p-8 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Basic Info Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-2">Nama
                                        Kelas</label>
                                    <input
                                        type="text"
                                        placeholder="Nama Kelas"
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none"
                                        required
                                        value={editingClass?.name || ''}
                                        onChange={e => setEditingClass({...editingClass, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label
                                        className="text-[10px] font-black text-slate-400 uppercase px-2">Pelatih</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-bold transition-all outline-none"
                                        value={editingClass?.coach_id ?? ''}
                                        onChange={e => setEditingClass({
                                            ...editingClass,
                                            coach_id: Number(e.target.value)
                                        })}
                                    >
                                        <option value="" disabled>-- Pilih Pelatih --</option>
                                        {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Schedules Section */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <label
                                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jadwal
                                            Latihan</label>
                                        <p className="text-xs text-slate-500 font-medium">Tentukan hari dan jam latihan
                                            rutin.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddSchedule}
                                        className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-colors"
                                    >
                                        <Plus size={14}/> Tambah Sesi
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    {editingClass?.schedules?.map((schedule, index) => (
                                        <div
                                            key={index}
                                            className="bg-slate-50 border-2 border-transparent p-2 rounded-3xl grid grid-cols-12 gap-1 items-center group/item hover:border-blue-100 hover:bg-white transition-all shadow-sm"
                                        >
                                            <div className="col-span-12 md:col-span-4 space-y-1">
                                                <span
                                                    className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Hari</span>
                                                <select
                                                    className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400"
                                                    value={schedule.day_of_week}
                                                    onChange={(e) => handleScheduleChange(index, 'day_of_week', parseInt(e.target.value))}
                                                >
                                                    {DAY_OPTIONS.map(opt => <option key={opt.value}
                                                                                    value={opt.value}>{opt.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-6 md:col-span-3 space-y-1">
                                                <span
                                                    className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Mulai</span>
                                                <input
                                                    type="time"
                                                    className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400"
                                                    value={schedule.start_time.slice(0, 5)}
                                                    onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-6 md:col-span-3 space-y-1">
                                                <span
                                                    className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Selesai</span>
                                                <input
                                                    type="time"
                                                    className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400"
                                                    value={schedule.end_time.slice(0, 5)}
                                                    onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-12 md:col-span-2 pt-4 md:pt-4 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSchedule(index)}
                                                    className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Hapus Sesi"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {(!editingClass?.schedules || editingClass.schedules.length === 0) && (
                                        <div
                                            className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-slate-50/30">
                                            <p className="text-slate-400 font-bold text-sm">Belum ada jadwal
                                                ditambahkan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div
                                className="flex gap-4 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/80 backdrop-blur-md pb-2 z-20">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm active:scale-95"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-sm active:scale-95"
                                >
                                    {isSaving ? (
                                        <div
                                            className="w-5 h-5 border-3 border-white border-t-transparent animate-spin rounded-full"></div>
                                    ) : (
                                        <>
                                            <span>Simpan Perubahan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
        </div>
    );
};

export default Classes;
