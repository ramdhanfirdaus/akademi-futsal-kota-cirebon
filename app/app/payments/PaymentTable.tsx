import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { PaymentStudent } from '../../../types.ts';
import { MONTH_NAMES } from '../../../constants.tsx';
import LoadingSpinner from "@/components/LoadingSpinner.tsx";
import EmptyState from "@/components/EmptyState.tsx";

interface PaymentTableProps {
    records: PaymentStudent[];
    isMobile: boolean;
    selectedMonthIdx: number;
    onToggle: (studentId: number, monthIdx: number) => void;
    isLoading: boolean;
}

const HolidayPill = () => (
    <span className="inline-block px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider" title="Bulan libur — tidak ada iuran">
        Libur
    </span>
);

/** Before the student's fee start: nothing owed, nothing to tick (a month paid anyway still shows its tick). */
const NotDuePill = () => (
    <span className="inline-block px-2.5 py-1 text-sm font-bold text-slate-300" title="Belum mulai iuran">
        –
    </span>
);

const PaymentTable: React.FC<PaymentTableProps> = ({
    records,
    isMobile,
    selectedMonthIdx,
    onToggle,
    isLoading
}) => {
    if (isLoading) {
        return <LoadingSpinner text="Memuat data pembayaran..." />;
    }

    if (records.length === 0) {
        return (
            <EmptyState
                title="Tidak ada data ditemukan"
                description="Pilih kelas atau periksa kata kunci pencarian Anda."
                icon={Circle}
            />
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-md font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10 border-b border-slate-100">
                            Siswa
                        </th>
                        {!isMobile ? (
                            MONTH_NAMES.map((name, i) => (
                                <th key={name} className="px-3 py-4 text-md font-extrabold text-slate-400 uppercase text-center border-b border-slate-100">
                                    {name}
                                </th>
                            ))
                        ) : (
                            <th className="px-4 py-4 text-md font-bold text-slate-500 uppercase text-center border-b border-slate-100">
                                {MONTH_NAMES[selectedMonthIdx]}
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {records.map((student) => (
                    <tr key={student.student_id} className="group hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50/30 transition-colors z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                            <span className="font-bold text-slate-700 whitespace-nowrap">{student.name}</span>
                        </td>

                        {!isMobile ? (
                            student.months.map((month, i) => (
                                <td key={month.period} className="px-3 py-4 text-center">
                                    {month.is_holiday ? (
                                        <HolidayPill />
                                    ) : month.not_due && !month.is_paid ? (
                                        <NotDuePill />
                                    ) : (
                                    <button
                                        onClick={() => onToggle(student.student_id, i)}
                                        className={`p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 ${
                                            month.is_paid
                                                ? 'text-emerald-500 bg-emerald-50'
                                                : 'text-slate-200 hover:text-slate-300 hover:bg-slate-50'
                                        }`}
                                        title={`${MONTH_NAMES[i]} ${month.is_paid ? 'Paid' : 'Unpaid'}`}
                                    >
                                        {month.is_paid ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                    </button>
                                    )}
                                </td>
                            ))
                        ) : (
                            <td className="px-4 py-4 text-center">
                                {student.months[selectedMonthIdx]?.is_holiday ? (
                                    <HolidayPill />
                                ) : student.months[selectedMonthIdx]?.not_due && !student.months[selectedMonthIdx]?.is_paid ? (
                                    <span className="text-xs font-bold text-slate-400">Belum mulai iuran</span>
                                ) : (
                                <button
                                    onClick={() => onToggle(student.student_id, selectedMonthIdx)}
                                    className={`p-2 rounded-xl transition-all ${
                                        student.months[selectedMonthIdx]?.is_paid
                                            ? 'text-emerald-500 bg-emerald-50 ring-1 ring-emerald-100'
                                            : 'text-slate-300 bg-slate-50 ring-1 ring-slate-100'
                                    }`}
                                >
                                    {student.months[selectedMonthIdx]?.is_paid ? (
                                        <div className="flex items-center gap-2 font-bold text-xs">
                                            <CheckCircle2 size={20} /> LUNAS
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 font-bold text-xs">
                                            <Circle size={20} /> BELUM
                                        </div>
                                    )}
                                </button>
                                )}
                            </td>
                        )}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default PaymentTable;
