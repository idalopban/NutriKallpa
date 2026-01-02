import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CalendarDays, Ruler } from "lucide-react";

export function AntroDataPanel() {
    const history = [
        { label: "Pliegue Tricipital", value: "12mm", date: "Hace 2 días", icon: Ruler },
        { label: "Perímetro Cintura", value: "85cm", date: "Hace 2 días", icon: Activity },
        { label: "Peso Corporal", value: "75.5kg", date: "Hace 1 semana", icon: Activity },
        { label: "Pliegue Abdominal", value: "22mm", date: "Hace 1 semana", icon: Ruler },
        { label: "IMC Actual", value: "24.2", date: "Hoy", icon: Activity },
    ];

    return (
        <Card className="h-[600px] border-none shadow-sm bg-white dark:bg-[#0f172a] rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#6cba00]" />
                    Historial de Puntos
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                {history.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-[#ff8508] shadow-sm group-hover:scale-110 transition-transform">
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</h4>
                            <span className="text-xs text-slate-400">{item.date}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-[#6cba00]">{item.value}</span>
                        </div>
                    </div>
                ))}

                <div className="p-4 rounded-xl bg-gradient-to-br from-[#6cba00]/10 to-[#ff8508]/10 border border-[#6cba00]/20 mt-4">
                    <h5 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nota del Especialista</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        El paciente muestra una mejora significativa en la reducción de pliegues abdominales respecto a la última medición.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
