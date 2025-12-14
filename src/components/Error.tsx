"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; cause?: any };
  reset?: () => void;
}) {
  const [errorDetails, setErrorDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    const details: Record<string, any> = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };

    details.url = window.location.href;
    details.timestamp = new Date().toISOString();

    setErrorDetails(details);

    // Log error to console for debugging
    console.error("Error capturado:", error);
  }, [error]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 p-6 bg-slate-50 dark:bg-[#0f172a]">
      {/* Error Icon */}
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Algo salió mal
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
        </p>
      </div>

      {/* Error Message */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 max-w-md w-full">
        <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
          {error.message || "Error desconocido"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <Button
          onClick={reset || handleReload}
          variant="default"
          className="flex-1 gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reintentar
        </Button>
        <Button
          onClick={handleGoHome}
          variant="outline"
          className="flex-1 gap-2"
        >
          <Home className="w-4 h-4" />
          Ir al Inicio
        </Button>
      </div>

      {/* Hidden debug info for iframe communication */}
      <button
        onClick={() => {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(
              {
                type: "IFRAME_ERROR",
                payload: errorDetails,
              },
              "*"
            );
          }
        }}
        className="hidden"
      >
        Fix Error
      </button>
    </div>
  );
}
