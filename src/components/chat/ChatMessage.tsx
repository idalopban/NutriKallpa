'use client'

import { memo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/chat-types'
import { PROVIDER_CONFIGS } from '@/types/chat-types'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
    message: ChatMessageType
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user'
    const providerConfig = message.provider ? PROVIDER_CONFIGS[message.provider] : null
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(message.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }, [message.content])

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'group flex gap-3 px-4 py-3',
                isUser ? 'flex-row-reverse' : 'flex-row'
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    isUser
                        ? 'bg-orange-500 text-white'
                        : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                )}
            >
                {isUser ? '👤' : '🤖'}
            </div>

            {/* Message Content */}
            <div className="relative max-w-[85%]">
                <div
                    className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm',
                        isUser
                            ? 'bg-orange-500 text-white rounded-tr-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'
                    )}
                >
                    {isUser ? (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden 
                            prose-table:text-xs prose-table:block prose-table:overflow-x-auto
                            prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1 prose-th:bg-zinc-200 dark:prose-th:bg-zinc-700
                            prose-pre:overflow-x-auto prose-pre:max-w-full
                            [&>*]:max-w-full [&_table]:w-max [&_table]:min-w-0
                            [&_table]:border-collapse [&_td]:border [&_td]:border-zinc-300 dark:[&_td]:border-zinc-600
                            [&_th]:border [&_th]:border-zinc-300 dark:[&_th]:border-zinc-600
                            select-text">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content || '...'}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Provider badge for assistant */}
                    {!isUser && providerConfig && (
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <span>{providerConfig.icon}</span>
                                <span>{providerConfig.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Copy button - only for assistant messages */}
                {!isUser && message.content && (
                    <button
                        onClick={handleCopy}
                        className={cn(
                            'absolute -bottom-1 right-2 p-1.5 rounded-lg text-xs',
                            'bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600',
                            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                            'hover:bg-zinc-100 dark:hover:bg-zinc-600',
                            'shadow-sm flex items-center gap-1',
                            copied && 'text-green-600 dark:text-green-400'
                        )}
                        title="Copiar respuesta"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3 w-3" />
                                <span>Copiado</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3 w-3" />
                                <span>Copiar</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    )
})
