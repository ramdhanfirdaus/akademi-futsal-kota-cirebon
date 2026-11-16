import { ChevronDown, LucideIcon } from "lucide-react";
import React from "react";

interface Option {
    value: string | number;
    label: string;
}

interface SelectInputProps {
    value: string | number;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    icon?: LucideIcon;
    options: Option[];
    allowEmpty?: boolean;
}

export default function SelectInput({
    value,
    onChange,
    label,
    icon: Icon,
    options,
    placeholder,
    allowEmpty
}: SelectInputProps) {
    return (
        <>
            <label className="font-bold flex items-center gap-2">
                {Icon && <Icon size={16} />}
                {label}
            </label>

            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-1.5 text-slate-700 font-semibold focus:border-laut focus:outline-none transition-all appearance-none cursor-pointer"
                >
                    {placeholder &&
                        <option value="" disabled={!allowEmpty}>
                            {placeholder}
                        </option>
                    }

                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
        </>
    );
}
