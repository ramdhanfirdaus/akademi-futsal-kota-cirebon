import React from "react";

interface LoadingSpinnerProps {
    text?: string;
    size?: "sm" | "md" | "lg";
    fullscreen?: boolean;
}

export default function LoadingSpinner({
    text = "Memuat data...",
    size = "md",
    fullscreen = false,
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "w-6 h-6 border-2",
        md: "w-12 h-12 border-4",
        lg: "w-16 h-16 border-4",
    };

    return (
        <div
            className={`
                flex flex-col items-center justify-center space-y-4
                ${fullscreen ? "min-h-screen" : "p-20"}
            `}
        >
            <div
                className={`
                    ${sizeClasses[size]}
                    border-laut/15 border-t-laut
                    rounded-full animate-spin
                `}
            />

            {text && (
                <p className="text-slate-400 font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}
