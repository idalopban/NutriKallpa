"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, User, Mail, Phone, Calendar, Camera, Upload, Check, ChevronRight, X } from "lucide-react";
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
  direccion: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// Avatares predefinidos con imágenes
const AVATAR_OPTIONS = [
  { id: "avatar-1", image: "/perfil/bebe_nino.png", label: "Bebé Niño" },
  { id: "avatar-2", image: "/perfil/bebe_nina.png", label: "Bebé Niña" },
  { id: "avatar-3", image: "/perfil/nino.png", label: "Niño" },
  { id: "avatar-4", image: "/perfil/nina.png", label: "Niña" },
  { id: "avatar-5", image: "/perfil/adulto.png", label: "Adulto" },
  { id: "avatar-6", image: "/perfil/adulta.png", label: "Adulta" },
  { id: "avatar-7", image: "/perfil/adulto_mayor.png", label: "Adulto Mayor" },
  { id: "avatar-8", image: "/perfil/adulta_mayor.png", label: "Adulta Mayor" },
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
    defaultValues: { nombre: "", apellido: "", email: "", telefono: "", fechaNacimiento: "", direccion: "" }
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

  // Track initialization to prevent overwriting user edits on background sync
  const initializedRef = useRef(false);
  const lastPatientIdRef = useRef<string | null>(null);

  // 2. Rellenar el formulario cuando el paciente se cargue (solo una vez)
  useEffect(() => {
    if (paciente) {
      // Reset initialization if patient ID changes
      if (lastPatientIdRef.current !== paciente.id) {
        initializedRef.current = false;
        lastPatientIdRef.current = paciente.id;
      }

      if (!initializedRef.current) {
        form.reset({
          nombre: paciente.datosPersonales.nombre,
          apellido: paciente.datosPersonales.apellido,
          email: paciente.datosPersonales.email || "",
          telefono: paciente.datosPersonales.telefono || "",
          fechaNacimiento: (typeof paciente.datosPersonales.fechaNacimiento === 'string'
            ? paciente.datosPersonales.fechaNacimiento
            : new Date(paciente.datosPersonales.fechaNacimiento).toISOString()
          ).split('T')[0],
          direccion: (paciente.datosPersonales as any).direccion || "",
        });

        // Load existing avatar
        if (paciente.datosPersonales.avatarUrl) {
          if (paciente.datosPersonales.avatarUrl.startsWith('avatar-')) {
            setSelectedAvatar(paciente.datosPersonales.avatarUrl);
            setCustomPhotoPreview(null);
          } else {
            setCustomPhotoPreview(paciente.datosPersonales.avatarUrl);
            setSelectedAvatar("");
          }
        } else {
          // Reset if no avatar
          setCustomPhotoPreview(null);
          setSelectedAvatar("");
        }

        initializedRef.current = true;
      }
    }
  }, [paciente, form]);

  // Handle file upload with client-side compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setCustomPhotoPreview(compressedBase64);
          setSelectedAvatar(""); // Clear icon selection
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle delete photo
  const handleDeletePhoto = () => {
    setCustomPhotoPreview(null);
    setSelectedAvatar("");
  };

  // 3. Guardar cambios usando el store (se sincroniza automáticamente)
  const onSubmit = async (data: EditFormValues) => {
    if (!paciente) return;

    // Determine avatar URL
    let avatarUrl = "";
    if (customPhotoPreview) {
      avatarUrl = customPhotoPreview;
    } else if (selectedAvatar) {
      avatarUrl = selectedAvatar;
    }

    // Update through the centralized store - AWAIT to ensure save completes
    await updateDatosPersonales({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email || "",
      telefono: data.telefono,
      fechaNacimiento: new Date(data.fechaNacimiento).toISOString(),
      avatarUrl: avatarUrl,
      direccion: data.direccion,
    } as any);

    // Navigate back AFTER the data is synced
    router.push(`/pacientes/${paciente.id}`);
  };

  // Get current avatar display
  const getCurrentAvatarDisplay = () => {
    if (customPhotoPreview) {
      return <img src={customPhotoPreview} alt="Avatar" className="w-full h-full object-cover" />;
    }
    if (selectedAvatar) {
      const avatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatar);
      return avatar?.image ? <img src={avatar.image} alt={avatar.label} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-slate-400" />;
    }
    if (paciente) {
      return <span className="text-5xl font-bold text-[#6cba00]">{paciente.datosPersonales.nombre[0]}{paciente.datosPersonales.apellido[0]}</span>;
    }
    return <User className="w-16 h-16 text-slate-400" />;
  };

  if (loading) return <div className="p-10 text-center">Cargando datos...</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-12">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* STICKY HEADER - Full Width Style */}
          <div className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="container max-w-[1600px] mx-auto h-20 flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </Button>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="text-lg">Mi perfil</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Editar Perfil</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  className="bg-[#6cba00] hover:bg-[#5da000] text-white rounded-full px-8 h-12 gap-2 shadow-lg shadow-[#6cba00]/20 font-bold text-base"
                >
                  Guardar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="container max-w-[1600px] mx-auto px-6 animate-in fade-in slide-in-from-bottom-4">

            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">

              {/* LEFT SIDE: Avatar & Basic Info */}
              <div className="space-y-6">
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-8 flex flex-col items-center gap-6">
                  {/* Circular Avatar */}
                  <div className="relative group">
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[#6cba00]/10 to-[#6cba00]/5 border-8 border-slate-50 dark:border-slate-800 shadow-xl flex items-center justify-center overflow-hidden transition-transform duration-300">
                      {getCurrentAvatarDisplay()}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 p-3 bg-[#6cba00] text-white rounded-full border-4 border-white dark:border-slate-900 shadow-lg hover:scale-110 transition-transform"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    {/* Delete photo button */}
                    {(customPhotoPreview || selectedAvatar) && (
                      <button
                        type="button"
                        onClick={handleDeletePhoto}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full border-4 border-white dark:border-slate-900 shadow-lg hover:scale-110 transition-transform hover:bg-red-600"
                        title="Eliminar foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Icon Selection Grid */}
                  <div className="w-full space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Selecciona un Icono</p>
                    <div className="grid grid-cols-5 gap-3">
                      {AVATAR_OPTIONS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatar(avatar.id);
                            setCustomPhotoPreview(null);
                          }}
                          className={`
                            relative aspect-square rounded-xl flex items-center justify-center text-2xl
                            transition-all duration-300 hover:scale-110
                            ${selectedAvatar === avatar.id
                              ? 'bg-[#6cba00]/10 border-2 border-[#6cba00]'
                              : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800'
                            }
                          `}
                        >
                          <img src={avatar.image} alt={avatar.label} className="w-full h-full object-contain p-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Basic Fields on Left (Mimicking Image) */}
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-8 space-y-6">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Nombre</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all focus:ring-1 focus:ring-[#6cba00]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="apellido" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Apellido</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all focus:ring-1 focus:ring-[#6cba00]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </Card>
              </div>

              {/* RIGHT SIDE: Detailed Info Grid */}
              <div className="space-y-6">
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                    {/* PERSONAL DATA GROUP */}
                    <div className="space-y-6">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Correo Electrónico</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="correo@dominio.com"
                              className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="telefono" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Número de Teléfono</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="+51 999 999 999"
                              className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* DATES & CLINICAL GROUP */}
                    <div className="space-y-6">
                      <FormField control={form.control} name="fechaNacimiento" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Fecha de Nacimiento</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all"
                            />
                          </FormControl>
                          {fechaNacimiento && (
                            <div className="mt-2 text-right">
                              <span className="text-xs font-bold text-[#6cba00] bg-[#6cba00]/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                                {edadCalculada} años de edad
                              </span>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* ADDRESS GROUP (Placeholders like in image) */}
                    <div className="md:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <FormField control={form.control} name="direccion" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Dirección Residencial</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Calle 123, Ciudad, País"
                                className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                  </div>
                </Card>
              </div>

            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
