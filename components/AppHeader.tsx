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
    subtitle?: React.ReactNode;
    actions?: HeaderAction[];
    /** Extra controls on the right (e.g. a search box), shown before the action buttons. */
    children?: React.ReactNode;
}

/** Shared buttons styles, so every page's actions look the same. */
const BUTTON: Record<NonNullable<HeaderAction["variant"]>, string> = {
    primary: "bg-laut-dalam hover:bg-laut text-white shadow-lg shadow-laut-dalam/20",
    secondary: "bg-white border-2 border-slate-200 hover:border-laut text-laut-dalam",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
};

/** Page title used by every app page: AFKC display type, one style everywhere. */
export default function AppHeader({ title, subtitle, actions = [], children }: AppHeaderProps) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                <h1 className="font-display text-4xl font-black uppercase leading-none text-laut-dalam">{title}</h1>
                {subtitle && <p className="mt-1.5 text-slate-500">{subtitle}</p>}
            </div>

            {(children || actions.length > 0) && (
                <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
                    {children}
                    {actions.map((action, i) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold transition-colors disabled:bg-slate-300 disabled:text-white disabled:shadow-none md:w-auto ${BUTTON[action.variant ?? "primary"]}`}
                            >
                                {Icon && <Icon size={18} aria-hidden />}
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
