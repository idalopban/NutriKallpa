"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  MapPin,
  Video,
  MoreHorizontal,
  Search,
  Filter,
  Check
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
  set,
  startOfHour,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  endOfWeek
} from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Storage
import { getPacientes, getPacientesAsync, getCitas, getCitasAsync, saveCita, deleteCita } from "@/lib/storage";
import { useAuthStore } from "@/store/useAuthStore";
import type { Cita, Paciente } from "@/types";

export default function AgendaView() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());

  // View Control
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [filters, setFilters] = useState({
    consultas: true,
    controles: true,
    antropometria: true
  });

  // Data
  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timeLineRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now);

      if (timeLineRef.current) {
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const startHour = 7;
        const hourHeight = 80;
        if (currentHour >= startHour && currentHour <= 22) {
          const topPosition = (currentHour - startHour) * hourHeight + (currentMinutes / 60) * hourHeight;
          timeLineRef.current.style.top = `${topPosition}px`;
        }
      }
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Dialog states
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    pacienteId: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    hora: "09:00",
    motivo: "",
    modalidad: "presencial" as "presencial" | "virtual",
    enlaceReunion: "",
    categoria: "trabajo" as "trabajo" | "personal" | "urgente" | undefined
  });

  // Load data
  const loadData = async () => {
    if (!user?.id) return;
    try {
      const misPacientes = await getPacientesAsync(user.id);
      setPacientes(misPacientes);

      const misCitas = await getCitasAsync();
      // Filter for current user's patients or personal items
      const filteredCitas = misCitas.filter(cita =>
        misPacientes.some(p => p.id === cita.pacienteId) ||
        cita.categoria === 'personal' ||
        !cita.pacienteId
      );
      setCitas(filteredCitas);
    } catch (error) {
      console.error("Error loading agenda data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);


  // Auto-open dialog when paciente param is present in URL (only once)
  const hasOpenedFromUrl = useRef(false);
  useEffect(() => {
    const pacienteIdFromUrl = searchParams.get("paciente");
    if (pacienteIdFromUrl && pacientes.length > 0 && !hasOpenedFromUrl.current) {
      // Verify the patient exists in our list
      const pacienteExists = pacientes.some(p => p.id === pacienteIdFromUrl);
      if (pacienteExists) {
        setFormData(prev => ({
          ...prev,
          pacienteId: pacienteIdFromUrl
        }));
        setIsNewDialogOpen(true);
        hasOpenedFromUrl.current = true;
      }
    }
  }, [searchParams, pacientes]);

  // Derived filtered citas
  const filteredCitas = useMemo(() => {
    return citas.filter(cita => {
      const m = cita.motivo.toLowerCase();
      let type = 'other';

      if (m.includes("consulta") || m.includes("general") || m.includes("trabajo")) type = 'consultas';
      else if (m.includes("control") || m.includes("seguimiento") || m.includes("feedback")) type = 'controles';
      else if (m.includes("antropometr") || m.includes("check")) type = 'antropometria';

      switch (type) {
        case 'consultas': return filters.consultas;
        case 'controles': return filters.controles;
        case 'antropometria': return filters.antropometria;
        default: return true;
      }
    });
  }, [citas, filters]);

  // CRUD Operations
  const handleCreateCita = () => {
    // Para notas personales y urgentes, el paciente es opcional
    const requiresPatient = formData.categoria === 'trabajo';
    if ((requiresPatient && !formData.pacienteId) || !formData.fecha || !formData.hora) {
      toast.error("Complete los campos requeridos");
      return;
    }

    const nuevaCita: Cita = {
      id: crypto.randomUUID(),
      pacienteId: formData.pacienteId,
      fecha: formData.fecha,
      hora: formData.hora,
      motivo: formData.motivo || "Consulta General",
      estado: "pendiente",
      modalidad: formData.modalidad,
      enlaceReunion: formData.modalidad === "virtual" ? formData.enlaceReunion : undefined,
      categoria: formData.categoria,
      createdAt: new Date().toISOString()
    };

    saveCita(nuevaCita);
    toast.success("Cita creada");
    setIsNewDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleUpdateCita = () => {
    if (!selectedCita || !formData.pacienteId) return;

    const updatedCita: Cita = {
      ...selectedCita,
      pacienteId: formData.pacienteId,
      fecha: formData.fecha,
      hora: formData.hora,
      motivo: formData.motivo,
      modalidad: formData.modalidad,
      enlaceReunion: formData.modalidad === "virtual" ? formData.enlaceReunion : undefined,
      categoria: formData.categoria,
      updatedAt: new Date().toISOString()
    };

    saveCita(updatedCita);
    toast.success("Cita actualizada");
    setIsEditDialogOpen(false);
    setSelectedCita(null);
    resetForm();
    loadData();
  };

  const handleDeleteCita = (id: string) => {
    deleteCita(id);
    toast.success("Cita eliminada");
    loadData();
  };

  const resetForm = () => {
    setFormData({
      pacienteId: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      hora: "09:00",
      motivo: "",
      modalidad: "presencial",
      enlaceReunion: "",
      categoria: "trabajo"
    });
  };

  const openNewDialog = (date?: Date, hour?: number) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        fecha: format(date, "yyyy-MM-dd"),
        hora: hour ? `${hour.toString().padStart(2, "0")}:00` : "09:00"
      }));
    }
    setIsNewDialogOpen(true);
  };

  const openEditDialog = (cita: Cita) => {
    setSelectedCita(cita);
    setFormData({
      pacienteId: cita.pacienteId,
      fecha: cita.fecha,
      hora: cita.hora,
      motivo: cita.motivo,
      modalidad: cita.modalidad || "presencial",
      enlaceReunion: cita.enlaceReunion || "",
      categoria: cita.categoria || "trabajo"
    });
    setIsEditDialogOpen(true);
  };

  // Event styles with top border color bar (matching reference design)
  const getEventStyle = (cita: Cita) => {
    // Priority to specific Category if present
    if (cita.categoria === "trabajo") return "bg-emerald-100 dark:bg-emerald-900/40 border-t-4 border-emerald-500 text-slate-700 dark:text-slate-200 hover:shadow-md";
    if (cita.categoria === "personal") return "bg-purple-100 dark:bg-purple-900/40 border-t-4 border-purple-500 text-slate-700 dark:text-slate-200 hover:shadow-md";
    if (cita.categoria === "urgente") return "bg-orange-100 dark:bg-orange-900/40 border-t-4 border-orange-500 text-slate-700 dark:text-slate-200 hover:shadow-md";

    // Fallback to Motive Logic if no category
    const m = cita.motivo.toLowerCase();
    if (m.includes("antropometr")) return "bg-orange-100 dark:bg-orange-900/40 border-t-4 border-orange-500 text-slate-700 dark:text-slate-200 hover:shadow-md";
    if (m.includes("control")) return "bg-blue-100 dark:bg-blue-900/40 border-t-4 border-blue-500 text-slate-700 dark:text-slate-200 hover:shadow-md";

    return "bg-slate-100 dark:bg-slate-800/60 border-t-4 border-slate-400 text-slate-700 dark:text-slate-200 hover:shadow-md";
  };

  // Grid Helpers
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) });

  return (
    <div className="flex h-full bg-background rounded-3xl overflow-hidden gap-4 p-4 md:p-0">

      {/* LEFT SIDEBAR (Inner) */}
      <div className="hidden xl:flex flex-col w-[220px] bg-background border border-slate-100 dark:border-slate-800 rounded-3xl p-4 gap-6 ml-8">
        {/* Date Nav */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold capitalize text-slate-800 dark:text-slate-100">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(subWeeks(currentDate, 4))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentDate(addWeeks(currentDate, 4))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <MiniCalendar currentDate={currentDate} onSelectDate={setCurrentDate} />

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Mis Calendarios</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox id="cal-consultas" checked={filters.consultas} onCheckedChange={(c: boolean | "indeterminate") => setFilters(prev => ({ ...prev, consultas: c === true }))} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
              <Label htmlFor="cal-consultas" className="text-sm font-medium text-slate-700 dark:text-slate-300">Consultas</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="cal-controles" checked={filters.controles} onCheckedChange={(c: boolean | "indeterminate") => setFilters(prev => ({ ...prev, controles: c === true }))} className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
              <Label htmlFor="cal-controles" className="text-sm font-medium text-slate-700 dark:text-slate-300">Controles</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="cal-antro" checked={filters.antropometria} onCheckedChange={(c: boolean | "indeterminate") => setFilters(prev => ({ ...prev, antropometria: c === true }))} className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
              <Label htmlFor="cal-antro" className="text-sm font-medium text-slate-700 dark:text-slate-300">Antropometría</Label>
            </div>
          </div>
        </div>

        {/* Categories Legend */}
        <div className="space-y-4">
          <div className="flex items-center justify-between cursor-pointer">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Categorías</h3>
          </div>
          <div className="space-y-3 pl-1">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Trabajo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Personal</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Urgente</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 mx-4">

        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                Agenda <span className="text-[#ff8508]">de Citas</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm capitalize">
                {format(currentDate, "MMMM yyyy", { locale: es })}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs font-semibold px-3 h-7">Hoy</Button>
              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subWeeks(currentDate, 4))}> <ChevronLeft className="w-4 h-4" /> </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addWeeks(currentDate, 4))}> <ChevronRight className="w-4 h-4" /> </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <Button variant="ghost" size="sm" onClick={() => setViewMode("week")} className={cn("shadow-sm h-8 rounded-lg text-xs font-semibold", viewMode === 'week' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500")}>Semana</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewMode("month")} className={cn("shadow-sm h-8 rounded-lg text-xs font-semibold", viewMode === 'month' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-500")}>Mes</Button>
            </div>
            <Button onClick={() => setIsNewDialogOpen(true)} className="bg-[#ff8508] hover:bg-[#ff7b00] text-white rounded-full px-6 shadow-lg shadow-orange-200 dark:shadow-none transition-all hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5 mr-2" />
              Crear Cita
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto relative">
          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="min-w-[800px] h-full flex flex-col">
              <div className="grid grid-cols-[50px_repeat(7,1fr)] bg-white dark:bg-[#0f172a] sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 border-r border-slate-100 dark:border-slate-800 op-50 text-xs text-slate-400 font-medium pt-6">GMT-5</div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className={cn("p-2 text-center border-r border-slate-100 dark:border-slate-800 relative group", isToday(day) ? "bg-slate-50/50" : "")}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{format(day, "EEE", { locale: es })}</span>
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center mx-auto text-sm font-bold transition-all", isToday(day) ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" : "text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-800")}>{format(day, "d")}</div>
                  </div>
                ))}
              </div>

              <div className="flex-1 relative">
                {/* Dynamic Current Time Line */}
                {(() => {
                  const currentHour = currentTime.getHours();
                  const currentMinutes = currentTime.getMinutes();
                  // Each hour row is 120px high, hours start at 8 (index 0)
                  // Calculate position: (hour - 8) * 120 + (minutes / 60) * 120
                  const startHour = 7;
                  const hourHeight = 80;
                  if (currentHour >= startHour && currentHour <= 22) {
                    const topPosition = (currentHour - startHour) * hourHeight + (currentMinutes / 60) * hourHeight;
                    return (
                      <div
                        ref={timeLineRef}
                        className="absolute left-[60px] right-0 z-10 pointer-events-none flex items-center transition-all duration-1000"
                      >
                        <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 ring-2 ring-white dark:ring-slate-900 shadow-lg" />
                        <div className="h-[2px] bg-red-500 flex-1 opacity-60" />
                        <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">Ahora</div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] min-h-[80px]">
                    <div className="p-1 text-[10px] font-medium text-slate-400 text-right pr-2 pt-0 -mt-2 relative">{hour === 7 ? '' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</div>
                    {weekDays.map((day) => {
                      const dayAppointments = filteredCitas.filter(apt => isSameDay(parseISO(apt.fecha), day) && parseInt(apt.hora.split(":")[0]) === hour);
                      return (
                        <div key={`${day.toISOString()}-${hour}`} className="border-r border-b border-slate-50 dark:border-slate-800/80 p-0.5 relative hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors group" onClick={() => openNewDialog(day, hour)}>
                          {dayAppointments.map((apt) => {
                            // Get patient initials for avatar
                            const paciente = pacientes.find(p => p.id === apt.pacienteId);
                            const initials = paciente
                              ? `${paciente.datosPersonales.nombre.charAt(0)}${paciente.datosPersonales.apellido.charAt(0)}`.toUpperCase()
                              : '';

                            // Determine type label
                            const getTypeLabel = () => {
                              if (apt.categoria === "personal") return "Personal";
                              if (apt.categoria === "urgente") return "Urgente";
                              const m = apt.motivo.toLowerCase();
                              if (m.includes("consulta")) return "Consulta";
                              if (m.includes("control")) return "Control";
                              if (m.includes("antropometr")) return "Antropometría";
                              return "Nota";
                            };

                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => { e.stopPropagation(); openEditDialog(apt); }}
                                className={cn(
                                  "p-2.5 mb-1 mx-0.5 text-xs shadow-sm cursor-pointer transition-all relative z-10 min-h-[60px] flex flex-col",
                                  getEventStyle(apt)
                                )}
                              >
                                <span className="text-[9px] font-semibold opacity-60 uppercase tracking-wide">{getTypeLabel()}</span>
                                <p className="font-bold truncate text-[12px] mt-0.5">{apt.motivo}</p>
                                {paciente && (
                                  <div className="absolute bottom-2 right-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-600 shadow-sm flex items-center justify-center">
                                      <span className="text-[8px] font-bold text-slate-600 dark:text-slate-200">{initials}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="h-full flex flex-col min-w-[800px]">
              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => <div key={d} className="p-3 text-center text-sm font-semibold text-slate-500">{d}</div>)}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-white dark:bg-[#0f172a]">
                {monthDays.map((day) => {
                  const isCurrentMonth = isSameDay(day, set(day, { month: currentDate.getMonth() }));
                  const dayApts = filteredCitas.filter(a => isSameDay(parseISO(a.fecha), day));
                  return (
                    <div key={day.toISOString()} className={cn("border-r border-b border-slate-100 dark:border-slate-800 p-2 min-h-[100px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20", !isCurrentMonth && "bg-slate-50/50 dark:bg-slate-900/30 opacity-50")} onClick={() => openNewDialog(day)}>
                      <div className={cn("text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ml-auto", isToday(day) ? "bg-[#6cba00] text-white shadow-sm" : "text-slate-700 dark:text-slate-300")}>{format(day, "d")}</div>
                      <div className="space-y-1">
                        {dayApts.slice(0, 3).map(apt => (
                          <div key={apt.id} onClick={(e) => { e.stopPropagation(); openEditDialog(apt) }} className={cn("text-[10px] truncate px-1.5 py-0.5 rounded border-l-2 cursor-pointer", getEventStyle(apt))}>
                            {apt.hora} {apt.motivo}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{formData.categoria === 'personal' ? 'Nueva Nota Personal' : 'Nueva Cita'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Category Selector - FIRST */}
            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.categoria === 'trabajo' ? 'default' : 'outline'}
                  className={cn("flex-1 text-xs", formData.categoria === 'trabajo' && "bg-emerald-500 hover:bg-emerald-600")}
                  onClick={() => setFormData({ ...formData, categoria: 'trabajo' })}
                >
                  Trabajo
                </Button>
                <Button
                  type="button"
                  variant={formData.categoria === 'personal' ? 'default' : 'outline'}
                  className={cn("flex-1 text-xs", formData.categoria === 'personal' && "bg-purple-500 hover:bg-purple-600")}
                  onClick={() => setFormData({ ...formData, categoria: 'personal', pacienteId: '' })}
                >
                  Personal
                </Button>
                <Button
                  type="button"
                  variant={formData.categoria === 'urgente' ? 'default' : 'outline'}
                  className={cn("flex-1 text-xs", formData.categoria === 'urgente' && "bg-orange-500 hover:bg-orange-600")}
                  onClick={() => setFormData({ ...formData, categoria: 'urgente' })}
                >
                  Urgente
                </Button>
              </div>
            </div>

            {/* Patient Selector - Optional for personal/urgente, required for trabajo */}
            <div className="space-y-2">
              <Label>
                Paciente
                {formData.categoria !== 'trabajo' && <span className="text-xs text-slate-400 ml-1">(opcional)</span>}
              </Label>
              <Select value={formData.pacienteId} onValueChange={(value) => setFormData({ ...formData, pacienteId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={formData.categoria === 'trabajo' ? 'Seleccionar paciente' : 'Sin paciente (opcional)'} />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.datosPersonales.nombre} {p.datosPersonales.apellido}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} /></div>
              <div className="space-y-2"><Label>Hora</Label><Input type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} /></div>
            </div>

            {/* Motivo/Nota - label changes based on category */}
            <div className="space-y-2">
              <Label>{formData.categoria === 'personal' ? 'Nota' : 'Motivo'}</Label>
              <Input
                placeholder={formData.categoria === 'personal' ? 'Ej. Recordatorio, tarea pendiente...' : 'Ej. Consulta General'}
                value={formData.motivo}
                onChange={e => setFormData({ ...formData, motivo: e.target.value })}
              />
            </div>

            {/* Modalidad - ONLY if NOT personal */}
            {formData.categoria !== 'personal' && (
              <div className="space-y-2"><Label>Modalidad</Label><Select value={formData.modalidad} onValueChange={(value: any) => setFormData({ ...formData, modalidad: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="virtual">Virtual</SelectItem></SelectContent></Select></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCita} className="bg-[#6cba00] hover:bg-[#5da300]">
              {formData.categoria === 'personal' ? 'Guardar Nota' : 'Guardar Cita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Editar Cita</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Paciente</Label><Select value={formData.pacienteId} onValueChange={(value) => setFormData({ ...formData, pacienteId: value })}><SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger><SelectContent>{pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.datosPersonales.nombre} {p.datosPersonales.apellido}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} /></div>
              <div className="space-y-2"><Label>Hora</Label><Input type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Motivo</Label><Input placeholder="Ej. Consulta General" value={formData.motivo} onChange={e => setFormData({ ...formData, motivo: e.target.value })} /></div>

            {/* Category Selector Edit */}
            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.categoria === 'trabajo' ? 'default' : 'outline'}
                  className={cn("flex-1 text-xs", formData.categoria === 'trabajo' && "bg-emerald-500 hover:bg-emerald-600")}
                  onClick={() => setFormData({ ...formData, categoria: 'trabajo' })}
                >
                  Trabajo
                </Button>
                <Button
                  type="button"
                  variant={formData.categoria === 'personal' ? 'default' : 'outline'}
                  className={cn("flex-1 text-xs", formData.categoria === 'personal' && "bg-purple-500 hover:bg-purple-600")}
                  onClick={() => setFormData({ ...formData, categoria: 'personal' })}
                >
                  Personal
                </Button>
                <Button
                  type="button"
                  variant={formData.categoria === 'urgente' ? 'default' : 'outline'}
                  className={cn("flex-1 text-xs", formData.categoria === 'urgente' && "bg-orange-500 hover:bg-orange-600")}
                  onClick={() => setFormData({ ...formData, categoria: 'urgente' })}
                >
                  Urgente
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="destructive" onClick={() => { if (selectedCita) { handleDeleteCita(selectedCita.id); setIsEditDialogOpen(false); } }} className="mr-auto">Eliminar</Button><Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button><Button onClick={handleUpdateCita} className="bg-[#6cba00] hover:bg-[#5da300]">Actualizar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mini Calendar 
function MiniCalendar({ currentDate, onSelectDate }: { currentDate: Date, onSelectDate: (d: Date) => void }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDay = getDay(monthStart);
  const padding = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null);

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 text-center mb-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="text-xs font-medium text-slate-400">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-2">
        {padding.map((_, i) => <div key={i} />)}
        {days.map(day => (
          <button key={day.toISOString()} onClick={() => onSelectDate(day)} className={cn("w-8 h-8 rounded-full text-xs flex items-center justify-center mx-auto transition-all", isToday(day) ? "bg-[#ff8508] text-white font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300", isSameDay(day, currentDate) && !isToday(day) && "bg-slate-900 text-white dark:bg-white dark:text-slate-900")}>
            {format(day, "d")}
          </button>
        ))}
      </div>
    </div>
  )
}