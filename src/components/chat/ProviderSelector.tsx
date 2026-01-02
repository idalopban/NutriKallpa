'use client'

import { memo } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { AIProvider } from '@/types/chat-types'
import { PROVIDER_CONFIGS } from '@/types/chat-types'

interface ProviderSelectorProps {
    provider: AIProvider
    onProviderChange: (provider: AIProvider) => void
    disabled?: boolean
}

export const ProviderSelector = memo(function ProviderSelector({
    provider,
    onProviderChange,
    disabled = false
}: ProviderSelectorProps) {
    const currentConfig = PROVIDER_CONFIGS[provider]
    const providers = Object.values(PROVIDER_CONFIGS)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                    <span>{currentConfig.icon}</span>
                    <span className="font-medium">{currentConfig.name}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {providers.map((config) => (
                    <DropdownMenuItem
                        key={config.id}
                        onClick={() => onProviderChange(config.id)}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <span className="text-base">{config.icon}</span>
                        <div className="flex-1">
                            <div className="font-medium text-sm">{config.name}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {config.description}
                            </div>
                        </div>
                        {provider === config.id && (
                            <Check className="h-4 w-4 text-orange-500" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
})
