"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, User, Mail, Phone, Calendar, Camera, Upload, Check } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Logic - Use centralized store
import { usePatientStore } from "@/store/usePatientStore";
import type { Paciente } from "@/types";

// Esquema de validación simplificado para edición
const editSchema = z.object({
  nombre: z.string().min(2, "El nombre es muy corto"),
  apellido: z.string().min(2, "El apellido es muy corto"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Fecha inválida",
  }),
});

type EditFormValues = z.infer<typeof editSchema>;

// Avatares predefinidos con emojis
const AVATAR_OPTIONS = [
  { id: "avatar-1", emoji: "👤", label: "Persona" },
  { id: "avatar-2", emoji: "👨", label: "Hombre" },
  { id: "avatar-3", emoji: "👩", label: "Mujer" },
  { id: "avatar-4", emoji: "👴", label: "Adulto Mayor" },
  { id: "avatar-5", emoji: "👵", label: "Adulta Mayor" },
  { id: "avatar-6", emoji: "🧑‍⚕️", label: "Profesional Salud" },
  { id: "avatar-7", emoji: "🏃", label: "Deportista" },
  { id: "avatar-8", emoji: "🏋️", label: "Fitness" },
  { id: "avatar-9", emoji: "🧘", label: "Yoga" },
  { id: "avatar-10", emoji: "🚴", label: "Ciclista" },
];

// Función para calcular edad
const calcularEdad = (fecha: string): number => {
  if (!fecha) return 0;
  const hoy = new Date();
  const nacimiento = new Date(fecha);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

export default function EditarPacientePage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use centralized patient store
  const {
    patient: paciente,
    isLoading: loading,
    loadPatient,
    updateDatosPersonales
  } = usePatientStore();

  // Avatar state
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string | null>(null);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { nombre: "", apellido: "", email: "", telefono: "", fechaNacimiento: "" }
  });

  // Watch fecha para calcular edad en tiempo real
  const fechaNacimiento = form.watch("fechaNacimiento");
  const edadCalculada = calcularEdad(fechaNacimiento);

  // 1. Cargar datos existentes usando el store
  useEffect(() => {
    if (params.id) {
      loadPatient(params.id as string);
    }
  }, [params.id, loadPatient]);

  // 2. Rellenar el formulario cuando el paciente se cargue
  useEffect(() => {
    if (paciente) {
      form.reset({
        nombre: paciente.datosPersonales.nombre,
        apellido: paciente.datosPersonales.apellido,
        email: paciente.datosPersonales.email || "",
        telefono: paciente.datosPersonales.telefono || "",
        fechaNacimiento: (typeof paciente.datosPersonales.fechaNacimiento === 'string'
          ? paciente.datosPersonales.fechaNacimiento
          : new Date(paciente.datosPersonales.fechaNacimiento).toISOString()
        ).split('T')[0],
      });
      // Load existing avatar
      if (paciente.datosPersonales.avatarUrl) {
        if (paciente.datosPersonales.avatarUrl.startsWith('avatar-')) {
          setSelectedAvatar(paciente.datosPersonales.avatarUrl);
        } else {
          setCustomPhotoPreview(paciente.datosPersonales.avatarUrl);
        }
      }
    }
  }, [paciente, form]);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCustomPhotoPreview(base64);
        setSelectedAvatar(""); // Clear icon selection
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. Guardar cambios usando el store (se sincroniza automáticamente)
  const onSubmit = (data: EditFormValues) => {
    if (!paciente) return;

    // Determine avatar URL
    let avatarUrl = "";
    if (customPhotoPreview) {
      avatarUrl = customPhotoPreview;
    } else if (selectedAvatar) {
      avatarUrl = selectedAvatar;
    }

    // Update through the centralized store
    updateDatosPersonales({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email || "",
      telefono: data.telefono,
      fechaNacimiento: new Date(data.fechaNacimiento).toISOString(),
      avatarUrl: avatarUrl,
    });

    // Navigate back - the data is already synced everywhere
    router.push(`/pacientes/${paciente.id}`);
  };

  // Get current avatar display
  const getCurrentAvatarDisplay = () => {
    if (customPhotoPreview) {
      return <img src={customPhotoPreview} alt="Avatar" className="w-full h-full object-cover" />;
    }
    if (selectedAvatar) {
      const avatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatar);
      return <span className="text-4xl">{avatar?.emoji || "👤"}</span>;
    }
    if (paciente) {
      return <span className="text-4xl font-bold text-[#6cba00]">{paciente.datosPersonales.nombre[0]}{paciente.datosPersonales.apellido[0]}</span>;
    }
    return <User className="w-12 h-12 text-slate-400" />;
  };

  if (loading) return <div className="p-10 text-center">Cargando datos...</div>;

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Información</h1>
          <p className="text-muted-foreground">Actualiza los datos de contacto o corrige errores.</p>
        </div>
      </div>

      {/* Avatar Selection Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> Foto o Avatar
          </CardTitle>
          <CardDescription>Selecciona un icono o sube una foto del paciente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Avatar Preview */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6cba00]/20 to-[#6cba00]/5 border-4 border-[#6cba00]/30 flex items-center justify-center overflow-hidden">
              {getCurrentAvatarDisplay()}
            </div>
          </div>

          {/* Upload Photo Button */}
          <div className="flex justify-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Subir Foto
            </Button>
          </div>

          {/* Avatar Icons Grid */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">O selecciona un icono:</p>
            <div className="grid grid-cols-5 gap-3">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(avatar.id);
                    setCustomPhotoPreview(null); // Clear photo
                  }}
                  className={`
                    relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                    transition-all duration-200 hover:scale-110
                    ${selectedAvatar === avatar.id
                      ? 'bg-[#6cba00]/20 border-2 border-[#6cba00] ring-2 ring-[#6cba00]/30'
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#6cba00]/50'
                    }
                  `}
                  title={avatar.label}
                >
                  {avatar.emoji}
                  {selectedAvatar === avatar.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#6cba00] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Selection */}
          {(selectedAvatar || customPhotoPreview) && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={customPhotoPreview ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-slate-500"}
                onClick={() => {
                  setSelectedAvatar("");
                  setCustomPhotoPreview(null);
                }}
              >
                {customPhotoPreview ? "🗑️ Eliminar foto" : "Usar iniciales por defecto"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="apellido" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Mail className="w-3 h-3" /> Email</FormLabel>
                    <FormControl><Input {...field} placeholder="ejemplo@correo.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="telefono" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Phone className="w-3 h-3" /> Teléfono</FormLabel>
                    <FormControl><Input {...field} placeholder="+51..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="fechaNacimiento" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Fecha de Nacimiento</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    {fechaNacimiento && (
                      <p className="text-xs text-slate-500 mt-1">
                        Edad: <span className="font-semibold text-[#6cba00]">{edadCalculada} años</span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" className="gap-2 bg-primary">
                  <Save className="w-4 h-4" /> Guardar Cambios
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}