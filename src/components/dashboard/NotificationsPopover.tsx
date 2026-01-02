"use client";

import { useState, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Calendar, CheckCircle, Info, Check, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/store/useNotificationStore";

export function NotificationsPopover() {
    const router = useRouter();
    const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationStore();
    const unreadCount = notifications.filter(n => !n.read).length;

    // FIX: Prevent Radix Portal from rendering before hydration to avoid DOM errors
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleNotificationClick = (notification: any) => {
        markAsRead(notification.id);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'appointment': return Calendar;
            case 'diet': return CheckCircle;
            case 'warning': return Info;
            case 'error': return Info;
            case 'success': return CheckCircle;
            default: return Bell;
        }
    };

    const getColors = (type: string) => {
        switch (type) {
            case 'appointment': return { text: "text-blue-500", bg: "bg-blue-50" };
            case 'diet': return { text: "text-green-500", bg: "bg-green-50" };
            case 'warning': return { text: "text-orange-500", bg: "bg-orange-50" };
            case 'error': return { text: "text-red-500", bg: "bg-red-50" };
            case 'success': return { text: "text-green-500", bg: "bg-green-50" };
            default: return { text: "text-primary", bg: "bg-primary/10" };
        }
    };

    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `Hace ${minutes} min`;
        return "Hace un momento";
    };

    // Don't render Portal-based component until mounted
    if (!mounted) {
        return (
            <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-[#ff8508] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative outline-none">
                <Bell className="w-5 h-5" />
            </button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-[#ff8508] hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 relative outline-none h-[46px] w-[46px] flex items-center justify-center group hover:scale-105 active:scale-95">
                    <Bell className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                    {unreadCount > 0 && (
                        <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl shadow-xl border-border/50">
                <div className="flex items-center justify-between p-4">
                    <DropdownMenuLabel className="p-0 font-bold text-lg">Notificaciones</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            {unreadCount} nuevas
                        </span>
                    )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    <div className="p-2 space-y-1">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                No tienes notificaciones.
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = getIcon(notification.type);
                                const colors = getColors(notification.type);

                                return (
                                    <DropdownMenuItem
                                        key={notification.id}
                                        className={cn(
                                            "p-3 cursor-pointer rounded-xl focus:bg-muted/50 items-start gap-3 transition-all",
                                            !notification.read ? "bg-muted/30" : "opacity-70"
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={`p-2 rounded-full ${colors.bg} ${colors.text} mt-1 relative`}>
                                            <Icon className="w-4 h-4" />
                                            {!notification.read && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <p className={cn("text-sm font-medium leading-none", !notification.read && "text-foreground font-bold")}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                    {formatTime(notification.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.description}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 -mr-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeNotification(notification.id);
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </DropdownMenuItem>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
                <DropdownMenuSeparator />
                <div className="p-2 grid grid-cols-2 gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 justify-center h-8"
                        onClick={(e) => {
                            e.preventDefault();
                            clearAll();
                        }}
                        disabled={notifications.length === 0}
                    >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Borrar todas
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs font-medium text-primary hover:text-primary/80 justify-center h-8"
                        onClick={(e) => {
                            e.preventDefault();
                            markAllAsRead();
                        }}
                        disabled={unreadCount === 0}
                    >
                        <Check className="w-3 h-3 mr-2" />
                        Marcar leídas
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
