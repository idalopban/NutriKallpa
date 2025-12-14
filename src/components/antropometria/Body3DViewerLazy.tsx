"use client";

/**
 * Lazy-loaded 3D Body Viewer
 * 
 * This wrapper provides optimal loading for the heavy 3D component:
 * - No SSR (prevents hydration issues with Three.js)
 * - Skeleton placeholder with fixed dimensions (prevents CLS)
 * - Lazy loading (improves LCP)
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { ComponentType } from 'react';

// Props type from the original component
interface Body3DViewerProps {
    data?: any;
    measurements?: any[];
    hoveredId?: string | null;
    onLoaded?: () => void;
}

// Skeleton component with fixed dimensions to prevent CLS
function Body3DViewerSkeleton() {
    return (
        <div className="relative w-full h-full min-h-[500px] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />

            {/* Loading indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Cargando modelo 3D...
                </p>
            </div>

            {/* Placeholder silhouette */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <svg viewBox="0 0 100 200" className="h-64 text-slate-400">
                    <ellipse cx="50" cy="25" rx="18" ry="22" fill="currentColor" />
                    <rect x="35" y="45" width="30" height="60" rx="5" fill="currentColor" />
                    <rect x="20" y="50" width="12" height="50" rx="4" fill="currentColor" />
                    <rect x="68" y="50" width="12" height="50" rx="4" fill="currentColor" />
                    <rect x="38" y="105" width="10" height="55" rx="4" fill="currentColor" />
                    <rect x="52" y="105" width="10" height="55" rx="4" fill="currentColor" />
                </svg>
            </div>
        </div>
    );
}

// Lazy load the 3D viewer with no SSR - handles named export
const LazyBody3DViewer = dynamic<Body3DViewerProps>(
    () => import('./Body3DViewer').then(mod => mod.Body3DViewer as ComponentType<Body3DViewerProps>),
    {
        ssr: false,
        loading: () => <Body3DViewerSkeleton />,
    }
);

// Export with both names for flexibility
export { LazyBody3DViewer as Body3DViewer, LazyBody3DViewer };
export default LazyBody3DViewer;
