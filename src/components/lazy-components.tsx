/**
 * Lazy Loading Wrappers for Heavy Components
 * 
 * These wrappers use Next.js dynamic imports to prevent heavy libraries
 * (Three.js, Recharts, Framer Motion) from blocking initial page load.
 * 
 * PERFORMANCE: 
 * - Three.js + React Three Fiber: ~400KB
 * - Recharts: ~200KB
 * - Framer Motion: ~150KB
 * 
 * By lazy loading, we reduce Time to Interactive (TTI) on slow connections.
 */

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// ============================================================================
// LOADING SKELETONS
// ============================================================================

const Chart3DLoadingSkeleton = () => (
    <Card className="w-full h-[400px] flex items-center justify-center bg-muted/30">
        <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cargando visualización 3D...</p>
        </CardContent>
    </Card>
);

const ChartLoadingSkeleton = () => (
    <div className="w-full h-[300px] flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-lg" />
    </div>
);

const ComponentLoadingSkeleton = () => (
    <div className="w-full p-4">
        <Skeleton className="w-full h-24 rounded-lg" />
    </div>
);

// ============================================================================
// LAZY 3D COMPONENTS (Three.js / React Three Fiber)
// ============================================================================

/**
 * Lazy-loaded Human Body 3D Viewer
 * Heavy dependency: @react-three/fiber, three
 */
export const LazyHumanBodyViewer = dynamic(
    () => import('@/components/antropometria/HumanBodyViewer').then(mod => mod.HumanBodyViewer),
    {
        ssr: false,
        loading: () => <Chart3DLoadingSkeleton />,
    }
);

/**
 * Lazy-loaded Body 3D Viewer
 * Heavy dependency: @react-three/fiber, three
 */
export const LazyBody3DViewer = dynamic(
    () => import('@/components/antropometria/Body3DViewer').then(mod => mod.Body3DViewer),
    {
        ssr: false,
        loading: () => <Chart3DLoadingSkeleton />,
    }
);

// Note: TubesBackground component may not exist. If needed, create it separately.

// ============================================================================
// LAZY CHART COMPONENTS (Recharts)
// ============================================================================

/**
 * Lazy-loaded Diet Charts
 * Heavy dependency: recharts
 */
export const LazyDietCharts = dynamic(
    () => import('@/components/diet/DietCharts').then(mod => mod.DietCharts),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    }
);

/**
 * Lazy-loaded Somatotype Chart
 * Heavy dependency: recharts
 */
export const LazySomatotipoChart = dynamic(
    () => import('@/components/antropometria/SomatotipoChart').then(mod => mod.SomatotipoChart),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    }
);

/**
 * Lazy-loaded Pediatric Growth Chart
 * Heavy dependency: recharts
 */
export const LazyPediatricGrowthChart = dynamic(
    () => import('@/components/pediatrics/PediatricGrowthChart').then(mod => mod.PediatricGrowthChart),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    }
);

/**
 * Lazy-loaded Pregnancy Chart
 * Heavy dependency: recharts
 */
export const LazyPregnancyChart = dynamic(
    () => import('@/components/clinical/PregnancyChart').then(mod => mod.default),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    }
);

/**
 * Lazy-loaded Dashboard Scheduled Events Chart
 * Heavy dependency: recharts
 */
export const LazyScheduledEventsChart = dynamic(
    () => import('@/components/dashboard/ScheduledEventsChart').then(mod => mod.ScheduledEventsChart),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    }
);

// ============================================================================
// UTILITY: Check if component should lazy load
// ============================================================================

/**
 * Returns true if the user is on a slow connection
 * Uses Navigator.connection API (not available in all browsers)
 */
export function shouldUseLazyLoading(): boolean {
    if (typeof navigator === 'undefined') return true;

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    if (!connection) return true;

    // Lazy load on 2G, 3G, or slow 4G
    const slowConnections = ['slow-2g', '2g', '3g'];
    return slowConnections.includes(connection.effectiveType || '');
}
