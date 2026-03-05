"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
    const [pin, setPin] = useState("");
    const router = useRouter();

    const handleNumberClick = (num: string) => {
        if (pin.length < 6) {
            setPin((prev) => prev + num);
        }
    };

    const handleClear = () => {
        setPin("");
    };

    const handleSubmit = () => {
        if (pin.length !== 6) {
            toast.error("Le PIN manager comporte 6 chiffres");
            return;
        }

        if (pin === (process.env.NEXT_PUBLIC_ADMIN_PIN || "123456")) {
            toast.success("Accès Manager autorisé");
            localStorage.setItem("admin_auth", "true");
            router.push("/admin/dashboard");
        } else {
            toast.error("PIN Manager incorrect");
            setPin("");
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
            <div className="w-full max-w-sm flex flex-col items-center gap-8">
                <button
                    onClick={() => router.push("/login")}
                    className="self-start flex items-center gap-2 text-gray-400 font-bold text-xs uppercase hover:text-gray-600"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </button>

                <div className="text-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <ShieldAlert className="w-10 h-10 text-orange-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Espace Manager</h1>
                    <p className="text-gray-500 mt-2 font-medium">Authentification sécurisée requise</p>
                </div>

                <div className="w-full">
                    <div className="flex justify-center gap-3 mb-8">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-4 w-4 rounded-full border-2 ${pin.length > i ? 'bg-slate-900 border-slate-900 shadow-md' : 'bg-transparent border-gray-300'}`}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num.toString())}
                                className="h-16 rounded-2xl bg-white border border-gray-200 text-2xl font-black text-slate-900 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleClear}
                            className="h-16 rounded-2xl bg-white border border-gray-100 text-gray-400 font-bold flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
                        >
                            C
                        </button>
                        <button
                            onClick={() => handleNumberClick("0")}
                            className="h-16 rounded-2xl bg-white border border-gray-200 text-2xl font-black text-slate-900 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                        >
                            0
                        </button>
                        <button
                            onClick={handleSubmit}
                            className={`h-16 rounded-2xl font-bold flex items-center justify-center active:scale-95 transition-all ${pin.length === 6 ? 'bg-slate-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                        >
                            ENTRER
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
