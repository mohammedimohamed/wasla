import * as z from 'zod';

export const digitalProfileConfigSchema = z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    avatar_url: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    blocks: z.array(z.discriminatedUnion('type', [
        z.object({
            id: z.string(),
            type: z.literal('social_grid'),
            items: z.array(z.object({
                platform: z.string(),
                url: z.string().url(),
                icon: z.string()
            }))
        }),
        z.object({
            id: z.string(),
            type: z.literal('action_button'),
            action: z.enum(['call', 'save_vcard', 'email', 'link']),
            label: z.string(),
            value: z.string().optional()
        }),
        z.object({
            id: z.string(),
            type: z.literal('free_text'),
            content: z.string()
        })
    ])).default([])
});

export type DigitalProfileConfig = z.infer<typeof digitalProfileConfigSchema>;

export const userDigitalProfileSchema = z.object({
    profile_slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    profile_is_active: z.boolean().default(false),
    profile_config: digitalProfileConfigSchema
});
