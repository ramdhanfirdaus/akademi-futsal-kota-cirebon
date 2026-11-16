import { LucideIcon, User } from "lucide-react";

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: LucideIcon;
    onReset?: () => void;
}

export default function EmptyState({
    title = "Tidak ada data ditemukan",
    description = "Coba ubah filter atau kata kunci pencarian Anda.",
    icon: Icon,
    onReset,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
            {Icon && (
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Icon size={32} />
                </div>
            )}

            <h3 className="text-lg font-bold text-slate-800">
                {title}
            </h3>

            <p className="text-slate-500 mt-1 text-sm">
                {description}
            </p>

            {onReset && (
                <button
                    onClick={onReset}
                    className="mt-4 text-laut font-bold hover:underline text-sm"
                >
                    Reset Semua Filter
                </button>
            )}
        </div>
    );
}
