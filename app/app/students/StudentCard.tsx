import React from "react";
import { ChevronRight, Edit2, Trash2 } from "lucide-react";
import { BaseButton } from "@/components";
import { Student } from "@/types.ts";

interface StudentCardProps {
    student: Student;
    onClick?: (student: Student) => void;
    onEdit?: (student: Student) => void;
    onDelete?: (student: Student) => void;
    getAge: (date: string) => number;
}

export default function StudentCard({
    student,
    onClick,
    onEdit,
    onDelete,
    getAge,
}: StudentCardProps) {
    return (
        <div
            onClick={() => onClick(student)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-md active:scale-[0.98] transition-all hover:border-blue-200"
        >
            <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-slate-800 truncate text-sm">{student.name}</h4>
                    <p className="text-xs text-slate-400 truncate">{student.nickname} •
                        Kelas {student.academy_students.class.name}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300"/>
            </div>
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-50">
                <span
                    className="text-[10px] font-black uppercase tracking-wider text-slate-400">{student.birth_date ? `${getAge(student.birth_date)} Tahun` : '-'}</span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <BaseButton
                        onClick={() => onEdit(student)}
                        className="flex-1"
                        size="sm"
                        variant="soft-primary"
                        icon={Edit2}
                    >
                        EDIT
                    </BaseButton>
                    <BaseButton
                        onClick={() => onDelete(student)}
                        className="flex-1"
                        size="sm"
                        variant="soft-danger"
                        icon={Trash2}
                    >
                        HAPUS
                    </BaseButton>
                </div>
            </div>
        </div>
    );
}
