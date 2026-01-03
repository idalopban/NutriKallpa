"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Search, User, Phone,
  MoreHorizontal, Trash2, Eye, FileText,
  TrendingUp, Users, Utensils,
  ChevronRight, CalendarPlus
} from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { PatientAgeBadge } from "@/components/patient/PatientAgeBadge";

// Helper function to determine patient status
type PatientStatus = "activo" | "pendiente" | "inactivo";
const INACTIVITY_THRESHOLD_DAYS = 8; // Inactivo después de 8 días sin evaluación

function getPatientStatus(medidas: MedidasAntropometricas[], dietas: Dieta[], pacienteId: string): PatientStatus {
  const hasMedidas = medidas.length > 0;

  // Pendiente: Sin ninguna evaluación antropométrica
  if (!hasMedidas) return "pendiente";

  // Tiene medidas - verificar fecha de última evaluación
  const sortedMedidas = [...medidas].sort((a, b) =>
    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
  const lastEvalDate = new Date(sortedMedidas[0].fecha);
  const daysSinceLastEval = differenceInDays(new Date(), lastEvalDate);

  // Inactivo: Última evaluación hace más de 8 días
  if (daysSinceLastEval > INACTIVITY_THRESHOLD_DAYS) return "inactivo";

  // Activo: Tiene evaluación y está dentro de los 8 días
  return "activo";
}

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Logic
import {
  getPacientes,
  getPacientesAsync,
  getMedidasByPaciente,
  deletePaciente,
  getDietas,
  getAllMedidas
} from "@/lib/storage";
import { useAuthStore } from "@/store/useAuthStore";
import { usePatientStore } from "@/store/usePatientStore";
import { calculateChronologicalAge } from "@/lib/clinical-calculations";
import type { Paciente, MedidasAntropometricas, Dieta } from "@/types";
import { cn } from "@/lib/utils";

// Skeleton Row Component
function SkeletonRow() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse border border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32" />
          <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-48" />
        </div>
        <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-24" />
        <div className="h-6 bg-gray-100 dark:bg-slate-600 rounded-full w-20" />
        <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-20" />
        <div className="w-8 h-8 bg-gray-100 dark:bg-slate-600 rounded" />
      </div>
    </div>
  );
}

