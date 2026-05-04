'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { X, Info, AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalToasterProps {
    block: any;
    isDark: boolean;
}

export function GlobalToaster({ block, isDark }: GlobalToasterProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isDismissed) setIsVisible(true);
        }, 800);
        return () => clearTimeout(timer);
    }, [isDismissed]);

    const styleMap = {
        info: {
            bg: isDark ? 'bg-indigo-600/90' : 'bg-indigo-500/90',
            text: 'text-white',
            icon: Info,
            border: 'border-white/20'
        },
        warning: {
            bg: isDark ? 'bg-amber-600/90' : 'bg-amber-500/90',
            text: 'text-white',
            icon: AlertTriangle,
            border: 'border-white/20'
        },
        urgent: {
            bg: isDark ? 'bg-red-600/90' : 'bg-red-500/90',
            text: 'text-white',
            icon: Zap,
            border: 'border-white/20'
        },
        event: {
            bg: isDark ? 'bg-slate-900/40' : 'bg-white/40',
            text: isDark ? 'text-white' : 'text-slate-900',
            icon: Icons.Star,
            border: 'border-amber-500/30',
            glass: true
        }
    };

    const config = styleMap[block.style as keyof typeof styleMap] || styleMap.info;
    const Icon = config.icon;
    const CustomIcon = block.icon ? (Icons as any)[block.icon] : null;

    const positionClass = block.position === 'top' 
        ? 'top-6 left-4 right-4' 
        : 'bottom-24 left-4 right-4';

    const animationVariants = {
        hidden: { 
            y: block.position === 'top' ? -100 : 100, 
            opacity: 0,
            scale: 0.9
        },
        visible: { 
            y: 0, 
            opacity: 1, 
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 260,
                damping: 20
            }
        },
        exit: { 
            y: block.position === 'top' ? -50 : 50, 
            opacity: 0, 
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    return (
        <AnimatePresence>
            {isVisible && !isDismissed && (
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={animationVariants}
                    className={`fixed ${positionClass} z-[100]`}
                >
                    <div className={`relative w-full max-w-md mx-auto p-4 rounded-[32px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] flex items-center gap-4 border ${config.border} backdrop-blur-xl ${config.bg} ${config.text} ${block.style === 'event' ? 'overflow-hidden' : ''}`}>
                        
                        {/* Event Theme Shine Effect */}
                        {block.style === 'event' && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-white/10 pointer-events-none" />
                        )}

                        {/* Media Avatar / Icon */}
                        <div className="shrink-0">
                            {block.image_url ? (
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/20 shadow-inner">
                                    <img src={block.image_url} alt="Toaster Media" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className={`w-12 h-12 ${block.style === 'event' ? 'bg-amber-500 text-white' : 'bg-white/20'} rounded-2xl flex items-center justify-center shadow-lg`}>
                                    {CustomIcon ? <CustomIcon className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 ${block.style === 'event' ? 'text-amber-500' : 'opacity-70'}`}>
                                {block.style === 'event' ? '🏆 Batimatec 2024' : 'Annonce Corporate'}
                            </p>
                            <p className="text-sm font-bold leading-tight line-clamp-2">{block.message}</p>
                        </div>

                        <button 
                            onClick={() => setIsVisible(false)}
                            className={`p-2 rounded-xl transition-all hover:scale-110 ${block.style === 'event' ? 'bg-slate-500/10 hover:bg-slate-500/20' : 'hover:bg-white/20'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Visual Progress/Micro-animation */}
                        <div className={`absolute -bottom-1 left-6 right-6 h-1 rounded-full overflow-hidden ${block.style === 'event' ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                            <motion.div 
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full ${block.style === 'event' ? 'bg-amber-500' : 'bg-white/40'}`} 
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
