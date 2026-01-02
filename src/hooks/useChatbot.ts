'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AIProvider, ChatMessage } from '@/types/chat-types'

interface UseChatbotOptions {
    initialProvider?: AIProvider
}

interface UseChatbotReturn {
    messages: ChatMessage[]
    isLoading: boolean
    error: string | null
    provider: AIProvider
    setProvider: (provider: AIProvider) => void
    sendMessage: (content: string) => Promise<void>
    clearMessages: () => void
}

export function useChatbot(options: UseChatbotOptions = {}): UseChatbotReturn {
    const { initialProvider = 'groq' } = options

    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [provider, setProvider] = useState<AIProvider>(initialProvider)

    const abortControllerRef = useRef<AbortController | null>(null)

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return

        // Cancel any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    provider,
                }),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok) {
                throw new Error('Failed to get response')
            }

            const reader = response.body?.getReader()
            if (!reader) throw new Error('No response body')

            const decoder = new TextDecoder()
            let assistantContent = ''
            const assistantMessageId = crypto.randomUUID()

            // Add empty assistant message
            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                provider,
            }])

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })

                // Parse SSE data
                const lines = chunk.split('\n')
                for (const line of lines) {
                    if (line.startsWith('0:')) {
                        // Text content
                        const text = line.slice(2).trim()
                        if (text.startsWith('"') && text.endsWith('"')) {
                            assistantContent += JSON.parse(text)
                            setMessages(prev => prev.map(m =>
                                m.id === assistantMessageId
                                    ? { ...m, content: assistantContent }
                                    : m
                            ))
                        }
                    }
                }
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return // Request was cancelled
            }
            console.error('Chat error:', err)
            setError(err instanceof Error ? err.message : 'Error sending message')
        } finally {
            setIsLoading(false)
        }
    }, [messages, isLoading, provider])

    const clearMessages = useCallback(() => {
        setMessages([])
        setError(null)
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    return {
        messages,
        isLoading,
        error,
        provider,
        setProvider,
        sendMessage,
        clearMessages,
    }
}
