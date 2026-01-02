/**
 * Structured Logger
 * 
 * Provides consistent logging with levels, timestamps, and context.
 * Use this instead of console.log for better debugging and monitoring.
 */

// ============================================================================
// TYPES
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    userId?: string;
    action?: string;
    ip?: string;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel =
    (process.env.LOG_LEVEL as LogLevel) ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const COLORS = {
    debug: '\x1b[36m',  // Cyan
    info: '\x1b[32m',   // Green
    warn: '\x1b[33m',   // Yellow
    error: '\x1b[31m',  // Red
    reset: '\x1b[0m',
};

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

function formatTimestamp(): string {
    return new Date().toISOString();
}

function formatLogEntry(entry: LogEntry): string {
    const color = COLORS[entry.level];
    const reset = COLORS.reset;
    const levelPadded = entry.level.toUpperCase().padEnd(5);

    let output = `${color}[${entry.timestamp}] ${levelPadded}${reset} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
        output += ` ${color}${JSON.stringify(entry.context)}${reset}`;
    }

    if (entry.error) {
        output += `\n${color}  Error: ${entry.error.name}: ${entry.error.message}${reset}`;
        if (entry.error.stack && process.env.NODE_ENV !== 'production') {
            output += `\n${entry.error.stack}`;
        }
    }

    return output;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        timestamp: formatTimestamp(),
        level,
        message,
        context,
    };

    if (error) {
        entry.error = {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    const formatted = formatLogEntry(entry);

    switch (level) {
        case 'error':
            console.error(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        default:
            console.log(formatted);
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const logger = {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext, error?: Error) => log('error', message, context, error),

    // Convenience methods for common patterns
    auth: {
        loginAttempt: (email: string, success: boolean) =>
            log(success ? 'info' : 'warn', `Login ${success ? 'successful' : 'failed'}`, {
                action: 'login',
                userId: email.slice(0, 5) + '...'
            }),
        register: (email: string) =>
            log('info', 'User registered', { action: 'register', userId: email.slice(0, 5) + '...' }),
        logout: (userId?: string) =>
            log('info', 'User logged out', { action: 'logout', userId }),
        recoveryRequest: (email: string) =>
            log('info', 'Password recovery requested', { action: 'recovery', userId: email.slice(0, 5) + '...' }),
    },

    api: {
        request: (method: string, path: string, context?: LogContext) =>
            log('debug', `${method} ${path}`, { action: 'api_request', ...context }),
        response: (method: string, path: string, status: number, durationMs: number) =>
            log('info', `${method} ${path} ${status} (${durationMs}ms)`, { action: 'api_response' }),
        error: (method: string, path: string, error: Error) =>
            log('error', `${method} ${path} failed`, { action: 'api_error' }, error),
    },

    db: {
        query: (operation: string, table: string, durationMs?: number) =>
            log('debug', `DB ${operation} on ${table}`, { action: 'db_query', durationMs }),
        error: (operation: string, table: string, error: Error) =>
            log('error', `DB ${operation} on ${table} failed`, { action: 'db_error' }, error),
    },
};

export type Logger = typeof logger;
