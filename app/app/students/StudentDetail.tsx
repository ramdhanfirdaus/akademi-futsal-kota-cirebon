
import React from "react";
import {
    ChevronLeft,
    Hash,
    Calendar,
    User,
    Phone,
    MapPin,
    ShieldAlert,
    Clock,
    UserCircle,
    Activity,
    Trophy, Shield
} from "lucide-react";
import { Student } from "@/types";

interface StudentDetailProps {
    student: Student;
    onBack: () => void;
    formatDate: (date?: string) => string;
}

export default function StudentDetail({
    student,
    onBack,
    formatDate,
}: StudentDetailProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ACTION BAR */}
            <div className="flex justify-between items-center gap-4">
                <button
                    onClick={onBack}
                    className="group flex items-center gap-2 px-4 py-2 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm font-semibold text-sm"
                >
                    <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to List
                </button>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* PROFILE SIDEBAR */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                        {/* Profile Header Background */}
                        <div className="h-32 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 relative">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        </div>

                        <div className="px-6 pb-8 relative">
                            {/* Avatar */}
                            <div className="flex justify-center">
                                <div className="-mt-16 w-32 h-32 rounded-[2.5rem] bg-white p-1.5 shadow-xl">
                                    <div className="w-full h-full rounded-[2.2rem] bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 relative group">
                                        {student.academy_students?.photo ? (
                                            <img src={student.academy_students.photo} alt={student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-black text-slate-300">
                                                {student.name.charAt(0)}
                                            </span>
                                        )}
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
                                            <UserCircle className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Name & Title */}
                            <div className="text-center mt-6">
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                                    {student.name}
                                </h2>
                                <p className="text-indigo-600 font-bold text-base mt-2 flex items-center justify-center gap-1.5">
                                    <Trophy size={16} />
                                    {student.nickname}
                                </p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wider">
                                        @{student.username}
                                    </span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mt-8 pt-8 border-t border-slate-100">
                                <StatusBadge label="Member Status" value="Active" type="success" />
                                <StatusBadge label="Academy Class" value={student.academy_students?.class?.name ?? "-"} type="info" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* DETAILED INFO SECTION */}
                <div className="lg:col-span-8 space-y-8">
                    {/* General Information */}
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Hash size={20} />
                                </div>
                                Personal Profile
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10">
                            <InfoField
                                icon={Calendar}
                                label="Date of Birth"
                                value={`${student.birth_place || "-"}, ${formatDate(student.birth_date)}`}
                            />
                            <InfoField
                                icon={User}
                                label="Parent / Guardian"
                                value={student.parent_name || "-"}
                            />
                            <InfoField
                                icon={MapPin}
                                label="Home Address"
                                value={student.address || "-"}
                            />
                            <InfoField
                                icon={Phone}
                                label="Primary Contact"
                                value={student.parent_phone || "-"}
                            />
                        </div>
                    </div>

                    {/* Academic & Medical Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Academy History */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
                                    <Clock size={18} />
                                </div>
                                Training Status
                            </h3>
                            <div className="space-y-6">
                                <InfoField
                                    icon={Calendar}
                                    label="Joined Academy"
                                    value={student.academy_students?.year_join?.toString() || "-"}
                                />
                                <InfoField
                                    icon={Activity}
                                    label="Primary Position"
                                    value={student.academy_students?.position || "Not assigned"}
                                />
                                {student.academy_students?.position !== 'KIPER' && (
                                    <div className="flex items-center gap-4">
                                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${student.academy_students?.is_goalkeeper ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-300"}`}>
                                            <Shield size={18} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                                Goalkeeper Training
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-semibold text-sm ${student.academy_students?.is_goalkeeper ? "text-amber-600" : "text-slate-400 italic"}`}>
                                                    {student.academy_students?.is_goalkeeper ? "Active Program" : "Not Enrolled"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Medical Summary */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                                    <ShieldAlert size={18} />
                                </div>
                                Health Profile
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full font-black text-sm border border-rose-100">
                                        TYPE {student.blood_type || "?"}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Blood Type</span>
                                </div>
                                <InfoField
                                    icon={Activity}
                                    label="Medical History"
                                    value={student.disease_history || "No records reported"}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-center py-4 px-6 bg-slate-100/50 border border-slate-100 rounded-2xl">
                        <p className="text-[11px] text-slate-400 font-medium">
                            Profile last synchronized on {formatDate(student.updated_at)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * UI SUB-COMPONENTS
 */
function InfoField({
    icon: Icon,
    label,
    value,
    fullWidth
}: {
    icon: any;
    label: string;
    value: string;
    fullWidth?: boolean;
}) {
    return (
        <div className={`flex items-start gap-4 ${fullWidth ? "md:col-span-2" : ""}`}>
            <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    {label}
                </p>
                <p className="text-slate-800 font-semibold text-base leading-snug">
                    {value}
                </p>
            </div>
        </div>
    );
}

function ContactItem({
    icon: Icon,
    label,
    value
}: {
    icon: any;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
                <p className="text-slate-700 font-semibold text-xs truncate">{value}</p>
            </div>
        </div>
    );
}

function StatusBadge({
    label,
    value,
    type
}: {
    label: string;
    value: string;
    type: 'success' | 'info' | 'warning';
}) {
    const styles = {
        success: "bg-emerald-50 text-emerald-700 border-emerald-100",
        info: "bg-indigo-50 text-indigo-700 border-indigo-100",
        warning: "bg-amber-50 text-amber-700 border-amber-100",
    };

    return (
        <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${styles[type]} transition-all hover:scale-[1.02]`}>
            <p className="text-[9px] font-extrabold uppercase tracking-widest opacity-60 mb-1">
                {label}
            </p>
            <p className="font-black text-xs uppercase truncate w-full text-center">
                {value}
            </p>
        </div>
    );
}
