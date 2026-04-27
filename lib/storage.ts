import path from 'path';
import fs from 'fs';

/**
 * 🛠️ Enterprise Storage Manager
 * Dynamically resolves the correct 'public' directory path based on the execution environment.
 * Prevents 404 errors in production (standalone mode) by ensuring uploads land in the directory
 * actually served by the Next.js server.
 */
export const getPublicUploadDir = (subDir: string = ''): string => {
    const isProd = process.env.NODE_ENV === 'production';
    const root = process.cwd();

    // 1. Resolve the base 'public' directory
    let publicBase = path.join(root, 'public');

    if (isProd) {
        // When running `node .next/standalone/server.js` from the project root,
        // cwd() is the project root and .next/standalone/public exists.
        // When running `node server.js` from inside .next/standalone/,
        // cwd() IS .next/standalone/ and public is directly at cwd()/public.
        const standalonePublic = path.join(root, '.next', 'standalone', 'public');
        const cwdPublic = path.join(root, 'public');

        if (fs.existsSync(standalonePublic)) {
            // Running from project root (e.g. npm run start)
            publicBase = standalonePublic;
        } else if (fs.existsSync(cwdPublic)) {
            // Running from inside standalone dir or Docker
            publicBase = cwdPublic;
        }
        // else keep the default path.join(root, 'public')
    }

    const uploadDir = path.join(publicBase, 'uploads', subDir);

    // 🛡️ Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    return uploadDir;
};

/**
 * Checks if a file exists in the active storage
 */
export const deleteFile = (urlPath: string) => {
    const root = process.cwd();
    
    // Check root public
    const rootPath = path.join(root, 'public', urlPath);
    if (fs.existsSync(rootPath)) {
        fs.unlinkSync(rootPath);
    }

    // Check standalone public if in production
    if (process.env.NODE_ENV === 'production') {
        const prodPath = path.join(root, '.next', 'standalone', 'public', urlPath);
        if (fs.existsSync(prodPath) && prodPath !== rootPath) {
            fs.unlinkSync(prodPath);
        }
    }
};
