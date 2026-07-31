"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireSuperAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireSuperAdmin = false,
}) => {
    const { user, profile, loading, isSuperAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/");
            } else if (requireSuperAdmin && !isSuperAdmin()) {
                router.push("/unauthorized");
            }
        }
    }, [user, profile, loading, requireSuperAdmin, router, isSuperAdmin]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
                    <span className="text-sm text-zinc-400">Loading system data...</span>
                </div>
            </div>
        );
    }

    if (!user || (requireSuperAdmin && !isSuperAdmin())) {
        return null;
    }

    return <>{children}</>;
};
