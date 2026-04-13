"use client";

/**
 * 🖥️ SubBarContext
 * Single source of truth for the sub-bar (breadcrumb / action bar) in the DesktopLayout.
 * Child pages inject their title and action buttons via the useSubBar() hook.
 * The DesktopLayout reads from this context and renders the sub-bar cleanly.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SubBarState {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

interface SubBarContextValue {
    subBar: SubBarState;
    setSubBar: (state: SubBarState) => void;
}

const SubBarContext = createContext<SubBarContextValue>({
    subBar: { title: "" },
    setSubBar: () => {},
});

export function SubBarProvider({ children }: { children: ReactNode }) {
    const [subBar, setSubBarState] = useState<SubBarState>({ title: "" });

    const setSubBar = useCallback((state: SubBarState) => {
        setSubBarState(state);
    }, []);

    return (
        <SubBarContext.Provider value={{ subBar, setSubBar }}>
            {children}
        </SubBarContext.Provider>
    );
}

export function useSubBar() {
    return useContext(SubBarContext);
}
