'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Trash2, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatbot } from '@/hooks/useChatbot'
import { ChatMessage } from './ChatMessage'
import { ProviderSelector } from './ProviderSelector'
import { cn } from '@/lib/utils'

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    const {
        messages,
        isLoading,
        error,
        provider,
        setProvider,
        sendMessage,
        clearMessages,
    } = useChatbot()

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    const handleSubmit = useCallback(async () => {
        if (!inputValue.trim() || isLoading) return
        const message = inputValue
        setInputValue('')
        await sendMessage(message)
    }, [inputValue, isLoading, sendMessage])

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <>
            {/* FAB Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <button
                            onClick={() => setIsOpen(true)}
                            className="group flex items-center justify-center h-14 w-14 rounded-full
                                bg-gradient-to-br from-orange-500 to-orange-600 
                                hover:from-orange-600 hover:to-orange-700 
                                shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40
                                transition-all duration-300 ease-out
                                hover:w-auto hover:px-5 hover:gap-3"
                        >
                            {/* Expandable Label - appears on hover */}
                            <span className="max-w-0 overflow-hidden whitespace-nowrap text-white font-semibold text-sm
                                group-hover:max-w-[120px] transition-all duration-300 ease-out opacity-0 group-hover:opacity-100">
                                KallpaBot
                            </span>

                            {/* Icon Container */}
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white">
                                <MessageCircle className="h-6 w-6" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            "fixed z-50 bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
                            isExpanded
                                ? "inset-0 w-full h-full rounded-none"
                                : "bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 w-auto sm:w-[400px] h-[600px] max-h-[80vh] rounded-2xl"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-orange-500/10 to-purple-500/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white text-lg">
                                    🤖
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                        KallpaBot
                                    </h3>
                                    <ProviderSelector
                                        provider={provider}
                                        onProviderChange={setProvider}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-500 hover:text-orange-500"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                >
                                    {isExpanded ? (
                                        <Minimize2 className="h-4 w-4" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-500 hover:text-red-500"
                                    onClick={clearMessages}
                                    disabled={messages.length === 0}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-500"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent"
                        >
                            <div className="py-4">
                                {messages.length === 0 ? (
                                    <div className="px-4 py-12 text-center">
                                        <div className="text-4xl mb-4">👋</div>
                                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                                            ¡Hola! Soy KallpaBot
                                        </h4>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            Tu asistente de nutrición clínica. Pregúntame sobre cálculos nutricionales, antropometría o planificación dietética.
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <ChatMessage key={msg.id} message={msg} />
                                    ))
                                )}

                                {/* Loading indicator */}
                                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="px-4 py-3 flex items-center gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm">
                                            🤖
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Pensando...
                                        </div>
                                    </motion.div>
                                )}

                                {/* Error message */}
                                {error && (
                                    <div className="mx-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                                        {error}
                                    </div>
                                )}

                                {/* Scroll anchor */}
                                <div className="h-1" />
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Escribe tu pregunta..."
                                    rows={1}
                                    className={cn(
                                        'flex-1 resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm',
                                        'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent',
                                        'placeholder:text-zinc-400 dark:placeholder:text-zinc-500'
                                    )}
                                    style={{ maxHeight: '120px' }}
                                />
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!inputValue.trim() || isLoading}
                                    size="icon"
                                    className="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
