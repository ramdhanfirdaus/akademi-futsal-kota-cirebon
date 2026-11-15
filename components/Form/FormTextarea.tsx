import React from "react";

interface FormTextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    required?: boolean;
}

export default function FormTextarea({
    label,
    required,
    className = "",
    ...props
}: FormTextareaProps) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-black uppercase px-2">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            <textarea
                className={`
                    w-full px-4 py-3
                    bg-slate-50 border border-slate-300
                    focus:border-blue-500 focus:bg-white
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
