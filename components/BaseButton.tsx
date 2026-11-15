import React from "react";
import { LucideIcon } from "lucide-react";

interface BaseButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: LucideIcon;
    size?: "sm" | "md";
    variant?:
        | "primary"
        | "secondary"
        | "ghost"
        | "danger"
        | "soft-primary"
        | "soft-danger";
    isLoading?: boolean;
}

export default function BaseButton({
    children,
    icon: Icon,
    variant = "primary",
    size = "md",
    className = "",
    isLoading,
    ...props
}: BaseButtonProps) {
    const variantClasses = {
        primary:
            "bg-blue-600 hover:bg-blue-700 text-white",
        secondary:
            "bg-slate-100 hover:bg-slate-200 text-slate-700",
        ghost:
            "hover:bg-slate-100 text-slate-600",
        danger:
            "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200",
        "soft-primary":
            "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white",
        "soft-danger":
            "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white",
    };

    const sizeClasses = {
        sm: "px-2 py-1 text-sm min-w-[80px]",
        md: "px-4 py-2 text-md min-w-[120px]",
    };

    return (
        <button
            className={`
                flex items-center justify-center gap-2
                rounded-xl font-bold transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${className}
            `}
            {...props}
        >
            {Icon && <Icon size={size === "sm" ? 14 : 16} />}
            {children}
        </button>
    );
}
