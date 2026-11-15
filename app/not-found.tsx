'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/login');
        }, 1000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent animate-spin rounded-full"></div></div>
    );
}
