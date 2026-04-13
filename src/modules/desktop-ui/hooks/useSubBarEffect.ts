"use client";

/**
 * 🪝 useSubBarEffect
 * Hook for child page components to declaratively inject their title + actions
 * into the DesktopLayout sub-bar. Uses a useEffect to push state on mount.
 *
 * Usage:
 *   useSubBarEffect({ title: "Leads List", subtitle: "5 results", actions: <Button /> })
 */

import { useEffect, ReactNode } from "react";
import { useSubBar } from "../context/SubBarContext";

interface SubBarOptions {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

export function useSubBarEffect(options: SubBarOptions) {
    const { setSubBar } = useSubBar();

    useEffect(() => {
        setSubBar(options);
        // Clean up on unmount
        return () => setSubBar({ title: "" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.title, options.subtitle]);
}
