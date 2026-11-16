import React from "react";

interface FormInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    required?: boolean;
}

export default function FormInput({
    label,
    required,
    className = "",
    ...props
}: FormInputProps) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-black uppercase px-2">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <input
                className={`
                    w-full px-4 py-3
                    bg-slate-50 border border-slate-300
                    focus:border-laut focus:bg-white
                    rounded-xl text-sm font-bold
                    outline-none transition-all
                    ${className}
                `}
                required={required}
                {...props}
            />
        </div>
    );
}
