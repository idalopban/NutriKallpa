import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabConfig {
    id: string;
    label: React.ReactNode;
    icon: LucideIcon;
}

interface AnthropometryTabsProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (id: string) => void;
    onSave?: () => void;
    isSaving?: boolean;
    className?: string;
}

export function AnthropometryTabs({
    tabs,
    activeTab,
    onTabChange,
    onSave,
    isSaving = false,
    className
}: AnthropometryTabsProps) {
    return (
        <div className={cn(
            "flex flex-row items-center gap-2 sm:gap-4 justify-between bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800",
            className
        )}>
            <nav className="flex-1 flex gap-1 overflow-x-auto no-scrollbar mask-linear-fade">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                                isActive
                                    ? 'bg-[#ff8508] text-white shadow-lg shadow-[#ff8508]/30'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            {onSave && (
                <div className="shrink-0">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 p-2 sm:px-6 sm:py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Guardar Evaluación"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4"
                            >
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">
                            {isSaving ? 'Guardando...' : 'Guardar Evaluación'}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
