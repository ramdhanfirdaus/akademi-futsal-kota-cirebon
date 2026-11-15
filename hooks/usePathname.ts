'use client';
import { useState, useLayoutEffect } from 'react';

export function usePathname() {
    const [pathname, setPathname] = useState('/');

    useLayoutEffect(() => {
        setPathname(window.location.pathname);

        const handleLocationChange = () => {
            setPathname(window.location.pathname);
        };

        window.addEventListener('popstate', handleLocationChange);

        const originalPushState = window.history.pushState;
        window.history.pushState = function (...args) {
            originalPushState.apply(this, args);
            handleLocationChange();
        };

        const originalReplaceState = window.history.replaceState;
        window.history.replaceState = function (...args) {
            originalReplaceState.apply(this, args);
            handleLocationChange();
        };

        return () => {
            window.removeEventListener('popstate', handleLocationChange);
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
        };
    }, []);

    return pathname;
}
