"use client"

import * as React from "react"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    const toggleTheme = () => {
        if (theme === 'light') {
            setTheme('dark')
        } else if (theme === 'dark') {
            setTheme('system')
        } else {
            setTheme('light')
        }
    }

    if (!mounted) {
        return (
            <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 h-[46px] w-[46px] flex items-center justify-center opacity-50 cursor-wait">
                <Sun className="h-5 w-5" />
            </button>
        )
    }

    return (
        <button
            onClick={toggleTheme}
            className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 relative outline-none h-[46px] w-[46px] flex items-center justify-center cursor-pointer group hover:scale-105 active:scale-95"
            title={`Tema actual: ${theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}`}
        >
            {/* Sun Icon (Light) */}
            <Sun
                className={`absolute h-5 w-5 transition-all duration-500 ease-in-out group-hover:rotate-45
                    ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}
                `}
            />

            {/* Moon Icon (Dark) */}
            <Moon
                className={`absolute h-5 w-5 transition-all duration-500 ease-in-out group-hover:rotate-12
                    ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}
                `}
            />

            {/* Laptop Icon (System) */}
            <Laptop
                className={`absolute h-5 w-5 transition-all duration-500 ease-in-out
                    ${theme === 'system' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
                `}
            />

            <span className="sr-only">Alternar tema</span>
        </button>
    )
}
