"use client";

import { useState } from "react";
import { Shield, Lock, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { finalizePasswordResetAction } from "@/app/actions/auth";
import toast from "react-hot-toast";

interface SecureAccountModalProps {
    isOpen: boolean;
    onSuccess: () => void;
}

export function SecureAccountModal({ isOpen, onSuccess }: SecureAccountModalProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await finalizePasswordResetAction(password);
            if (res.error) throw new Error(res.error);
            
            toast.success("Compte sécurisé avec succès !");
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md shadow-2xl p-10 text-center relative overflow-hidden border border-slate-100 dark:border-white/5 transition-colors duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[30px] flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <Shield className="w-10 h-10" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none mb-3">Sécurisez votre compte</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-10 px-4">
                    Votre administrateur a réinitialisé votre accès. <br/>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Définissez un nouveau mot de passe</span> pour continuer.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-left space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-2">Nouveau Mot de Passe</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-5 py-4 rounded-2xl text-sm font-black focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all tracking-widest text-slate-900 dark:text-white"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-2">Confirmer le Mot de Passe</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-700" />
                                <input 
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 pl-14 pr-5 py-4 rounded-2xl text-sm font-black focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all tracking-widest text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white rounded-[24px] py-5 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Sécurisation...</>
                            ) : (
                                <><CheckCircle2 className="w-5 h-5" /> Activer mon compte</>
                            )}
                        </button>
                    </div>
                </form>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-8 tracking-widest flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3" /> Chiffrement AES-256-GCM Actif
                </p>
            </div>
        </div>
    );
}
