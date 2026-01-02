import { Paciente, MedidasAntropometricas } from "@/types";

export interface DashboardProps {
    paciente: Paciente;
    medidas: MedidasAntropometricas[];
    ultimaMedida: Partial<MedidasAntropometricas>;
}
