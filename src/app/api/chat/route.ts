import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createCerebras } from '@ai-sdk/cerebras'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { AIProvider } from '@/types/chat-types'

// Message type for chat
interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
}

// Initialize providers
const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
})

const cerebras = createCerebras({
    apiKey: process.env.CEREBRAS_API_KEY,
})

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Model configurations per provider
const providerModels = {
    groq: groq('moonshotai/kimi-k2-instruct-0905'),
    cerebras: cerebras('llama-3.3-70b'),
    gemini: google('gemini-2.5-flash'),
}

const SYSTEM_PROMPT = `Eres KallpaBot, un asistente especializado en nutrición clínica y dietética para la plataforma NutriKallpa.

Tu rol es ayudar a nutricionistas con:
- Interpretación de datos antropométricos (IMC, composición corporal, pliegues cutáneos)
- Cálculos nutricionales (TMB, GET, distribución de macronutrientes)
- Recomendaciones dietéticas basadas en evidencia científica
- Guías de alimentación para diferentes patologías
- Planificación de menús y equivalencias de alimentos

Directrices:
- Responde en español
- Sé conciso pero preciso
- Cita fuentes científicas cuando sea relevante
- Si no estás seguro, indícalo claramente
- Usa formato markdown para mejor legibilidad`

export async function POST(req: Request) {
    try {
        const { messages, provider = 'groq' } = await req.json() as {
            messages: Message[]
            provider?: AIProvider
        }

        // Validate provider
        const validProviders: AIProvider[] = ['groq', 'cerebras', 'gemini']
        const selectedProvider = validProviders.includes(provider) ? provider : 'groq'

        const model = providerModels[selectedProvider]

        const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages,
        })

        // In AI SDK v6, we need to use the textStream and create the SSE response manually
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()
                try {
                    for await (const chunk of result.textStream) {
                        // Format as SSE data that the client expects
                        const sseData = `0:${JSON.stringify(chunk)}\n`
                        controller.enqueue(encoder.encode(sseData))
                    }
                    controller.close()
                } catch (error) {
                    console.error('Stream error:', error)
                    controller.error(error)
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        console.error('Chat API error:', error)
        return new Response(
            JSON.stringify({
                error: 'Error processing chat request',
                details: error instanceof Error ? error.message : String(error)
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
