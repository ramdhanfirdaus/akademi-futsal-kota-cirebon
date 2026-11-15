import React from "react";
import Pagination from "./Pagination";

interface DataTableFooterProps {
    page: number;
    lastPage: number;
    total: number;
    limit: number;

    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;

    limitOptions?: number[];
    entityName?: string; // siswa, user, transaksi dll
}

export default function DataTableFooter({
    page,
    lastPage,
    total,
    limit,
    onPageChange,
    onLimitChange,
    limitOptions = [10, 25, 50],
    entityName = "data",
}: DataTableFooterProps) {

    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    if (total === 0) return null; // 🔥 senior habit

    return (
        <div
            className="flex flex-col lg:flex-row items-center justify-between gap-6 px-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-md">

            {/* LEFT */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">

                {/* INFO */}
                <div>
                    <p className="text-sm font-bold text-slate-800">
                        Menampilkan{" "}
                        <span className="text-blue-600">
                            {start}-{end}
                        </span>{" "}
                        dari{" "}
                        <span className="text-blue-600">
                            {total}
                        </span>{" "}
                        {entityName}
                    </p>

                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                        Database {entityName}
                    </p>
                </div>

                {/* LIMIT */}
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-slate-400 uppercase px-2">
                        Show
                    </span>

                    {limitOptions.map((size) => (
                        <button
                            key={size}
                            onClick={() => onLimitChange(size)}
                            className={`
                                px-2.5 py-1 rounded-lg text-xs font-black transition-all
                                ${
                                limit === size
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            }
                            `}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* RIGHT */}
            <Pagination
                page={page}
                lastPage={lastPage}
                onChange={onPageChange}
            />
        </div>
    );
}
