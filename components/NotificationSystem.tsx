import React, {createContext, useContext, useState, useCallback, useEffect} from 'react';
import { Notification, NotificationType, NotificationContextType, OcallNotificationParams } from '../types';
import { DEFAULT_TITLES } from '../constants';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

const Icon = ({type}: { type: NotificationType }) => {
    switch (type) {
        case 'success':
            return (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            );
        case 'error':
            return (
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            );
        case 'warning':
            return (
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
            );
        case 'info':
            return (
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            );
    }
};

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({
                                                                                                        notification,
                                                                                                        onRemove
                                                                                                    }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(notification.id);
        }, notification.duration || 5000);
        return () => clearTimeout(timer);
    }, [notification, onRemove]);

    return (
        <div
            className="flex items-start w-80 max-w-sm bg-white border border-gray-100 rounded-xl shadow-lg p-4 mb-3 transition-all duration-300 animate-slide-in pointer-events-auto">
            <div className="flex-shrink-0">
                <Icon type={notification.type}/>
            </div>
            <div className="ml-3 w-full">
                <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-gray-900 leading-none mb-1">
                        {DEFAULT_TITLES[notification.type]}
                    </p>
                    <button
                        onClick={() => onRemove(notification.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <p className="text-sm text-gray-500 leading-snug">
                    {notification.message}
                </p>
            </div>
        </div>
    );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback(({type, message, duration = 5000}: OcallNotificationParams) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, {id, type, message, duration}]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{notifications, showNotification, removeNotification}}>
            {children}
            {/* Portal-like container for notifications */}
            <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none space-y-2">
                {notifications.map((n) => (
                    <NotificationItem key={n.id} notification={n} onRemove={removeNotification}/>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
