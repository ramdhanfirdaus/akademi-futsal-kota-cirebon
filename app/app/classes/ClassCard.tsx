import React from "react";
import { Edit2, Trash2, Calendar, Clock, AlertCircle, User } from "lucide-react";
import Badge from "@/components/Badge";
import { Class } from "@/types.ts";
import { DAYS } from "@/constants.tsx";
import {BaseButton} from "@/components";

interface ClassCardProps {
    cls: Class;
    onEdit?: (cls: Class) => void;
    onDelete?: (cls: Class) => void;
}

export default function ClassCard({
    cls,
    onEdit,
    onDelete,
}: ClassCardProps) {
    return (
        <div
            key={cls.id}
            className="bg-white rounded-[2.5rem] border border-slate-100 p-7 flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 -mr-16 -mt-16 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>

            <div className="relative z-10 gap-2">
                <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Kelas {cls.name}</h3>
                    <div className="flex gap-2">
                        <BaseButton
                            onClick={() => onEdit(cls)}
                            className="flex-1"
                            size="sm"
                            variant="soft-primary"
                            icon={Edit2}
                        >
                            EDIT
                        </BaseButton>
                        <BaseButton
                            onClick={() => onDelete(cls)}
                            className="flex-1"
                            size="sm"
                            variant="soft-danger"
                            icon={Trash2}
                        >
                            HAPUS
                        </BaseButton>
                    </div>
                </div>

                <Badge title={`Coach ${cls.coach.nickname}`} icon={User} />

                <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-widest pb-2">Jadwal Latihan</p>
                    <div>
                        {cls.schedules.length > 0 ? cls.schedules.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white border border-slate-50 py-1 px-2.5 rounded-2xl shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Calendar size={14} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-slate-700">{DAYS[s.day_of_week]}</p>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                                        <Clock size={10} />
                                        <span>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-xs italic text-slate-400 flex items-center gap-2">
                                <AlertCircle size={14} /> Belum ada jadwal
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
