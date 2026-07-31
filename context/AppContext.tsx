"use client";

import React, { createContext, useContext, useState } from "react";

interface AppContextType {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    refreshKey: number;
    triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType>({
    activeTab: "overview",
    setActiveTab: () => {},
    refreshKey: 0,
    triggerRefresh: () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [refreshKey, setRefreshKey] = useState<number>(0);

    const triggerRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <AppContext.Provider
            value={{
                activeTab,
                setActiveTab,
                refreshKey,
                triggerRefresh,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
