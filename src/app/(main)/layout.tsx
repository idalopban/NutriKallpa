import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { InactivityGuard } from "@/components/auth/InactivityGuard";

export const metadata: Metadata = {
  title: "NutriKallpa",
  description: "Sistema de gestión nutricional y de pacientes",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <InactivityGuard timeoutMinutes={8}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f172a] gap-0 font-sans">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0f172a]">
          <Header />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </InactivityGuard>
  );
}

