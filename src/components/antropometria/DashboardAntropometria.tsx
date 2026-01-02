"use client";

import { useMemo, useState, useEffect } from "react";
import { FormularioMedidas } from "./FormularioMedidas";
import { SomatotipoChart } from "./SomatotipoChart";
import { CuadroDiagnosticoSomatotipo } from "./CuadroDiagnosticoSomatotipo";
import { HistorialTable } from "./HistorialTable";
import { ComposicionResumen } from "./ComposicionResumen";
import { RiskCard, ClinicalEvaluationPanel } from "@/components/clinical";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, User, PlusCircle, LayoutDashboard, History, ArrowLeft, Stethoscope } from "lucide-react";
import { calcularComposicionCorporal, calcularTodasLasFormulas, seleccionarMejorFormula } from "@/lib/calculos-nutricionales";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getAnthroNumber } from "@/types";
import { formatClinicalAge } from "@/lib/clinical-calculations";

// Types
import type { MedidasAntropometricas, Paciente } from "@/types";

interface DashboardAntropometriaProps {
    paciente: Paciente;
    medidas: MedidasAntropometricas[]; // Datos históricos
    onSuccess?: (data: MedidasAntropometricas) => void;
    onDelete?: (id: string) => void;
    onDeleteAll?: () => void;
    hideHeader?: boolean;
    defaultTab?: string;
}

/**
 * Componente principal del Dashboard de Antropometría.
 * Organizado en pestañas: Resumen, Nueva Evaluación, Somatocarta, Historial.
 */
