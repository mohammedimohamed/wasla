"use client";

import { useEffect, useState, useRef } from 'react';

interface Asset {
    id: string;
    type: 'image' | 'video';
    url: string;
    duration: number;
}

interface MediashowOverlayProps {
    assets: Asset[];
    isVisible: boolean;
    onDismiss: () => void;
}

export default function MediashowOverlay({ assets, isVisible, onDismiss }: MediashowOverlayProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Filter out potential non-media just in case
    const validAssets = assets.filter(a => a.type === 'image' || a.type === 'video');

    useEffect(() => {
        if (!isVisible || validAssets.length === 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const currentAsset = validAssets[currentIndex];
        let duration = currentAsset.duration * 1000;

        // If it's a video, the timer should probably handle fallback if video fails to loop or auto-advance
        // but typically images need duration.
        if (currentAsset.type === 'image') {
            timerRef.current = setTimeout(() => {
                next();
            }, duration);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isVisible, currentIndex, assets.length]);

    const next = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % validAssets.length);
            setIsTransitioning(false);
        }, 500); // Wait for fade out
    };

    useEffect(() => {
        if (!isVisible) return;

        const handleInteraction = () => {
            onDismiss();
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleInteraction, { passive: true }));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleInteraction));
        };
    }, [isVisible, onDismiss]);

    if (!isVisible || validAssets.length === 0) return null;

    const currentAsset = validAssets[currentIndex];

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-none overflow-hidden transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            {/* 📺 CRT Scanline Effect (Premium Aesthetic) */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

            <div className={`w-full h-full transition-opacity duration-500 flex items-center justify-center ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                {currentAsset.type === 'video' ? (
                    <video
                        src={currentAsset.url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        onEnded={next}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <img
                        src={currentAsset.url}
                        alt="Mediashow image"
                        className="max-w-full max-h-full object-contain"
                    />
                )}
            </div>

            {/* Overlay hint to tap - very subtle */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-xs font-black uppercase tracking-[0.3em] pointer-events-none animate-pulse">
                Touch to start
            </div>
        </div>
    );
}
