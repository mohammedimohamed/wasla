"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, User } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
    const [pin, setPin] = useState("");
    const [name, setName] = useState("");
    const router = useRouter();

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin((prev) => prev + num);
        }
    };

    const handleClear = () => {
        setPin("");
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!name.trim()) {
            toast.error("Veuillez entrer votre prénom");
            return;
        }

        if (pin.length !== 4) {
            toast.error("Le PIN doit comporter 4 chiffres");
            return;
        }

        // In a real app, this would be an API call
        if (pin === (process.env.NEXT_PUBLIC_APP_PIN || "1234")) {
            toast.success(`Bienvenue, ${name}`);
            // Store in session storage or cookie
            localStorage.setItem("sales_name", name);
            router.push("/dashboard");
        } else {
            toast.error("PIN incorrect");
            setPin("");
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
            <div className="w-full max-w-sm flex flex-col items-center gap-8">
                <div className="text-center">
                    <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <span className="text-3xl font-bold">W</span>
                    </div>
                    <h1 className="text-2xl font-bold">Wasla Lead Collector</h1>
                    <p className="text-slate-400 mt-2">Batimatec 2026</p>
                </div>

                <div className="w-full space-y-4">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Votre prénom"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-800 border-none rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <div className="w-full bg-slate-800 border-none rounded-xl py-4 pl-12 pr-4 flex gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-3 w-3 rounded-full ${pin.length > i ? 'bg-primary shadow-[0_0_8px_rgba(30,64,175,0.8)]' : 'bg-slate-700'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            className="h-16 rounded-xl bg-slate-800 text-2xl font-semibold hover:bg-slate-700 active:bg-primary active:scale-95 transition-all"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleClear}
                        className="h-16 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        Effacer
                    </button>
                    <button
                        onClick={() => handleNumberClick("0")}
                        className="h-16 rounded-xl bg-slate-800 text-2xl font-semibold hover:bg-slate-700 active:bg-primary active:scale-95 transition-all"
                    >
                        0
                    </button>
                    <button
                        onClick={() => handleSubmit()}
                        className={`h-16 rounded-xl text-xl font-bold flex items-center justify-center active:scale-95 transition-all ${pin.length === 4 ? 'bg-primary' : 'bg-slate-800 text-slate-600'}`}
                    >
                        OK
                    </button>
                </div>

                <button
                    onClick={() => router.push("/admin/login")}
                    className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
                >
                    Accès Manager
                </button>
            </div>
        </div>
    );
}
