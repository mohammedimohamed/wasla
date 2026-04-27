"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SecureAccountModal } from "./SecureAccountModal";

/**
 * 🛡️ SessionGuard
 * Enforces account status checks and forced password resets across the Agent Portal.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mustResetPassword, setMustResetPassword] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    // Only apply guard to non-admin, non-public routes
    const isAgentRoute = pathname.startsWith('/dashboard') || 
                         pathname.startsWith('/leads') || 
                         pathname.startsWith('/sync');

    const checkSession = async () => {
        if (!isAgentRoute || isChecking) return;
        
        try {
            setIsChecking(true);
            const res = await fetch('/api/auth');
            
            // Handle offline - rely on last known state
            if (!navigator.onLine) {
                const cachedForce = localStorage.getItem("force_password_reset") === "true";
                if (cachedForce) setMustResetPassword(true);
                return;
            }

            if (!res.ok) {
                // Account might be deactivated or session expired
                await fetch('/api/auth', { method: 'DELETE' });
                localStorage.removeItem("sales_name");
                localStorage.removeItem("sales_agent_id");
                window.location.href = '/login';
                return;
            }

            const data = await res.json();
            
            // 🛑 Force Password Reset Check
            if (data.user.forcePasswordReset) {
                setMustResetPassword(true);
                localStorage.setItem("force_password_reset", "true");
            } else {
                setMustResetPassword(false);
                localStorage.removeItem("force_password_reset");
            }

        } catch (error) {
            console.error("[SessionGuard] Check failed:", error);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, [pathname]);

    return (
        <>
            <SecureAccountModal 
                isOpen={mustResetPassword} 
                onSuccess={() => {
                    setMustResetPassword(false);
                    localStorage.removeItem("force_password_reset");
                    checkSession(); // Refresh state
                }} 
            />
            {children}
        </>
    );
}
