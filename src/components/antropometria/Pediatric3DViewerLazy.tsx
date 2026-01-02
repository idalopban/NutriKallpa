"use client";

/**
 * Lazy-loaded Pediatric 3D Body Viewer
 * 
 * This wrapper provides optimal loading for the heavy 3D component:
 * - No SSR (prevents hydration issues with Three.js)
 * - Skeleton placeholder with fixed dimensions (prevents CLS)
 * - Lazy loading (improves LCP)
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Gender } from '@/hooks/useAdolescentMetrics';

// Props type from the original component
interface Pediatric3DViewerProps {
    gender: Gender;
    bodyFatPercent?: number | null;
    riskLevel?: 'bajo' | 'normal' | 'elevado' | 'alto';
    onLoaded?: () => void;
}

// Skeleton component with fixed dimensions to prevent CLS
function Pediatric3DViewerSkeleton() {
    return (
        <div className="relative w-full h-full min-h-[400px] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
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
                <svg viewBox="0 0 100 200" className="h-48 text-slate-400">
                    <ellipse cx="50" cy="25" rx="18" ry="22" fill="currentColor" />
                    <rect x="35" y="45" width="30" height="50" rx="5" fill="currentColor" />
                    <rect x="20" y="50" width="12" height="40" rx="4" fill="currentColor" />
                    <rect x="68" y="50" width="12" height="40" rx="4" fill="currentColor" />
                    <rect x="38" y="95" width="10" height="45" rx="4" fill="currentColor" />
                    <rect x="52" y="95" width="10" height="45" rx="4" fill="currentColor" />
                </svg>
            </div>
        </div>
    );
}

// Lazy load the 3D viewer with no SSR
const LazyPediatric3DViewer = dynamic<Pediatric3DViewerProps>(
    () => import('./Pediatric3DViewer').then(mod => mod.Pediatric3DViewer as ComponentType<Pediatric3DViewerProps>),
    {
        ssr: false,
        loading: () => <Pediatric3DViewerSkeleton />,
    }
);

// Export with both names for flexibility
export { LazyPediatric3DViewer as Pediatric3DViewer, LazyPediatric3DViewer, Pediatric3DViewerSkeleton };
export default LazyPediatric3DViewer;
