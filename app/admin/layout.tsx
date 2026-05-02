import { getSession } from "@/lib/auth";
import { settingsDb, userDb } from "@/lib/db";
import Sidebar from "@/src/components/admin/Sidebar";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    
    // Check if we are on the login page by inspecting the headers
    const headerList = headers();
    const pathname = headerList.get("x-invoke-path") || ""; 
    const isLoginPage = pathname === "/admin/login";
    
    if (!session) {
        return <>{children}</>;
    }

    const userEntry = userDb.findById(session.userId);
    const settings = settingsDb.get();

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Left Sidebar - Hidden on mobile and login page, fixed on desktop */}
            {!isLoginPage && (
                <Sidebar 
                    user={{ 
                        name: userEntry?.name || "Admin", 
                        role: session.role 
                    }} 
                    settings={settings} 
                />
            )}
            
            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 ${!isLoginPage ? 'lg:pl-64' : ''}`}>
                {!isLoginPage && <div className="lg:hidden h-16 w-full shrink-0" />}
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
