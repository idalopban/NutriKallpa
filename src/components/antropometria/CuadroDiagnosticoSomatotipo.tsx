"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Info } from "lucide-react";

interface CuadroDiagnosticoProps {
    endo: number;
    meso: number;
    ecto: number;
}

export function CuadroDiagnosticoSomatotipo({ endo, meso, ecto }: CuadroDiagnosticoProps) {

    const diagnostico = useMemo(() => {
        // Reglas de Carter & Heath (1990)
        // Se asume que los valores ya vienen redondeados a 1 decimal si es necesario, 
        // pero trabajaremos con los valores directos.

        const diffEndoMeso = Math.abs(endo - meso);
        const diffMesoEcto = Math.abs(meso - ecto);
        const diffEctoEndo = Math.abs(ecto - endo);

        // 1. CENTRAL
        // Ningún componente difiere más de 1 unidad respecto a los otros dos.
        // Es decir: |endo-meso|<=1 AND |meso-ecto|<=1 AND |ecto-endo|<=1
        if (diffEndoMeso <= 1 && diffMesoEcto <= 1 && diffEctoEndo <= 1) {
            return {
                categoria: "Central",
                descripcion: "Equilibrio entre adiposidad, desarrollo musculoesquelético y linealidad. Ningún componente predomina significativamente.",
                color: "bg-slate-100 text-slate-800 border-slate-200"
            };
        }

        // 2. ENDOMORFO DOMINANTE
        // endo > meso + 0.5 && endo > ecto + 0.5
        if (endo > meso + 0.5 && endo > ecto + 0.5) {
            // Subtipos de Endomorfo Dominante:

            // Endo-ectomórfico: ecto > meso
            if (ecto > meso) {
                return {
                    categoria: "Endo-Ectomórfico",
                    descripcion: "Predominio de adiposidad con linealidad relativa mayor que el desarrollo muscular.",
                    color: "bg-blue-100 text-blue-800 border-blue-200"
                };
            }
            // Endomorfismo balanceado: |meso - ecto| <= 0.5
            if (diffMesoEcto <= 0.5) {
                return {
                    categoria: "Endomorfismo Balanceado",
                    descripcion: "Predominio claro de adiposidad, con desarrollo muscular y linealidad equilibrados y bajos.",
                    color: "bg-blue-100 text-blue-800 border-blue-200"
                };
            }
            // Endo-mesomórfico: meso > ecto
            if (meso > ecto) {
                return {
                    categoria: "Endo-Mesomórfico",
                    descripcion: "Predominio de adiposidad con un desarrollo muscular significativo superior a la linealidad.",
                    color: "bg-teal-100 text-teal-800 border-teal-200"
                };
            }
        }

        // 3. MESOMORFO DOMINANTE
        // meso > endo + 0.5 && meso > ecto + 0.5
        if (meso > endo + 0.5 && meso > ecto + 0.5) {
            // Subtipos de Mesomorfo Dominante:

            // Meso-endomórfico: endo > ecto
            if (endo > ecto) {
                return {
                    categoria: "Meso-Endomórfico",
                    descripcion: "Predominio musculoesquelético con niveles de adiposidad mayores que la linealidad.",
                    color: "bg-green-100 text-green-800 border-green-200"
                };
            }
            // Mesomorfismo balanceado: |endo - ecto| <= 0.5
            if (diffEctoEndo <= 0.5) {
                return {
                    categoria: "Mesomorfismo Balanceado",
                    descripcion: "Desarrollo musculoesquelético predominante, con adiposidad y linealidad equilibradas.",
                    color: "bg-green-100 text-green-800 border-green-200"
                };
            }
            // Meso-ectomórfico: ecto > endo
            if (ecto > endo) {
                return {
                    categoria: "Meso-Ectomórfico",
                    descripcion: "Predominio musculoesquelético con una linealidad relativa mayor que la adiposidad.",
                    color: "bg-lime-100 text-lime-800 border-lime-200"
                };
            }
        }

        // 4. ECTOMORFO DOMINANTE
        // ecto > endo + 0.5 && ecto > meso + 0.5
        if (ecto > endo + 0.5 && ecto > meso + 0.5) {
            // Subtipos de Ectomorfo Dominante:

            // Ecto-mesomórfico: meso > endo
            if (meso > endo) {
                return {
                    categoria: "Ecto-Mesomórfico",
                    descripcion: "Predominio de linealidad relativa con desarrollo muscular mayor que la adiposidad.",
                    color: "bg-yellow-100 text-yellow-800 border-yellow-200"
                };
            }
            // Ectomorfismo balanceado: |endo - meso| <= 0.5
            if (diffEndoMeso <= 0.5) {
                return {
                    categoria: "Ectomorfismo Balanceado",
                    descripcion: "Predominio claro de linealidad, con adiposidad y desarrollo muscular equilibrados y bajos.",
                    color: "bg-yellow-100 text-yellow-800 border-yellow-200"
                };
            }
            // Ecto-endomórfico: endo > meso
            if (endo > meso) {
                return {
                    categoria: "Ecto-Endomórfico",
                    descripcion: "Predominio de linealidad con adiposidad relativa mayor que el desarrollo muscular.",
                    color: "bg-orange-100 text-orange-800 border-orange-200"
                };
            }
        }

        // 5. TIPOS MIXTOS (Ninguno difiere > 0.5 de los otros dos pares, o combinaciones específicas)

        // Endomorfo-mesomorfo: |endo - meso| <= 0.5 && ecto < endo && ecto < meso
        // (Endo y Meso son altos y parecidos, Ecto es bajo)
        if (diffEndoMeso <= 0.5 && ecto < endo && ecto < meso) {
            return {
                categoria: "Endomorfo-Mesomorfo",
                descripcion: "Equilibrio entre alta adiposidad y desarrollo muscular robusto, con baja linealidad.",
                color: "bg-emerald-100 text-emerald-800 border-emerald-200"
            };
        }

        // Ectomorfo-mesomorfo: |ecto - meso| <= 0.5 && endo < ecto && endo < meso
        // (Ecto y Meso son altos y parecidos, Endo es bajo)
        if (Math.abs(ecto - meso) <= 0.5 && endo < ecto && endo < meso) {
            return {
                categoria: "Ectomorfo-Mesomorfo",
                descripcion: "Equilibrio entre linealidad y desarrollo muscular, con baja adiposidad.",
                color: "bg-cyan-100 text-cyan-800 border-cyan-200"
            };
        }

        // Ectomorfo-endomorfo: |ecto - endo| <= 0.5 && meso < ecto && meso < endo
        // (Ecto y Endo son altos y parecidos, Meso es bajo)
        if (Math.abs(ecto - endo) <= 0.5 && meso < ecto && meso < endo) {
            return {
                categoria: "Ectomorfo-Endomorfo",
                descripcion: "Equilibrio entre linealidad y adiposidad, con bajo desarrollo muscular.",
                color: "bg-purple-100 text-purple-800 border-purple-200"
            };
        }

        // Fallback por si acaso (no debería ocurrir si las reglas cubren todo el espectro)
        return {
            categoria: "No Clasificado",
            descripcion: "La combinación de valores no encaja claramente en las categorías estándar de Carter & Heath.",
            color: "bg-gray-100 text-gray-800 border-gray-200"
        };

    }, [endo, meso, ecto]);

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden h-full">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    Diagnóstico del Somatotipo
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

                {/* Valores de Entrada */}
                <div className="flex justify-center gap-4">
                    <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg border border-blue-100 min-w-[80px]">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Endo</span>
                        <span className="text-2xl font-bold text-blue-900">{endo.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-100 min-w-[80px]">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Meso</span>
                        <span className="text-2xl font-bold text-green-900">{meso.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100 min-w-[80px]">
                        <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Ecto</span>
                        <span className="text-2xl font-bold text-yellow-900">{ecto.toFixed(1)}</span>
                    </div>
                </div>

                {/* Diagnóstico Principal */}
                <div className={`p-4 rounded-xl border ${diagnostico.color} text-center space-y-2`}>
                    <h3 className="text-sm font-semibold uppercase tracking-widest opacity-70">Categoría Detectada</h3>
                    <p className="text-2xl font-extrabold tracking-tight">{diagnostico.categoria}</p>
                </div>

                {/* Descripción */}
                <div className="flex gap-3 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {diagnostico.descripcion}
                    </p>
                </div>

            </CardContent>
        </Card>
    );
}
