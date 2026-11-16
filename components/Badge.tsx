import React from "react";
import { LucideIcon } from "lucide-react";

interface BadgeProps {
    title: string;
    icon?: LucideIcon;
}

export default function Badge({ title, icon: Icon }: BadgeProps) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 px-2 py-1 bg-laut-muda/50 rounded-lg text-center whitespace-nowrap border-2 border-slate-100">
            {Icon && <Icon size={14} className="shrink-0" />}
            {title}
        </span>
    );
}