// Patient Row Component with Dark Mode Support
function PatientRow({
  paciente,
  onDelete,
  onClick,
  dietas
}: {
  paciente: Paciente;
  onDelete: () => void;
  onClick: () => void;
  dietas: Dieta[];
}) {
  const router = useRouter();
  const initials = `${paciente.datosPersonales.nombre?.[0] || ""}${paciente.datosPersonales.apellido?.[0] || ""}`.toUpperCase();

  // Get last visit info
  const medidas = dietas.length >= 0 ? getMedidasByPaciente(paciente.id) : []; // This matches original logic but we can optimize it if we pass measures too
  const ultimaMedida = medidas.length > 0 ? medidas[medidas.length - 1] : null;
  const ultimaVisita = ultimaMedida?.fecha
    ? formatDistanceToNow(new Date(ultimaMedida.fecha), { addSuffix: true, locale: es })
    : "Sin visitas";

  // Get patient status using the helper function
  const status = getPatientStatus(medidas, dietas, paciente.id);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-xl p-4 cursor-pointer bg-white dark:bg-slate-800 border border-transparent hover:border-[#ff8508]/20 dark:hover:border-[#ff8508]/20 shadow-sm hover:shadow-lg hover:shadow-[#ff8508]/5 transition-all duration-300 ease-out"
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        {/* Avatar & Name */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 md:min-w-[280px]">
          <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-slate-100 dark:border-slate-700 group-hover:border-[#ff8508] transition-colors flex-shrink-0 overflow-hidden">
            {paciente.datosPersonales.avatarUrl ? (
              paciente.datosPersonales.avatarUrl.startsWith('avatar-') ? (
                <img
                  src={`/perfil/${paciente.datosPersonales.avatarUrl === 'avatar-1' ? 'bebe_nino' :
                    paciente.datosPersonales.avatarUrl === 'avatar-2' ? 'bebe_nina' :
                      paciente.datosPersonales.avatarUrl === 'avatar-3' ? 'nino' :
                        paciente.datosPersonales.avatarUrl === 'avatar-4' ? 'nina' :
                          paciente.datosPersonales.avatarUrl === 'avatar-5' ? 'adulto' :
                            paciente.datosPersonales.avatarUrl === 'avatar-6' ? 'adulta' :
                              paciente.datosPersonales.avatarUrl === 'avatar-7' ? 'adulto_mayor' :
                                paciente.datosPersonales.avatarUrl === 'avatar-8' ? 'adulta_mayor' : 'adulto'
                    }.png`}
                  alt={`${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={paciente.datosPersonales.avatarUrl}
                  alt={`${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm group-hover:text-[#ff8508] transition-colors">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-[#ff8508] transition-colors">
              {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
            </h3>

            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {paciente.datosPersonales.email || "Sin email"}
              </p>
              <PatientAgeBadge birthDate={paciente.datosPersonales.fechaNacimiento} />
            </div>
          </div>
        </div>

        {/* Phone - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-[140px]">
          <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span>{paciente.datosPersonales.telefono || "—"}</span>
        </div>

        {/* Status Badge */}
        <div className="min-w-[100px]">
          <Badge
            className={cn(
              "font-medium px-3 py-1 rounded-full border-0 shadow-none",
              status === "activo" && "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
              status === "pendiente" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
              status === "inactivo" && "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
            )}
          >
            {status === "activo" ? "Activo" : status === "pendiente" ? "Pendiente" : "Inactivo"}
          </Badge>
        </div>

        {/* Last Visit - Hidden on mobile */}
        <div className="hidden md:block flex-1 text-sm text-slate-500 dark:text-slate-400 min-w-[120px]">
          {ultimaVisita}
        </div>

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 dark:bg-slate-800 dark:border-slate-700">
              <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/pacientes/${paciente.id}`)} className="gap-2 dark:hover:bg-slate-700 cursor-pointer">
                <Eye className="h-4 w-4" /> Ver Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/pacientes/${paciente.id}/consulta`)} className="gap-2 dark:hover:bg-slate-700 cursor-pointer">
                <FileText className="h-4 w-4" /> Nueva Consulta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/dietas?paciente=${paciente.id}`)} className="gap-2 dark:hover:bg-slate-700 cursor-pointer">
                <Utensils className="h-4 w-4" /> Crear Dieta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/agenda?paciente=${paciente.id}`)} className="gap-2 dark:hover:bg-slate-700 cursor-pointer">
                <CalendarPlus className="h-4 w-4" /> Agendar Cita
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-slate-700" />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 gap-2 cursor-pointer">
                <Trash2 className="h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-[#ff8508] group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

function PacientesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { patientId: currentPatientId, clearPatient } = usePatientStore();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pacienteAEliminar, setPacienteAEliminar] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"todos" | "activos" | "pendientes" | "inactivos">("todos");
  const [filterAgeRange, setFilterAgeRange] = useState<string>("todos");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function loadData() {
      // Wait for user authentication before loading data
      if (!user?.id) {
        // Still waiting for AuthGuard to restore session
        return;
      }

      setIsLoading(true);
      try {
        const data = await getPacientesAsync(user.id);
        setPacientes(data);
      } catch (error) {
        console.error("Error loading patients:", error);
        // Fallback to localStorage on error
        setPacientes(getPacientes(user.id));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    const query = searchParams.get("search");
    if (query) setSearchTerm(query);
  }, [user?.id, searchParams]);


  const reloadPacientes = () => {
    if (user?.id) {
      setPacientes(getPacientes(user.id));
    } else {
      setPacientes(getPacientes());
    }
  };

  const allMedidas = useMemo(() => {
    // We can't use getAllMedidas() directly if it's not exported, but we can use getMedidasByPaciente for each
    // or better yet, if we had getAllMedidas. Let's check imports.
    return getAllMedidas();
  }, [pacientes]);

  const allDietas = useMemo(() => getDietas(), [pacientes]);

  const stats = useMemo(() => {
    const counts = { activos: 0, pendientes: 0, inactivos: 0 };
    pacientes.forEach(p => {
      const medidas = allMedidas.filter(m => m.pacienteId === p.id);
      const status = getPatientStatus(medidas, allDietas, p.id);
      if (status === "activo") counts.activos++;
      else if (status === "pendiente") counts.pendientes++;
      else if (status === "inactivo") counts.inactivos++;
    });
    return counts;
  }, [pacientes, allMedidas, allDietas]);

  const filteredPacientes = useMemo(() => {
    return pacientes
      .filter((p) => {
        const term = searchTerm.toLowerCase();
        const nombre = p.datosPersonales?.nombre?.toLowerCase() || "";
        const apellido = p.datosPersonales?.apellido?.toLowerCase() || "";
        const email = p.datosPersonales?.email?.toLowerCase() || "";
        const matchesSearch = nombre.includes(term) || apellido.includes(term) || email.includes(term);

        if (!matchesSearch) return false;

        // Status Filter
        if (filterStatus !== "todos") {
          const medidas = allMedidas.filter(m => m.pacienteId === p.id);
          const status = getPatientStatus(medidas, allDietas, p.id);
          const normalizedFilter = filterStatus === "activos" ? "activo" :
            filterStatus === "pendientes" ? "pendiente" : "inactivo";
          if (status !== normalizedFilter) return false;
        }

        // Age Range Filter
        if (filterAgeRange !== "todos") {
          const age = calculateChronologicalAge(new Date(p.datosPersonales.fechaNacimiento));
          if (filterAgeRange === "lactante" && age >= 2) return false;
          if (filterAgeRange === "pediatrico" && (age < 2 || age >= 12)) return false;
          if (filterAgeRange === "adolescente" && (age < 12 || age >= 18)) return false;
          if (filterAgeRange === "adulto" && (age < 18 || age >= 60)) return false;
          if (filterAgeRange === "geriatrico" && age < 60) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [pacientes, searchTerm, filterStatus, filterAgeRange, allMedidas, allDietas]);

  const totalPacientes = pacientes.length;
  const pacientesActivos = stats.activos;
  const pacientesPendientes = stats.pendientes;
  const pacientesInactivos = stats.inactivos;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-[1400px] animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
              Gestión de <span className="text-[#ff8508]">Pacientes</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Administra tu directorio de pacientes</p>
          </div>

          <Button
            onClick={() => router.push("/pacientes/nuevo")}
            className="gap-2 px-6 h-11 text-[15px] font-semibold rounded-full bg-[#ff8508] hover:bg-[#ff8508]/90 text-white shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] border-0"
          >
            <Plus className="h-5 w-5" /> Nuevo Paciente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-4">
          {/* Total Pacientes */}
          <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm rounded-xl">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{totalPacientes}</h2>
              </div>
            </CardContent>
          </Card>

          {/* Pacientes Activos */}
          <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm rounded-xl">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Activos</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{pacientesActivos}</h2>
              </div>
            </CardContent>
          </Card>

          {/* Pacientes Pendientes */}
          <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm rounded-xl">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pendientes</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{pacientesPendientes}</h2>
              </div>
            </CardContent>
          </Card>

          {/* Pacientes Inactivos */}
          <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm rounded-xl">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Inactivos</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{pacientesInactivos}</h2>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, email..."
              className="pl-12 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full text-base focus:ring-2 focus:ring-[#ff8508]/20 focus:border-[#ff8508] dark:focus:ring-orange-500/20 dark:focus:border-orange-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterStatus("todos")}
                className={cn(
                  "rounded-full px-3 sm:px-5 h-9 font-medium transition-all flex-shrink-0 text-sm",
                  filterStatus === "todos"
                    ? "bg-[#6cba00] text-white shadow-sm hover:bg-[#5aa300] hover:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterStatus("activos")}
                className={cn(
                  "rounded-full px-3 sm:px-5 h-9 font-medium transition-all flex-shrink-0 text-sm",
                  filterStatus === "activos"
                    ? "bg-[#6cba00] text-white shadow-sm hover:bg-[#5aa300] hover:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                Activos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterStatus("pendientes")}
                className={cn(
                  "rounded-full px-3 sm:px-5 h-9 font-medium transition-all flex-shrink-0 text-sm",
                  filterStatus === "pendientes"
                    ? "bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                Pendientes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterStatus("inactivos")}
                className={cn(
                  "rounded-full px-3 sm:px-5 h-9 font-medium transition-all flex-shrink-0 text-sm",
                  filterStatus === "inactivos"
                    ? "bg-slate-500 text-white shadow-sm hover:bg-slate-600 hover:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                Inactivos
              </Button>
            </div>

            {/* Age Range Filter Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-2 hidden lg:inline">Rango Etario:</span>
              {isMounted && (
                <Select value={filterAgeRange} onValueChange={(val) => setFilterAgeRange(val)}>
                  <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-[#ff8508]/20 focus:border-[#ff8508] transition-all">
                    <SelectValue placeholder="Filtrar por edad" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                    <SelectItem value="todos">Todos los rangos</SelectItem>
                    <SelectItem value="lactante">Lactante (&lt; 2 años)</SelectItem>
                    <SelectItem value="pediatrico">Pediátrico (2 - 11 años)</SelectItem>
                    <SelectItem value="adolescente">Adolescente (12 - 17 años)</SelectItem>
                    <SelectItem value="adulto">Adulto (18 - 59 años)</SelectItem>
                    <SelectItem value="geriatrico">Adulto Mayor (≥ 60 años)</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {!isMounted && (
                <div className="w-full md:w-[240px] h-10 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Table Header - Matches PatientRow structure exactly */}
        <div className="hidden md:flex items-center gap-6 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {/* Avatar + Name column */}
          <div className="flex items-center gap-4 flex-1 min-w-[280px]">
            <div className="w-10 md:w-12 shrink-0"></div>
            <span>PACIENTE</span>
          </div>
          {/* Phone column */}
          <div className="hidden md:flex min-w-[140px]">CONTACTO</div>
          {/* Status column */}
          <div className="min-w-[100px]">ESTADO</div>
          {/* Last visit column */}
          <div className="flex-1 min-w-[120px]">ÚLTIMA VISITA</div>
          {/* Actions + Chevron */}
          <div className="w-14"></div>
        </div>

        {/* Patient List */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : filteredPacientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No se encontraron pacientes</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-center">
                Comienza agregando tu primer paciente para ver sus estadísticas aquí.
              </p>
              <Button
                onClick={() => router.push("/pacientes/nuevo")}
                className="h-12 px-8 rounded-full bg-[#6cba00] hover:bg-[#5aa300] text-white font-semibold shadow-lg shadow-green-500/20"
              >
                <Plus className="w-5 h-5 mr-2" /> Agregar Paciente
              </Button>
            </div>
          ) : (
            filteredPacientes.map((paciente) => (
              <PatientRow
                key={paciente.id}
                paciente={paciente}
                onDelete={() => {
                  setPacienteAEliminar(paciente.id);
                  setIsDeleteDialogOpen(true);
                }}
                onClick={() => router.push(`/pacientes/${paciente.id}`)}
                dietas={allDietas}
              />
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            // Safety cleanup when dialog closes
            setTimeout(() => {
              document.body.style.pointerEvents = "";
              document.body.style.overflow = "";
            }, 50);
          }
        }}
      >
        <DialogContent className="rounded-2xl dark:bg-slate-800 dark:border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">¿Eliminar paciente?</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Esta acción es irreversible. Se eliminará el historial completo del paciente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const idToDelete = pacienteAEliminar;
                // 1. Close dialog immediately
                setIsDeleteDialogOpen(false);

                // 2. Process deletion after animation time (300ms)
                // This ensures the dialog is fully unmounted and Radix has cleaned up
                setTimeout(() => {
                  // FORCE CLEANUP of any residual styles from Radix
                  document.body.style.pointerEvents = "";
                  document.body.style.overflow = "";

                  if (idToDelete) {
                    if (currentPatientId === idToDelete) {
                      clearPatient();
                    }
                    deletePaciente(idToDelete);
                    reloadPacientes();
                    setPacienteAEliminar(null);
                  }
                }, 300);
              }}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PacientesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] p-8">
        <div className="space-y-3 max-w-[1400px] mx-auto">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    }>
      <PacientesContent />
    </Suspense>
  );
}