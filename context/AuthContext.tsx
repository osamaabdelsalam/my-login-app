"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types/orders";

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isSuperAdmin: () => boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isSuperAdmin: () => false,
    signOut: async () => {},
    refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    async function fetchProfile(userId: string) {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                console.error("Error fetching profile:", error);
            } else if (data) {
                setProfile(data as UserProfile);
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
        }
    }

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        async function initAuth() {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                await fetchProfile(currentUser.id);
            }

            setLoading(false);
        }

        initAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                await fetchProfile(currentUser.id);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const isSuperAdmin = () => {
        return profile?.role === "super_admin";
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = "/";
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                isSuperAdmin,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
