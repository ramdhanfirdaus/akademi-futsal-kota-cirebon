import React from 'react';
import { CONTRIBUTED_NAME } from "@/constants.tsx";

const Students: React.FC = () => {
    return (
        <div
            className="flex flex-col md:flex-row mt-6 justify-between items-center gap-4 text-slate-400 text-sm font-medium px-4">
            <p>© 2026 Akademi Futsal Kota Cirebon • {CONTRIBUTED_NAME}</p>
        </div>
    );
};

export default Students;
