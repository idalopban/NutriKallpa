"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { saveUser } from "@/lib/storage";
import { uploadProfileImage, updateUserProfile } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Save, Loader2, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";

type TabType = "general" | "clinica" | "seguridad";

export function ProfileSettings() {
    const { user, setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("general");
    const [formData, setFormData] = useState<Partial<User>>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                nombre: user.nombre,
                especialidad: user.especialidad || "",
                cmp: user.cmp || "",
                telefono: user.telefono || "",
                bio: user.bio || "",
                photoUrl: user.photoUrl || "",
                clinicName: user.clinicName || "",
                clinicAddress: user.clinicAddress || "",
                clinicPhone: user.clinicPhone || "",
            });
            if (user.photoUrl) {
                setPhotoPreview(user.photoUrl);
            }
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            toast.error("La imagen no puede superar los 4MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setPhotoPreview(base64String);
            setFormData(prev => ({ ...prev, photoUrl: base64String }));
            setHasChanges(true);
        };
        reader.readAsDataURL(file);
    };

    const handleDeletePhoto = () => {
        setPhotoPreview(null);
        setFormData(prev => ({ ...prev, photoUrl: "" }));
        setHasChanges(true);
        toast.info("Foto eliminada. Guarda los cambios para confirmar.");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);

        try {
            let newPhotoUrl = formData.photoUrl;

            if (formData.photoUrl && formData.photoUrl.startsWith('data:image/')) {
                const uploadResult = await uploadProfileImage(user.id, formData.photoUrl);
                if (uploadResult.success && uploadResult.photoUrl) {
                    newPhotoUrl = uploadResult.photoUrl;
                    setPhotoPreview(newPhotoUrl);
                } else {
                    toast.error(uploadResult.error || "Error al subir la imagen");
                    setIsLoading(false);
                    return;
                }
            }

            const updateResult = await updateUserProfile(user.id, {
                nombre: formData.nombre,
                especialidad: formData.especialidad,
                cmp: formData.cmp,
                telefono: formData.telefono,
                bio: formData.bio,
                clinicName: formData.clinicName as string,
                clinicAddress: formData.clinicAddress as string,
                clinicPhone: formData.clinicPhone as string,
            });

            if (!updateResult.success) {
                toast.error(updateResult.error || "Error al actualizar perfil");
                setIsLoading(false);
                return;
            }

            const updatedUser: User = {
                ...user,
                ...formData,
                photoUrl: newPhotoUrl,
                updatedAt: new Date().toISOString()
            } as User;

            saveUser(updatedUser);
            setUser(updatedUser);
            setHasChanges(false);
            toast.success("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Error al actualizar el perfil");
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    const tabs: { id: TabType; label: string }[] = [
        { id: "general", label: "INFORMACIÓN GENERAL" },
        { id: "clinica", label: "CONSULTORIO" },
        { id: "seguridad", label: "CUENTA" },
    ];

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                    Configuración
                </h1>
                {hasChanges && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Cambios sin guardar</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700 mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 text-xs font-semibold tracking-wider transition-colors ${activeTab === tab.id
                            ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid lg:grid-cols-[1fr_300px] gap-8">
                    {/* Left Column - Form Fields */}
                    <div className="space-y-6">
                        {activeTab === "general" && (
                            <>
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <Label htmlFor="nombre" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        Nombre Completo
                                    </Label>
                                    <Input
                                        id="nombre"
                                        name="nombre"
                                        value={formData.nombre || ""}
                                        onChange={handleInputChange}
                                        className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Tu nombre completo"
                                    />
                                </div>

                                {/* Email (readonly) */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        Correo Electrónico
                                    </Label>
                                    <Input
                                        value={user.email}
                                        disabled
                                        className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <Label htmlFor="telefono" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="telefono"
                                        name="telefono"
                                        value={formData.telefono || ""}
                                        onChange={handleInputChange}
                                        className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="+51 999 999 999"
                                    />
                                </div>

                                {/* Especialidad & CNP */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="especialidad" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            Especialidad
                                        </Label>
                                        <Input
                                            id="especialidad"
                                            name="especialidad"
                                            value={formData.especialidad || ""}
                                            onChange={handleInputChange}
                                            className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            placeholder="Ej. Nutricionista Deportivo"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cmp" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            CNP / Colegiatura
                                        </Label>
                                        <Input
                                            id="cmp"
                                            name="cmp"
                                            value={formData.cmp || ""}
                                            onChange={handleInputChange}
                                            className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            placeholder="Número de colegiatura"
                                        />
                                    </div>
                                </div>

                                {/* Bio */}
                                <div className="space-y-2">
                                    <Label htmlFor="bio" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        Biografía
                                    </Label>
                                    <Textarea
                                        id="bio"
                                        name="bio"
                                        value={formData.bio || ""}
                                        onChange={handleInputChange}
                                        className="min-h-[100px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
                                        placeholder="Escribe una breve descripción profesional..."
                                    />
                                </div>
                            </>
                        )}

                        {activeTab === "clinica" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="clinicName" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        Nombre de la Consultorio
                                    </Label>
                                    <Input
                                        id="clinicName"
                                        name="clinicName"
                                        value={(formData as any).clinicName || ""}
                                        onChange={handleInputChange}
                                        className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        placeholder="Nombre de tu clínica o consultorio"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clinicAddress" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        Dirección
                                    </Label>
                                    <Input
                                        id="clinicAddress"
                                        name="clinicAddress"
                                        value={(formData as any).clinicAddress || ""}
                                        onChange={handleInputChange}
                                        className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        placeholder="Dirección completa"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clinicPhone" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        Teléfono de la Consultorio
                                    </Label>
                                    <Input
                                        id="clinicPhone"
                                        name="clinicPhone"
                                        value={(formData as any).clinicPhone || ""}
                                        onChange={handleInputChange}
                                        className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        placeholder="Teléfono de contacto"
                                    />
                                </div>
                            </>
                        )}

                        {activeTab === "seguridad" && (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <h3 className="font-medium text-slate-800 dark:text-white mb-1">Información de Cuenta</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Email: <span className="font-medium text-slate-700 dark:text-slate-300">{user.email}</span>
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Rol: <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{user.rol}</span>
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Miembro desde: <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </p>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Para cambiar tu contraseña o eliminar tu cuenta, contacta con soporte.
                                </p>
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading || !hasChanges}
                                className="gap-2 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Profile Photo */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Foto de Perfil
                        </Label>

                        {/* Upload Area */}
                        <label
                            htmlFor="photo-upload"
                            className="block w-full aspect-square max-w-[250px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors overflow-hidden bg-slate-50 dark:bg-slate-800/50"
                        >
                            {photoPreview ? (
                                <img
                                    src={photoPreview}
                                    alt="Foto de perfil"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                        <Camera className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-medium uppercase tracking-wide">Subir Imagen</span>
                                </div>
                            )}
                            <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoUpload}
                            />
                        </label>

                        {/* Delete Photo Button */}
                        {photoPreview && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDeletePhoto}
                                className="w-full max-w-[250px] gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar Foto
                            </Button>
                        )}

                        <p className="text-xs text-slate-400 max-w-[250px]">
                            Formatos: JPG, PNG, GIF. Máximo 4MB.
                        </p>

                        {/* Role Badge */}
                        <div className="pt-4 max-w-[250px]">
                            <div className={`p-3 rounded-xl text-center ${user.rol === 'admin'
                                ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                }`}>
                                <span className={`text-sm font-semibold ${user.rol === 'admin'
                                    ? 'text-purple-700 dark:text-purple-300'
                                    : 'text-green-700 dark:text-green-300'
                                    }`}>
                                    {user.rol === 'admin' ? '👑 Administrador' : '🥗 Nutricionista'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
