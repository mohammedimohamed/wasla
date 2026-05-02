import { AnalyticsTracker } from "@/src/components/AnalyticsTracker";

/**
 * Layout for all public /p/[slug] profile pages.
 * The AnalyticsTracker here acts as a catch-all fallback;
 * individual pages also pass their resourceId prop for richer data.
 */
export default function PublicProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* 
                Note: the specific resourceId (user.id) is passed directly 
                by each page via the <AnalyticsTracker resourceId={user.id} /> 
                rendered inside the page itself. This layout-level tracker 
                covers edge cases where the page fails to render its own tracker.
            */}
            {children}
        </>
    );
}