export function DashboardAntropometria({
    paciente,
    medidas,
    onSuccess,
    onDelete,
    onDeleteAll,
    hideHeader = false,
    defaultTab = "nuevo"
}: DashboardAntropometriaProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [formulaSeleccionada, setFormulaSeleccionada] = useState<string>("");
    const [viewingMedidaId, setViewingMedidaId] = useState<string | null>(null);

    // Invertir para mostrar la más reciente primero
    const medidasInvertidas = useMemo(() => [...medidas].reverse(), [medidas]);

    // Determinar qué medida mostrar (la seleccionada o la última)
    const ultimaMedida = useMemo(() => {
        if (viewingMedidaId) {
            return medidas.find(m => m.id === viewingMedidaId) || medidasInvertidas[0];
        }
        return medidasInvertidas[0];
    }, [viewingMedidaId, medidas, medidasInvertidas]);

    // Todas las fórmulas disponibles para la medida visualizada
    const todasFormulas = useMemo(() => {
        if (!ultimaMedida) return [];
        return calcularTodasLasFormulas(ultimaMedida);
    }, [ultimaMedida]);

    // Seleccionar fórmula automáticamente basada en el perfil guardado o la mejor disponible
    useEffect(() => {
        if (ultimaMedida) {
            // Si la medida tiene un perfil guardado, usamos la lógica de ese perfil
            if (ultimaMedida.tipoPaciente) {
                const formulaPerfil = seleccionarMejorFormula(ultimaMedida.tipoPaciente);
                setFormulaSeleccionada(formulaPerfil);
            } else {
                // Si es una medida antigua sin perfil, usamos "general" por defecto o inferimos
                const mejor = seleccionarMejorFormula("general");
                setFormulaSeleccionada(mejor);
            }
        }
    }, [ultimaMedida]);

    // Cálculo de composición corporal usando la fórmula seleccionada
    const resultadosActuales = useMemo(() => {
        if (!ultimaMedida) return null;
        // Pasamos la fórmula seleccionada como tercer argumento (formulaManual)
        return calcularComposicionCorporal(ultimaMedida, ultimaMedida.tipoPaciente || "general", formulaSeleccionada);
    }, [ultimaMedida, formulaSeleccionada]);

    const handleSuccess = (data: MedidasAntropometricas) => {
        if (onSuccess) onSuccess(data);
        setViewingMedidaId(null); // Asegurar que vemos la nueva
        setActiveTab("composicion"); // volver al resumen tras guardar
    };

    const handleViewDetail = (id: string) => {
        setViewingMedidaId(id);
        setActiveTab("composicion");
        // Scroll to top to see the banner
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {!hideHeader && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                            {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                        </h2>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <User className="w-4 h-4" /> {paciente.datosPersonales.sexo === 'masculino' ? 'Masculino' : 'Femenino'} • {formatClinicalAge(paciente.datosPersonales.fechaNacimiento)}
                        </p>
                    </div>
                    {ultimaMedida && (
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                                {viewingMedidaId ? "Visualizando registro del" : "Última evaluación"}
                            </p>
                            <p className="font-medium">{new Date(ultimaMedida.fecha).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Banner de visualización de historial */}
            {viewingMedidaId && ultimaMedida && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        <div>
                            <span className="font-semibold block sm:inline">Modo Histórico: </span>
                            <span className="text-sm">
                                Estás viendo los datos del <span className="font-medium">{new Date(ultimaMedida.fecha).toLocaleDateString()}</span>.
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-blue-100 border-blue-200 text-blue-700 whitespace-nowrap w-full sm:w-auto"
                        onClick={() => setViewingMedidaId(null)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al actual
                    </Button>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[750px] mb-6">
                    <TabsTrigger value="nuevo"><PlusCircle className="w-4 h-4 mr-2" /> Nueva</TabsTrigger>
                    <TabsTrigger value="composicion"><LayoutDashboard className="w-4 h-4 mr-2" /> Composición</TabsTrigger>
                    <TabsTrigger value="clinico"><Stethoscope className="w-4 h-4 mr-2" /> Clínico</TabsTrigger>
                    <TabsTrigger value="somatocarta"><Activity className="w-4 h-4 mr-2" /> Somatocarta</TabsTrigger>
                    <TabsTrigger value="historial"><History className="w-4 h-4 mr-2" /> Historial</TabsTrigger>
                </TabsList>

                {/* --- TAB: COMPOSICIÓN (Ex-Resumen) --- */}
                <TabsContent value="composicion" className="space-y-6">
                    <ComposicionResumen
                        resultados={resultadosActuales}
                        ultimaMedida={ultimaMedida}
                        todasFormulas={todasFormulas}
                        formulaSeleccionada={formulaSeleccionada}
                        onFormulaChange={setFormulaSeleccionada}
                        onNewEvaluation={() => setActiveTab("nuevo")}
                    />

                    {/* Riesgo Cardiometabólico - mostrar si hay cintura y cadera */}
                    {ultimaMedida &&
                        ultimaMedida.perimetros?.cintura &&
                        ultimaMedida.perimetros?.cadera &&
                        ultimaMedida.talla &&
                        ultimaMedida.sexo !== 'otro' && (
                            <RiskCard
                                waist={getAnthroNumber(ultimaMedida.perimetros.cintura)}
                                hip={getAnthroNumber(ultimaMedida.perimetros.cadera)}
                                height={ultimaMedida.talla}
                                age={ultimaMedida.edad}
                                sex={ultimaMedida.sexo as 'masculino' | 'femenino'}
                            />
                        )}
                </TabsContent>

                {/* --- TAB: NUEVA EVALUACIÓN --- */}
                <TabsContent value="nuevo">
                    <div className="w-full max-w-full mx-auto">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold">Nueva Evaluación ISAK</h2>
                            <p className="text-sm text-muted-foreground">Ingresa los datos antropométricos para calcular la composición corporal.</p>
                        </div>
                        <FormularioMedidas paciente={paciente} onSuccess={handleSuccess} />
                    </div>
                </TabsContent>

                {/* --- TAB: CLÍNICO (Evaluaciones Especiales) --- */}
                <TabsContent value="clinico" className="space-y-6">
                    {ultimaMedida ? (
                        <ClinicalEvaluationPanel
                            patientData={{
                                sex: (ultimaMedida.sexo === 'masculino' || ultimaMedida.sexo === 'femenino')
                                    ? ultimaMedida.sexo
                                    : 'masculino',
                                age: ultimaMedida.edad,
                                weight: ultimaMedida.peso,
                                height: ultimaMedida.talla,
                                waist: ultimaMedida.perimetros?.cintura
                                    ? getAnthroNumber(ultimaMedida.perimetros.cintura)
                                    : undefined,
                                hip: ultimaMedida.perimetros?.cadera
                                    ? getAnthroNumber(ultimaMedida.perimetros.cadera)
                                    : undefined,
                                triceps: ultimaMedida.pliegues?.triceps
                                    ? getAnthroNumber(ultimaMedida.pliegues.triceps)
                                    : undefined,
                                subscapular: ultimaMedida.pliegues?.subscapular
                                    ? getAnthroNumber(ultimaMedida.pliegues.subscapular)
                                    : undefined,
                                biceps: ultimaMedida.pliegues?.biceps
                                    ? getAnthroNumber(ultimaMedida.pliegues.biceps)
                                    : undefined,
                                suprailiac: ultimaMedida.pliegues?.supraspinale
                                    ? getAnthroNumber(ultimaMedida.pliegues.supraspinale)
                                    : undefined,
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
                            <Stethoscope className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-xl font-semibold text-muted-foreground">Sin datos antropométricos</h3>
                            <p className="text-sm text-muted-foreground/80 max-w-md mt-2 mb-6">
                                Realiza una evaluación antropométrica primero para acceder a las evaluaciones clínicas especiales.
                            </p>
                            <Button onClick={() => setActiveTab("nuevo")} variant="outline">
                                <PlusCircle className="w-4 h-4 mr-2" />
                                Nueva Evaluación
                            </Button>
                        </div>
                    )}
                </TabsContent>

                {/* --- TAB: SOMATOCARTA --- */}
                <TabsContent value="somatocarta" className="space-y-6">
                    {resultadosActuales ? (
                        <div className="grid md:grid-cols-2 gap-6 items-start">
                            {/* Gráfico Somatocarta */}
                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>Somatocarta</CardTitle>
                                    <CardDescription>Distribución del tipo corporal actual</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <SomatotipoChart
                                        endo={resultadosActuales.somatotipo.endo}
                                        meso={resultadosActuales.somatotipo.meso}
                                        ecto={resultadosActuales.somatotipo.ecto}
                                    />
                                </CardContent>
                            </Card>

                            {/* Cuadro de Diagnóstico Automático */}
                            <div className="h-full">
                                <CuadroDiagnosticoSomatotipo
                                    endo={resultadosActuales.somatotipo.endo}
                                    meso={resultadosActuales.somatotipo.meso}
                                    ecto={resultadosActuales.somatotipo.ecto}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
                            <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-xl font-semibold text-muted-foreground">Sin datos de somatotipo</h3>
                            <p className="text-sm text-muted-foreground/80 max-w-md mt-2 mb-6">
                                Realiza una evaluación antropométrica completa para visualizar la somatocarta.
                            </p>
                        </div>
                    )}
                </TabsContent>

                {/* --- TAB: HISTORIAL --- */}
                <TabsContent value="historial">
                    <HistorialTable
                        medidas={medidas}
                        viewingMedidaId={viewingMedidaId}
                        onViewDetail={handleViewDetail}
                        onDelete={onDelete}
                        onDeleteAll={onDeleteAll}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}