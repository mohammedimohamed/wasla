"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Mail,
    Gift,
    FileText,
    PartyPopper,
    ArrowRight
} from "lucide-react";

export default function KioskSuccessPage() {
    const router = useRouter();
    const [reward, setReward] = useState<any>(null);

    useEffect(() => {
        const data = localStorage.getItem("last_reward");
        if (data) {
            setReward(JSON.parse(data));
        }

        // Auto-reset after 15 seconds
        const timer = setTimeout(() => {
            router.push("/kiosk");
        }, 15000);

        return () => clearTimeout(timer);
    }, [router]);

    const renderRewardContent = () => {
        if (!reward) {
            return (
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <CheckCircle2 className="w-20 h-20 text-success" />
                    <p className="text-xl font-bold">Merci de votre inscription !</p>
                    <p className="text-sm">Votre profil a été enregistré avec succès.</p>
                </div>
            );
        }

        switch (reward.reward_type) {
            case "catalogue_pdf":
                return (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-blue-100 text-primary rounded-full flex items-center justify-center">
                            <Mail className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900">C'est envoyé !</h2>
                            <p className="text-slate-500 font-medium">
                                Votre catalogue <span className="text-primary font-bold">{reward.title}</span> a été envoyé à votre adresse email.
                            </p>
                        </div>
                    </div>
                );
            case "promo_code":
                return (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                        <PartyPopper className="w-24 h-24 text-orange-500" />
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-slate-900">Code promo exclusif</h2>
                            <div className="bg-slate-900 text-white p-8 rounded-3xl border-4 border-dashed border-white/20 select-all">
                                <span className="text-5xl font-black tracking-widest">{reward.value}</span>
                            </div>
                            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                                Présentez cet écran à l'un de nos commerciaux
                            </p>
                        </div>
                    </div>
                );
            case "guide_technique":
                return (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <FileText className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900">Guide Technique</h2>
                            <p className="text-slate-500 font-medium">
                                Votre {reward.title} est en route vers votre boîte mail.
                            </p>
                        </div>
                    </div>
                );
            case "cadeau_physique":
                return (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                            <Gift className="w-12 h-12" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-slate-900">Félicitations !</h2>
                            <div className="bg-purple-50 p-6 rounded-3xl border-2 border-purple-200">
                                <p className="text-purple-900 font-bold text-lg">{reward.value}</p>
                            </div>
                            <p className="text-purple-500 font-bold uppercase text-xs tracking-widest">
                                Montrez cet écran à notre équipe pour retirer votre cadeau
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center">
            <div className="w-full max-w-lg space-y-12">
                {renderRewardContent()}

                <div className="pt-8">
                    <button
                        onClick={() => router.push("/kiosk")}
                        className="px-12 py-5 bg-slate-100 text-slate-900 rounded-full font-black text-xl active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                    >
                        Terminer
                        <ArrowRight className="w-6 h-6" />
                    </button>
                    <p className="text-slate-400 text-xs mt-6 font-medium">
                        Retour à l'accueil automatique dans quelques secondes...
                    </p>
                </div>
            </div>
        </div>
    );
}
