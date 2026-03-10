"use client";

import { useEffect, useRef, useState } from 'react';

interface IdleTrackerProps {
    timeoutSeconds: number;
    onIdle: () => void;
    onActive: () => void;
    enabled?: boolean;
}

export default function IdleTracker({
    timeoutSeconds = 60,
    onIdle,
    onActive,
    enabled = true
}: IdleTrackerProps) {
    const [isIdle, setIsIdle] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = () => {
        if (!enabled) return;

        if (isIdle) {
            setIsIdle(false);
            onActive();
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            setIsIdle(true);
            onIdle();
        }, timeoutSeconds * 1000);
    };

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll'];

        // Initial timer start
        resetTimer();

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [enabled, timeoutSeconds, isIdle]);

    return null;
}
