"use client";

import * as Icons from "lucide-react";
import { useTrackDownload } from "@/src/components/AnalyticsTracker";

interface FileDownloadBlockProps {
    fileUrl: string;
    label: string;
    buttonColor?: string;
    buttonShape?: "rounded" | "square" | "pill";
    iconType?: "document" | "catalogue" | "image" | "video";
    resourceId?: string; // The profile user.id for attribution
}

/**
 * 📎 FileDownloadBlock — Client component for tracked file downloads.
 * Fires a FILE_DOWNLOAD analytics event before the browser starts the download.
 */
export function FileDownloadBlock({
    fileUrl,
    label,
    buttonColor = "#059669",
    buttonShape = "rounded",
    iconType = "document",
    resourceId,
}: FileDownloadBlockProps) {
    const trackDownload = useTrackDownload(resourceId);

    const shapeClass =
        buttonShape === "pill"   ? "rounded-full" :
        buttonShape === "square" ? "rounded-none"  :
        "rounded-2xl";

    const Icon =
        iconType === "catalogue" ? Icons.BookOpen   :
        iconType === "image"     ? Icons.Image      :
        iconType === "video"     ? Icons.PlayCircle :
        Icons.Download;

    return (
        <a
            href={fileUrl}
            download
            onClick={() => trackDownload(fileUrl)}
            className={`w-full py-4 px-6 ${shapeClass} font-black text-center transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 text-white`}
            style={{ backgroundColor: buttonColor }}
        >
            <Icon className="w-5 h-5" />
            {label}
        </a>
    );
}
