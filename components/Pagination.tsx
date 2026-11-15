import {ChevronLeft, ChevronRight} from "lucide-react";
import React from "react";

interface PaginationProps {
    page: number;
    lastPage: number;
    onChange: (page: number) => void;
}

export default function Pagination({
    page,
    lastPage,
    onChange,
}: PaginationProps) {
    const generatePages = () => {
        return Array.from({length: lastPage}, (_, i) => i + 1)
            .filter(p => {
                return (
                    p === 1 ||
                    p === lastPage ||
                    (p >= page - 1 && p <= page + 1)
                );
            });
    };

    const pages = generatePages();

    return (
        <div className="flex items-center gap-2">
            {/* PREV */}
            <button
                disabled={page === 1}
                onClick={() => onChange(page - 1)}
                className="p-2 bg-slate-50 border border-slate-100 rounded-xl disabled:opacity-30 transition-all hover:bg-blue-50 hover:text-blue-600 text-slate-500"
            >
                <ChevronLeft size={16}/>
            </button>

            {/* NUMBERS */}
            <div className="flex items-center gap-1">
                {pages.map((p, idx) => (
                    <React.Fragment key={p}>
                        {idx > 0 && pages[idx - 1] !== p - 1 && (
                            <span className="text-slate-300 text-xs">...</span>
                        )}

                        <button
                            onClick={() => onChange(p)}
                            className={`
                                w-8 h-8 rounded-xl text-xs font-black transition-all
                                ${
                                page === p
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                                    : "bg-white text-slate-400 hover:bg-slate-50"
                            }
                            `}
                        >
                            {p}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* NEXT */}
            <button
                disabled={page === lastPage}
                onClick={() => onChange(page + 1)}
                className="p-2 bg-slate-50 border border-slate-100 rounded-xl disabled:opacity-30 transition-all hover:bg-blue-50 hover:text-blue-600 text-slate-500"
            >
                <ChevronRight size={16}/>
            </button>
        </div>
    );
}
