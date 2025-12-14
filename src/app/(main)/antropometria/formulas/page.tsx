"use client";

import { FormulasAntropometricas } from "@/components/antropometria/FormulasAntropometricas";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FormulasPage() {
    const router = useRouter();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-slate-100"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Fórmulas Antropométricas
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Referencia técnica para evaluaciones
                    </p>
                </div>
            </div>

            <FormulasAntropometricas />
        </div>
    );
}
