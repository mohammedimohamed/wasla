"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { userDb, auditTrail } from "@/lib/db";
import * as z from "zod";

const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");

/**
 * 🔐 Finalize Password Reset
 * Called by the agent when they are forced to change their password.
 */
export async function finalizePasswordResetAction(newPassword: string) {
    const session = await getSession();
    if (!session) {
        return { error: "Session non trouvée" };
    }

    try {
        const result = passwordSchema.safeParse(newPassword);
        if (!result.success) {
            return { error: result.error.errors[0].message };
        }

        // 💾 Update password and clear force flag
        userDb.resetUserCredentials(session.userId, session.userId, {
            password: newPassword,
            force_password_reset: 0
        });

        // 📑 Log activity
        auditTrail.logAction(session.userId, 'UPDATE', 'USER', session.userId, `User finalized their forced password reset.`);

        revalidatePath("/");
        return { success: true };

    } catch (error: any) {
        console.error("[finalizePasswordResetAction] Error:", error);
        return { error: "Erreur lors de la mise à jour du mot de passe." };
    }
}
