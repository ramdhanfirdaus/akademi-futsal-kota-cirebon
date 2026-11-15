
import React from "react";
import BaseButton from "./BaseButton";
import { ModalVariant } from "../types";

interface ConfirmModalProps {
    open: boolean;
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ModalVariant;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    open,
    title = "Konfirmasi Tindakan",
    description = "Apakah Anda yakin ingin melanjutkan proses ini? Tindakan ini mungkin tidak dapat dibatalkan.",
    confirmText = "Lanjutkan",
    cancelText = "Batal",
    variant = "danger",
    isLoading = false,
    onConfirm,
    onCancel
}) => {
    if (!open) return null;

    const getVariantConfig = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: 'bg-rose-100',
                    iconColor: 'text-rose-600',
                    btnVariant: 'danger' as const,
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )
                };
            case 'warning':
                return {
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                    btnVariant: 'primary' as const,
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
            default:
                return {
                    iconBg: 'bg-indigo-100',
                    iconColor: 'text-indigo-600',
                    btnVariant: 'primary' as const,
                    icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
        }
    };

    const config = getVariantConfig();

    return (
        <div className="fixed inset-0 z-[999] !mt-0 flex items-center justify-center p-4">
            {/* Backdrop with sophisticated blur */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300"
                onClick={!isLoading ? onCancel : undefined}
            />

            {/* Modal Container */}
            <div className="relative bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-modal-pop">

                {/* Visual Header Accent (Conditional based on variant) */}
                <div className={`h-2 w-full ${variant === 'danger' ? 'bg-rose-500' : 'bg-indigo-500'}`} />

                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        {/* Icon Circle */}
                        <div className={`mb-5 p-4 rounded-full ${config.iconBg} ${config.iconColor}`}>
                            {config.icon}
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {title}
                        </h2>

                        <div className="text-slate-500 mt-3 leading-relaxed">
                            {description}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-10">
                        <BaseButton
                            variant="secondary"
                            className="flex-1 rounded-2xl py-3 border-slate-200"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            {cancelText}
                        </BaseButton>

                        <BaseButton
                            variant={config.btnVariant}
                            className="flex-1 rounded-2xl py-3 shadow-lg"
                            onClick={onConfirm}
                            isLoading={isLoading}
                        >
                            {confirmText}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;