"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { userDb, auditTrail } from "@/lib/db";
import { getPublicUploadDir } from "@/lib/storage";
import fs from "fs/promises";
import path from "path";
import * as z from "zod";

const editUserSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2, "Nom obligatoire"),
    email: z.string().email("Email invalide"),
    role: z.enum(['ADMINISTRATOR', 'TEAM_LEADER', 'SALES_AGENT']),
    team_id: z.string().optional().nullable(),
    active: z.preprocess((val) => Number(val), z.number()),
    password: z.string().min(6, "Mot de passe min. 6 caractères").optional().or(z.literal("")),
    resetPin: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    phone_number: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    linkedin_url: z.string().optional().nullable().or(z.literal("")),
});

/**
 * 🛠️ Update User Server Action
 */
export async function updateUserAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== 'ADMINISTRATOR') {
        return { error: "Accès non autorisé" };
    }

    const rawData = Object.fromEntries(formData.entries());
    const result = editUserSchema.safeParse(rawData);

    if (!result.success) {
        return { error: "Validation échouée", details: result.error.flatten().fieldErrors };
    }

    const { id, name, email, role, team_id, active, password, resetPin, phone_number, job_title, company_name, linkedin_url } = result.data;

    // 🛡️ Self-downgrade protection
    if (id === session.userId && role !== 'ADMINISTRATOR') {
        return { error: "Vous ne pouvez pas rétrograder votre propre rôle." };
    }

    try {
        const existingUser = userDb.findById(id);
        if (!existingUser) return { error: "Utilisateur non trouvé" };

        // 🖼️ Handle Profile Photo
        const photo = formData.get("photo") as File | null;
        let image_url = existingUser.image_url;

        if (photo && photo.size > 0) {
            const buffer = Buffer.from(await photo.arrayBuffer());
            const ext = path.extname(photo.name) || ".jpg";
            const filename = `profile_${id}${ext}`;
            const uploadDir = getPublicUploadDir("profiles");
            await fs.mkdir(uploadDir, { recursive: true });
            await fs.writeFile(path.join(uploadDir, filename), buffer);
            image_url = `/uploads/profiles/${filename}`;
        }

        // 🔄 Atomic Update
        userDb.update(id, {
            name,
            email,
            role,
            team_id,
            active,
            image_url,
            phone_number,
            job_title,
            company_name,
            linkedin_url: linkedin_url === "" ? null : linkedin_url,
        }, session.userId);

        // 🔑 Credentials Overrides
        if (password && password.trim().length >= 6) {
            userDb.resetUserCredentials(session.userId, id, { password });
        }

        if (resetPin) {
            userDb.resetUserCredentials(session.userId, id, { quick_pin: null });
        }

        revalidatePath("/admin/users");
        return { success: true };

    } catch (error: any) {
        console.error("[updateUserAction] Error:", error);
        return { error: "Erreur lors de la mise à jour : " + error.message };
    }
}

/**
 * 🔐 Reset User Password Action
 * Generates a temporary code and forces reset on next login.
 */
export async function resetUserPasswordAction(userId: string) {
    const session = await getSession();
    if (!session || session.role !== 'ADMINISTRATOR') {
        return { error: "Accès non autorisé" };
    }

    try {
        const existingUser = userDb.findById(userId);
        if (!existingUser) return { error: "Utilisateur non trouvé" };

        // 🎲 Generate secure 8-character alphanumeric code (e.g., W7-X2-R9)
        // We'll use 6 random hex chars + formatting for similar vibe
        const { randomBytes } = await import("crypto");
        const raw = randomBytes(4).toString('hex').toUpperCase(); 
        const tempCode = `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

        // 💾 Hash and save temporary password, set force flag
        userDb.resetUserCredentials(session.userId, userId, {
            password: tempCode,
            force_password_reset: 1
        });

        revalidatePath("/admin/users");
        
        return { 
            success: true, 
            tempCode: tempCode 
        };

    } catch (error: any) {
        console.error("[resetUserPasswordAction] Error:", error);
        return { error: "Erreur lors de la réinitialisation : " + error.message };
    }
}
