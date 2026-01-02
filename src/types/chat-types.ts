export type AIProvider = 'groq' | 'cerebras' | 'gemini'

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    provider?: AIProvider
}

export interface ProviderConfig {
    id: AIProvider
    name: string
    model: string
    icon: string
    description: string
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
    groq: {
        id: 'groq',
        name: 'Groq',
        model: 'moonshotai/kimi-k2-instruct-0905',
        icon: '⚡',
        description: 'Ultra-rápido con Kimi K2'
    },
    cerebras: {
        id: 'cerebras',
        name: 'Cerebras',
        model: 'llama-3.3-70b',
        icon: '🧠',
        description: 'Inferencia acelerada por hardware'
    },
    gemini: {
        id: 'gemini',
        name: 'Gemini',
        model: 'gemini-2.5-flash',
        icon: '✨',
        description: 'Google Gemini 2.5 Flash'
    }
}
