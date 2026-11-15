import { LucideIcon } from "lucide-react";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    icon?: LucideIcon;
}

export default function SearchInput({
    value,
    onChange,
    label = "Cari",
    placeholder = "Ketik untuk mencari...",
    icon: Icon,
}: SearchInputProps) {
    return (
        <>
            <label className="font-bold flex items-center gap-2">
                {Icon && <Icon size={16} />}
                {label}
            </label>

            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-1.5 text-slate-700 font-semibold focus:border-blue-500 focus:outline-none transition-all"
            />
        </>
    );
}
