import React from "react";

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    helperText?: string;
}

export default function FormCheckbox({
    label,
    helperText,
    className = "",
    ...props
}: FormCheckboxProps) {
    return (
        <label className="flex items-start gap-3 cursor-pointer select-none my-1">
            {/* checkbox */}
            <div className="relative mt-1">
                <input
                    type="checkbox"
                    className={`
                        peer appearance-none
                        w-5 h-5
                        rounded-md
                        border border-slate-300
                        bg-white
                        checked:bg-laut-dalam
                        checked:border-laut-dalam
                        transition-all
                        ${className}
                    `}
                    {...props}
                />

                {/* check icon */}
                <svg
                    className="
                        pointer-events-none
                        absolute inset-0 m-auto
                        w-5 h-5
                        text-white
                        opacity-0
                        peer-checked:opacity-100
                    "
                    viewBox="0 0 24 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                >
                    <path d="M5 13l4 4L19 7" />
                </svg>
            </div>

            {/* text */}
            <div className="leading-tight">
                <p className="text-sm font-bold text-slate-700">
                    {label}
                </p>

                {helperText && (
                    <p className="text-xs text-slate-400">
                        {helperText}
                    </p>
                )}
            </div>
        </label>
    );
}
