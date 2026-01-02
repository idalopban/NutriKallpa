"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { calcularComposicionCorporal } from "@/lib/calculos-nutricionales";
import type { MedidasAntropometricas } from "@/types";

interface HistorialTableProps {
    medidas: MedidasAntropometricas[];
    viewingMedidaId: string | null;
    onViewDetail: (id: string) => void;
    onDelete?: (id: string) => void;
    onDeleteAll?: () => void;
}

export function HistorialTable({ medidas, viewingMedidaId, onViewDetail, onDelete, onDeleteAll }: HistorialTableProps) {
    // Invertir para mostrar la más reciente primero
    const medidasInvertidas = [...medidas].reverse();

    const handleDelete = (id: string) => {
        if (onDelete && window.confirm("¿Estás seguro de que deseas eliminar esta medición? Esta acción no se puede deshacer.")) {
            onDelete(id);
        }
    };

    const handleDeleteAll = () => {
        if (onDeleteAll && window.confirm("¿Estás seguro de que deseas eliminar TODO el historial de mediciones de este paciente? Esta acción es irreversible.")) {
            onDeleteAll();
        }
    };

    return (
        <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Historial de Mediciones</CardTitle>
                    <CardDescription>Registro completo de evaluaciones ISAK</CardDescription>
                </div>
                {medidas.length > 0 && onDeleteAll && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Borrar Todo
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                                <th className="px-4 py-3">Peso</th>
                                <th className="px-4 py-3">Talla</th>
                                <th className="px-4 py-3">IMC</th>
                                <th className="px-4 py-3">Somatotipo</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {medidasInvertidas.map((m) => {
                                const comp = calcularComposicionCorporal(m);
                                const isViewing = viewingMedidaId === m.id;
                                return (
                                    <tr key={m.id} className={`transition-colors ${isViewing ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-muted/20'}`}>
                                        <td className="px-4 py-3 font-medium">
                                            {new Date(m.fecha).toLocaleDateString()}
                                            {isViewing && <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-200 text-[10px]">Viendo</Badge>}
                                        </td>
                                        <td className="px-4 py-3">{m.peso} kg</td>
                                        <td className="px-4 py-3">{m.talla} cm</td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={(m.imc || 0) >= 25 ? "secondary" : (m.imc || 0) < 18.5 ? "outline" : "default"}
                                                className={(m.imc || 0) >= 25 ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" : (m.imc || 0) < 18.5 ? "text-blue-600 border-blue-200" : "bg-green-100 text-green-800 hover:bg-green-200"}
                                            >
                                                {m.imc?.toFixed(1)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {comp.somatotipo.endo.toFixed(1)} - {comp.somatotipo.meso.toFixed(1)} - {comp.somatotipo.ecto.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <Button
                                                variant={isViewing ? "secondary" : "ghost"}
                                                size="sm"
                                                onClick={() => onViewDetail(m.id)}
                                            >
                                                {isViewing ? "Viendo" : "Ver Detalle"}
                                            </Button>
                                            {onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(m.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {medidas.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No hay registros disponibles.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
