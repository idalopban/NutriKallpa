/**
 * Global Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Required for clinical-grade stability - prevents the entire app
 * from crashing during patient consultations.
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console (could be sent to monitoring service)
        console.error("[ErrorBoundary] Uncaught error:", error);
        console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

        this.setState({ errorInfo });

        // Log to audit if needed (for HIPAA compliance)
        this.logErrorToAudit(error, errorInfo);
    }

    private logErrorToAudit(error: Error, errorInfo: ErrorInfo): void {
        // Could send to server-side audit log
        const errorLog = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            url: typeof window !== "undefined" ? window.location.href : "unknown",
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
        };

        // Store in localStorage as backup
        try {
            const existingLogs = JSON.parse(localStorage.getItem("error_logs") || "[]");
            existingLogs.push(errorLog);
            // Keep only last 10 errors
            if (existingLogs.length > 10) existingLogs.shift();
            localStorage.setItem("error_logs", JSON.stringify(existingLogs));
        } catch {
            // Ignore storage errors
        }
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    private handleReload = (): void => {
        window.location.reload();
    };

    private handleGoHome = (): void => {
        window.location.href = "/dashboard";
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="flex h-screen w-full flex-col items-center justify-center gap-6 p-6 bg-slate-50 dark:bg-[#0f172a]">
                    {/* Error Icon */}
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Error de Aplicación
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                            Ha ocurrido un error inesperado. Tus datos están seguros.
                            Por favor, intenta recargar la página.
                        </p>
                    </div>

                    {/* Error Message */}
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 max-w-md w-full">
                        <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
                            {this.state.error?.message || "Error desconocido"}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                        <Button
                            onClick={this.handleReset}
                            variant="default"
                            className="flex-1 gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reintentar
                        </Button>
                        <Button
                            onClick={this.handleGoHome}
                            variant="outline"
                            className="flex-1 gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Ir al Inicio
                        </Button>
                    </div>

                    {/* Debug info for development */}
                    {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                        <details className="mt-4 w-full max-w-2xl">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                Ver detalles técnicos
                            </summary>
                            <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto max-h-64">
                                {this.state.error?.stack}
                                {"\n\nComponent Stack:"}
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
