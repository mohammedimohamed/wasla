"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface MediaItem {
    url: string;
    type: 'image' | 'video';
}

interface SlideshowProps {
    items: MediaItem[];
    autoPlayInterval?: number;
    className?: string;
}

export function Slideshow({ items, autoPlayInterval = 5000, className = "" }: SlideshowProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (items.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, autoPlayInterval);

        return () => clearInterval(timer);
    }, [items.length, autoPlayInterval, isPaused]);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];

    return (
        <div className={`relative group overflow-hidden rounded-3xl ${className}`}>
            <div className="aspect-video bg-black flex items-center justify-center">
                {currentItem.url && currentItem.url !== 'null' ? (
                    currentItem.type === 'video' ? (
                        <video 
                            key={currentItem.url}
                            src={currentItem.url}
                            autoPlay
                            muted
                            playsInline
                            loop
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <img 
                            src={currentItem.url} 
                            alt="Slideshow content"
                            className="w-full h-full object-contain"
                        />
                    )
                ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {items.length > 1 && (
                <>
                    {/* Navigation Arrows */}
                    <button 
                        onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Progress Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {items.map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/40'}`}
                            />
                        ))}
                    </div>

                    {/* Pause/Play Toggle */}
                    <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                </>
            )}
        </div>
    );
}
