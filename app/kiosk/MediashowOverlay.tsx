"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from '@/src/context/LanguageContext';
import { X, Maximize, Minimize } from 'lucide-react';

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
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const controlTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Filter out potential non-media just in case
    const validAssets = assets.filter(a => a.type === 'image' || a.type === 'video');

    useEffect(() => {
        if (isVisible) {
            // 🛡️ Kill scrollbars globally
            document.body.style.overflow = 'hidden';
            
            // 📺 Trigger Fullscreen via Web API
            if (containerRef.current && !document.fullscreenElement) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.warn(`[Mediashow] Fullscreen request blocked: ${err.message}`);
                });
            }
        } else {
            document.body.style.overflow = '';
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        }

        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('fullscreenchange', handleFsChange);
        };
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible || validAssets.length === 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const currentAsset = validAssets[currentIndex];
        let duration = (currentAsset.duration || 10) * 1000;

        if (currentAsset.type === 'image') {
            timerRef.current = setTimeout(() => {
                next();
            }, duration);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isVisible, currentIndex, assets]);

    const next = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % validAssets.length);
            setIsTransitioning(false);
        }, 500); // Wait for fade out
    };

    // 🕵️ Mouse Inactivity Tracker (3s)
    useEffect(() => {
        if (!isVisible) return;

        const handleActivity = () => {
            setShowControls(true);
            if (controlTimerRef.current) clearTimeout(controlTimerRef.current);
            controlTimerRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
        handleActivity(); // Init timer

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (controlTimerRef.current) clearTimeout(controlTimerRef.current);
        };
    }, [isVisible]);

    // Handle ESC key to dismiss even if not in native FS
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDismiss();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onDismiss]);

    if (!isVisible || validAssets.length === 0) return null;

    const currentAsset = validAssets[currentIndex];

    return (
        <div
            ref={containerRef}
            className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${!showControls ? 'cursor-none' : 'cursor-default'}`}
        >
            {/* 📺 Dark gradient for controls readability */}
            <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-40 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

            {/* 🛑 Exit Control */}
            <div className={`absolute top-8 right-8 z-50 transition-all duration-500 transform ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    className="group bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/20 transition-all active:scale-95 flex items-center gap-3 shadow-2xl"
                >
                    <span className="text-white font-black text-xs uppercase tracking-widest pl-2 hidden group-hover:inline shadow-sm">Quitter le salon</span>
                    <X className="w-6 h-6 text-white" />
                </button>
            </div>

            {/* 📺 CRT Scanline Effect (Premium Aesthetic) */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

            <div className={`w-full h-full transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                {currentAsset.type === 'video' ? (
                    <video
                        key={currentAsset.url}
                        src={currentAsset.url}
                        autoPlay
                        muted
                        playsInline
                        onEnded={next}
                        className="w-full h-full object-contain bg-black"
                    />
                ) : (
                    <img
                        src={currentAsset.url}
                        alt="Mediashow image"
                        className="w-full h-full object-contain bg-black"
                    />
                )}
            </div>

            {/* Bottom Info & Touch Hint */}
            <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex flex-col items-center gap-3">
                    <p className="text-white font-black text-base tracking-tight drop-shadow-lg">
                        {currentIndex + 1} / {validAssets.length}
                    </p>
                    <div className="text-white/50 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse drop-shadow-md">
                        {t('kiosk.touchToStart')}
                    </div>
                </div>
            </div>
        </div>
    );
}
