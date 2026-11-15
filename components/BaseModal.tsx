import React from "react";
import { X } from "lucide-react";

interface BaseModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export default function BaseModal({
      open,
      onClose,
      title,
      subtitle,
      children,
      maxWidth = "max-w-2xl",
}: BaseModalProps) {
    if (!open) return null;

    return (
        <div
            className="
                fixed inset-0 z-[100] !mt-0
                bg-slate-900/60 backdrop-blur-md
                flex items-end md:items-center justify-center
                animate-in fade-in duration-200
            "
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`
                    bg-white w-full ${maxWidth}
                    rounded-t-[2rem] md:rounded-[2.5rem]
                    shadow-2xl overflow-hidden
                    animate-in slide-in-from-bottom-20 md:zoom-in-95 duration-300
                `}
            >
                {/* HEADER */}
                <div className="bg-blue-600 p-8 flex justify-between items-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 -mr-24 -mt-24 rounded-full"></div>
                    <div>
                        <h3 className="text-xl font-black">{title}</h3>

                        {subtitle && (
                            <p className="text-blue-100 text-[10px] font-bold mt-0.5 uppercase tracking-widest">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* BODY */}
                {children}
            </div>
        </div>
    );
}
