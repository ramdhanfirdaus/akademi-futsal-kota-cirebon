'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import './globals.css';
import { Inter } from 'next/font/google';
import { NotificationProvider } from "@/components/NotificationSystem.tsx";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="id">
            <body className={`${inter.variable} font-sans bg-slate-50 text-slate-900`}>
                <NotificationProvider>
                    <Provider store={store}>
                        {children}
                    </Provider>
                </NotificationProvider>
            </body>
        </html>
    );
}
