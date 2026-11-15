import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { BaseButton, Badge } from "@/components";
import { Coach } from "@/types.ts";
import { classLabel } from '@/lib/format';

interface CoachCardProps {
    coach: Coach;
    onEdit?: (coach: Coach) => void;
    onDelete?: (coach: Coach) => void;
}

export default function CoachCard({
    coach,
    onEdit,
    onDelete,
}: CoachCardProps) {
    return (
        <div
            className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-md hover:border-blue-200 transition-all group"
        >
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-blue-50 flex items-center justify-center text-xl font-black text-blue-600">
                    {coach.photo_url ? (
                        <img src={coach.photo_url} alt={`Foto ${coach.name}`} className="h-full w-full object-cover" />
                    ) : (
                        coach.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800">{coach.name}</h3>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Coach {coach.nickname}</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 xs:grid-cols-4 gap-2">
                    {coach.classes?.map((item) => (
                        <Badge title={classLabel(item.name)}/>
                    ))}
                </div>
                <div className="flex gap-2 w-full pt-4">
                    <BaseButton
                        onClick={() => onEdit(coach)}
                        className="flex-1"
                        size="sm"
                        variant="soft-primary"
                        icon={Edit2}
                    >
                        EDIT
                    </BaseButton>
                    <BaseButton
                        onClick={() => onDelete(coach)}
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
