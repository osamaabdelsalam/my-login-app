"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
            <div className="w-full max-w-md text-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 backdrop-blur-xl shadow-2xl">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
                    <ShieldAlert size={36} />
                </div>
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    You do not have permission to view this page. Super admin privileges are required.
                </p>
                <div className="mt-6">
                    <Link
                        href="/dashboard"
                        className="inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </main>
    );
}
