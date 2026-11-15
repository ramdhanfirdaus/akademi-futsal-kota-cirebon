import React from "react";
import { LucideIcon } from "lucide-react";

interface HeaderAction {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
}

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    actions?: HeaderAction[];
}

export default function AppHeader({
    title,
    subtitle,
    actions = [],
}: AppHeaderProps) {
    const getButtonStyle = (variant?: string) => {
        switch (variant) {
            case "secondary":
                return "bg-slate-200 hover:bg-slate-300 text-slate-800";
            case "danger":
                return "bg-red-500 hover:bg-red-600 text-white";
            default:
                return "bg-blue-600 hover:bg-blue-700 text-white";
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
                <h1 className="text-3xl font-black tracking-tight">
                    {title}
                </h1>

                {subtitle && (
                    <p className="text-slate-400 font-medium text-md">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions.length > 0 && (
                <div className="w-full md:w-auto flex gap-3">
                    {actions.map((action, i) => {
                        const Icon = action.icon;

                        return (
                            <button
                                key={i}
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={`w-full md:w-auto flex items-center justify-center gap-2 font-bold px-6 py-2.5 rounded-xl transition shadow-lg hover:translate-y-[-1px] active:translate-y-[0px] ${getButtonStyle(
                                    action.variant
                                )}`}
                            >
                                {Icon && <Icon size={18} />}
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
