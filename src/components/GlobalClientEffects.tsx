"use client";

import { ServiceWorkerRegistration } from "@/hooks/useServiceWorker";

/**
 * Global Client Effects
 * 
 * Mounts client-side effects that need to run once at app startup.
 * - Service Worker registration for PWA
 */
export default function GlobalClientEffects() {
  return (
    <>
      <ServiceWorkerRegistration />
    </>
  );
}
