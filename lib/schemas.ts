import * as z from 'zod';

export const digitalProfileConfigSchema = z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    avatar_url: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    blocks: z.array(z.discriminatedUnion('type', [
        z.object({
            id: z.string(),
            type: z.literal('social_grid'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            items: z.array(z.object({
                label: z.string().min(1),
                url: z.string().url(),
                icon: z.string()
            }))
        }),
        z.object({
            id: z.string(),
            type: z.literal('action_button'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            action: z.enum(['call', 'save_vcard', 'email', 'link']),
            label: z.string(),
            value: z.string().optional()
        }),
        z.object({
            id: z.string(),
            type: z.literal('free_text'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            content: z.string()
        }),
        z.object({
            id: z.string(),
            type: z.literal('rich_text'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            content: z.string()
        }),
        z.object({
            id: z.string(),
            type: z.literal('file'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            fileUrl: z.string(),
            label: z.string(),
            buttonColor: z.string().optional(),
            buttonShape: z.enum(['rounded', 'square', 'pill']).optional(),
            iconType: z.enum(['document', 'catalogue', 'image', 'video']).optional(),
        }),
        z.object({
            id: z.string(),
            type: z.literal('media'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            items: z.array(z.object({
                url: z.string(),
                type: z.enum(['image', 'video']),
            })),
        }),
        z.object({
            id: z.string(),
            type: z.literal('separator'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            style: z.enum(['solid', 'dotted', 'spacer']),
        }),
        z.object({
            id: z.string(),
            type: z.literal('localization'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            provider: z.enum(['google_maps', 'openstreetmap', 'bing_maps']),
            display_type: z.enum(['map', 'button']),
            location_data: z.string(),
            button_label: z.string().optional(),
            show_navigation_button: z.boolean().optional().default(false),
        }),
        z.object({
            id: z.string(),
            type: z.literal('multiple_locations'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            title: z.string().optional(),
            layout: z.enum(['tabs', 'list']),
            provider: z.enum(['google_maps', 'openstreetmap', 'bing_maps']),
            items: z.array(z.object({
                id: z.string(),
                label: z.string(),
                location_data: z.string(),
                city: z.string().optional(),
                provider_override: z.enum(['google_maps', 'openstreetmap', 'bing_maps']).optional(),
            })).default([]),
        }),
        z.object({
            id: z.string(),
            type: z.literal('announcement_toaster'),
            isVisible: z.boolean().optional().default(true),
            visibleUntil: z.string().datetime().optional().nullable(),
            isGlobal: z.boolean().optional().default(false),
            message: z.string(),
            icon: z.string().optional(),
            image_url: z.string().optional().nullable(),
            position: z.enum(['top', 'bottom']).default('bottom'),
            style: z.enum(['info', 'warning', 'urgent', 'event']).default('info'),
        }),
    ])).default([])
});

export type DigitalProfileConfig = z.infer<typeof digitalProfileConfigSchema>;

export const userDigitalProfileSchema = z.object({
    profile_slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    profile_is_active: z.boolean().default(false),
    profile_config: digitalProfileConfigSchema
});
