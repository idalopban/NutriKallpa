"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, User, Mail, Phone, Calendar } from "lucide-react";
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

  // Use centralized patient store
  const {
    patient: paciente,
    isLoading: loading,
    loadPatient,
    updateDatosPersonales
  } = usePatientStore();

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
    }
  }, [paciente, form]);

  // 3. Guardar cambios usando el store (se sincroniza automáticamente)
  const onSubmit = (data: EditFormValues) => {
    if (!paciente) return;

    // Update through the centralized store
    updateDatosPersonales({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email || "",
      telefono: data.telefono,
      fechaNacimiento: new Date(data.fechaNacimiento).toISOString(),
    });

    // Navigate back - the data is already synced everywhere
    router.push(`/pacientes/${paciente.id}`);
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