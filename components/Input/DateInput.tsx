import React from "react";
import { LucideIcon } from "lucide-react";

interface DateInputProps {
    value: string;
    onChange: (value: string) => void;

    label?: string;
    icon?: LucideIcon;
    iconPosition?: "left" | "right";

    min?: string;
    max?: string;
}

export default function DateInput({
    value,
    onChange,
    label,
    icon: Icon,
    iconPosition = "left",
    min,
    max,
}: DateInputProps) {
    return (
        <>
            {label && (
                <label className="font-bold flex items-center gap-2">
                    {Icon && iconPosition === "left" && (
                        <Icon size={16} />
                    )}
                    {label}
                    {Icon && iconPosition === "right" && (
                        <Icon size={16} />
                    )}
                </label>
            )}

            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                min={min}
                max={max}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-1.5 text-slate-700 font-semibold focus:border-laut focus:outline-none transition-all appearance-none cursor-pointer"
            />
        </>
    );
}
