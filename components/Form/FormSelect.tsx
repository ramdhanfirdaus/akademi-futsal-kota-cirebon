import React from "react";

interface Option {
    id?: number | string;
    name: string;
}

interface FormSelectProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: Option[];
    required?: boolean;
}

export default function FormSelect({
    label,
    options,
    required,
    className = "",
    ...props
}: FormSelectProps) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-black uppercase px-2">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <div className="relative">
                <select
                    className={`
                    appearance-none
                    w-full px-4 py-3 pr-10
                    bg-slate-50 border border-slate-300
                    focus:border-blue-500 focus:bg-white
                    rounded-xl text-sm font-bold
                    outline-none transition-all
                    ${props.value ? "" : "text-slate-400"}
                    ${className}
                `}
                    required={required}
                    {...props}
                >
                    <option value="" disabled>
                        -- Pilih --
                    </option>

                    {options.map((o) => (
                        <option key={o.id ?? o.name} value={o.id ?? o.name}>
                            {o.name}
                        </option>
                    ))}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
