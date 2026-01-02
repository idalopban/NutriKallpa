/**
 * API Error Classes and Utilities
 * 
 * Provides standardized error handling for API responses.
 * Use these classes for consistent error messages and codes.
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export const ErrorCodes = {
    // Authentication errors (1xxx)
    AUTH_INVALID_CREDENTIALS: 'AUTH_001',
    AUTH_USER_NOT_FOUND: 'AUTH_002',
    AUTH_EMAIL_EXISTS: 'AUTH_003',
    AUTH_INVALID_CODE: 'AUTH_004',
    AUTH_CODE_EXPIRED: 'AUTH_005',
    AUTH_RATE_LIMITED: 'AUTH_006',
    AUTH_UNAUTHORIZED: 'AUTH_007',
    AUTH_SESSION_EXPIRED: 'AUTH_008',

    // Validation errors (2xxx)
    VALIDATION_FAILED: 'VAL_001',
    VALIDATION_REQUIRED_FIELD: 'VAL_002',
    VALIDATION_INVALID_FORMAT: 'VAL_003',

    // Database errors (3xxx)
    DB_CONNECTION_ERROR: 'DB_001',
    DB_QUERY_ERROR: 'DB_002',
    DB_NOT_FOUND: 'DB_003',
    DB_DUPLICATE: 'DB_004',

    // Permission errors (4xxx)
    PERMISSION_DENIED: 'PERM_001',
    PERMISSION_ADMIN_REQUIRED: 'PERM_002',

    // General errors (5xxx)
    INTERNAL_ERROR: 'ERR_001',
    EXTERNAL_SERVICE_ERROR: 'ERR_002',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base API Error class
 */
export class APIError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        code: ErrorCode,
        statusCode: number = 400,
        isOperational: boolean = true
    ) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintains proper stack trace
        Error.captureStackTrace?.(this, this.constructor);
    }
}

/**
 * Authentication Error
 */
export class AuthError extends APIError {
    constructor(message: string, code: ErrorCode = ErrorCodes.AUTH_UNAUTHORIZED) {
        super(message, code, 401);
        this.name = 'AuthError';
    }
}

/**
 * Validation Error
 */
export class ValidationError extends APIError {
    public readonly fields: Record<string, string>;

    constructor(message: string, fields: Record<string, string> = {}) {
        super(message, ErrorCodes.VALIDATION_FAILED, 400);
        this.name = 'ValidationError';
        this.fields = fields;
    }
}

/**
 * Permission Error
 */
export class PermissionError extends APIError {
    constructor(message: string = 'No tienes permisos para realizar esta acción') {
        super(message, ErrorCodes.PERMISSION_DENIED, 403);
        this.name = 'PermissionError';
    }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends APIError {
    public readonly retryAfterMs: number;

    constructor(message: string, retryAfterMs: number) {
        super(message, ErrorCodes.AUTH_RATE_LIMITED, 429);
        this.name = 'RateLimitError';
        this.retryAfterMs = retryAfterMs;
    }
}

/**
 * Not Found Error
 */
export class NotFoundError extends APIError {
    constructor(resource: string = 'Recurso') {
        super(`${resource} no encontrado`, ErrorCodes.DB_NOT_FOUND, 404);
        this.name = 'NotFoundError';
    }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: ErrorCode;
        message: string;
        fields?: Record<string, string>;
    };
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T): APIResponse<T> {
    return {
        success: true,
        data,
    };
}

/**
 * Create an error response
 */
export function errorResponse(
    error: APIError | Error | string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR
): APIResponse {
    if (error instanceof APIError) {
        return {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                ...(error instanceof ValidationError && { fields: error.fields }),
            },
        };
    }

    const message = error instanceof Error ? error.message : error;

    return {
        success: false,
        error: {
            code,
            message,
        },
    };
}

/**
 * Handle unknown errors safely
 */
export function handleError(error: unknown): APIResponse {
    if (error instanceof APIError) {
        return errorResponse(error);
    }

    if (error instanceof Error) {
        console.error('[API_ERROR]', error);
        return errorResponse(
            process.env.NODE_ENV === 'production'
                ? 'Ha ocurrido un error inesperado'
                : error.message,
            ErrorCodes.INTERNAL_ERROR
        );
    }

    return errorResponse('Error desconocido', ErrorCodes.INTERNAL_ERROR);
}
