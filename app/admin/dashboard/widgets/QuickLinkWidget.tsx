import { useRouter } from "next/navigation";
import { Link2, QrCode, LayoutGrid, Users, ShieldCheck, Gift, LayoutTemplate, Monitor, HardDrive, Brain, Cloud, BadgeCheck } from "lucide-react";

export const QUICKLINK_ICONS = {
    Link2: Link2,
    QrCode: QrCode,
    LayoutGrid: LayoutGrid,
    Users: Users,
    ShieldCheck: ShieldCheck,
    Gift: Gift,
    LayoutTemplate: LayoutTemplate,
    Monitor: Monitor,
    HardDrive: HardDrive,
    Brain: Brain,
    Cloud: Cloud,
    BadgeCheck: BadgeCheck
};

export default function QuickLinkWidget({ config }: { config: any }) {
    const router = useRouter();
    const Icon = (QUICKLINK_ICONS as any)[config.icon || 'Link2'] || Link2;
    const color = config.color || 'slate';

    const colorClasses = {
        slate: 'bg-white text-slate-800 border-slate-100 hover:border-slate-300',
        blue: 'bg-blue-50/50 text-blue-900 border-blue-100 hover:border-blue-300',
        indigo: 'bg-indigo-50/50 text-indigo-900 border-indigo-100 hover:border-indigo-300',
        amber: 'bg-amber-50/50 text-amber-900 border-amber-100 hover:border-amber-300',
        emerald: 'bg-emerald-50/50 text-emerald-900 border-emerald-100 hover:border-emerald-300',
        rose: 'bg-rose-50/50 text-rose-900 border-rose-100 hover:border-rose-300',
        violet: 'bg-violet-50/50 text-violet-900 border-violet-100 hover:border-violet-300',
        dark: 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 hover:border-slate-700'
    };

    const iconClasses = {
        slate: 'bg-slate-100 text-slate-600',
        blue: 'bg-blue-100 text-blue-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        amber: 'bg-amber-100 text-amber-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        rose: 'bg-rose-100 text-rose-600',
        violet: 'bg-violet-100 text-violet-600',
        dark: 'bg-white/10 text-white',
    };

    const handleClick = () => {
        if (!config.url) return;
        if (config.url.startsWith('http')) {
            window.open(config.url, '_blank');
        } else {
            router.push(config.url);
        }
    };

    const wrapperClass = (colorClasses as any)[color] || colorClasses.slate;
    const iconWrapperClass = (iconClasses as any)[color] || iconClasses.slate;

    return (
        <button
            onClick={handleClick}
            className={`w-full h-full p-6 rounded-[32px] border hover:shadow-xl transition-all text-left flex flex-col gap-4 group ${wrapperClass}`}
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${iconWrapperClass}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="font-black uppercase tracking-tight text-xs">{config.title || 'Lien Rapide'}</p>
                {config.description && (
                    <p className={`text-[10px] font-medium mt-1 truncate ${color === 'dark' ? 'text-slate-400' : 'text-slate-500 opacity-80'}`}>
                        {config.description}
                    </p>
                )}
            </div>
        </button>
    );
}
