"use client";

import { FormulasAntropometricas } from "@/components/antropometria/FormulasAntropometricas";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FormulasPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 max-w-6xl space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Fórmulas <span className="text-[#ff8508]">Antropométricas</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Referencia técnica para evaluaciones
                        </p>
                    </div>
                </div>

                <FormulasAntropometricas />
            </div>
        </div>
    );
}
