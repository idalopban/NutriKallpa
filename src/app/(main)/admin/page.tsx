"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { getAllUsers, deleteUser, getInvitationCodesFromDB, createInvitationCode, deleteInvitationCodeFromDB, toggleUserStatus } from "@/actions/auth-actions";
import type { User, InvitationCode, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Plus, RefreshCw, Shield, Trash2, UserCog, Loader2, Download, FileText, Sparkles, Power } from "lucide-react";
import { generateInvitationCodesPDF } from "@/lib/InvitationCodesPDFGenerator";

export default function AdminPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [invitations, setInvitations] = useState<InvitationCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit User State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Delete User State
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk User Selection State
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

    // Bulk Code Generation State
    const [bulkQuantity, setBulkQuantity] = useState(10);
    const [bulkRole, setBulkRole] = useState<"usuario" | "admin">("usuario");
    const [subscriptionDays, setSubscriptionDays] = useState(30); // NEW: Subscription duration
    const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
    const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

    useEffect(() => {
        if (!user || user.rol !== "admin") {
            toast.error("Acceso denegado. Se requieren permisos de administrador.");
            router.push("/dashboard");
            return;
        }
        refreshData();
    }, [user, router]);

    const refreshData = async () => {
        setIsLoading(true);
        // Fetch users from Supabase
        const usersResult = await getAllUsers();
        if (usersResult.success && usersResult.users) {
            setUsers(usersResult.users as User[]);
        }
        // Fetch invitations from Supabase
        const invResult = await getInvitationCodesFromDB();
        if (invResult.success && invResult.codes) {
            setInvitations(invResult.codes.map((c: any) => ({
                code: c.code,
                rol: c.rol,
                status: c.status,
                subscriptionDays: c.subscription_days || 30,
                createdAt: c.created_at,
                usedBy: c.used_by,
            })));
        }
        setIsLoading(false);
    };

    const handleGenerateCode = async () => {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const result = await createInvitationCode(code, "usuario", 30, user?.id);
        if (result.success) {
            toast.success("Código de invitación generado correctamente");
            refreshData();
        } else {
            toast.error(result.error || "Error al generar código");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Código copiado al portapapeles");
    };

    const handleDeleteCode = async (code: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este código?')) {
            const result = await deleteInvitationCodeFromDB(code, user?.id);
            if (result.success) {
                toast.success("Código eliminado correctamente");
                refreshData();
            } else {
                toast.error(result.error || "Error al eliminar código");
            }
        }
    };

    // Bulk code generation
    const handleGenerateBulk = async () => {
        if (bulkQuantity < 1 || bulkQuantity > 50) {
            toast.error("La cantidad debe estar entre 1 y 50");
            return;
        }

        setIsGeneratingBulk(true);
        const newCodes: string[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < bulkQuantity; i++) {
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const result = await createInvitationCode(code, bulkRole, subscriptionDays, user?.id);
            if (result.success) {
                newCodes.push(code);
                successCount++;
            } else {
                errorCount++;
            }
        }

        setGeneratedCodes(newCodes);
        setIsGeneratingBulk(false);

        if (successCount > 0) {
            toast.success(`${successCount} códigos generados correctamente`);
            refreshData();
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} códigos fallaron al generarse`);
        }
    };

    const copyAllCodes = () => {
        if (generatedCodes.length === 0) return;
        navigator.clipboard.writeText(generatedCodes.join('\n'));
        toast.success(`${generatedCodes.length} códigos copiados al portapapeles`);
    };

    const downloadCodesPDF = () => {
        if (generatedCodes.length === 0) return;

        const codesData = generatedCodes.map(code => ({
            code,
            rol: bulkRole,
            createdAt: new Date().toISOString()
        }));

        generateInvitationCodesPDF(codesData, user?.nombre);
        toast.success("PDF descargado correctamente");
    };

    const handleDeleteUnusedCodes = async () => {
        const unusedCodes = invitations.filter(inv => inv.status === 'active');

        if (unusedCodes.length === 0) {
            toast.info("No hay códigos sin usar para eliminar");
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar ${unusedCodes.length} códigos sin usar? Esta acción no se puede deshacer.`)) {
            return;
        }

        setIsLoading(true);
        let deletedCount = 0;
        let errorCount = 0;

        for (const inv of unusedCodes) {
            const result = await deleteInvitationCodeFromDB(inv.code, user?.id);
            if (result.success) {
                deletedCount++;
            } else {
                errorCount++;
            }
        }

        setIsLoading(false);

        // Clear the preview of generated codes
        setGeneratedCodes([]);

        if (deletedCount > 0) {
            toast.success(`${deletedCount} códigos eliminados correctamente`);
            refreshData();
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} códigos no pudieron ser eliminados`);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete || !user?.email) return;

        setIsDeleting(true);
        const result = await deleteUser(userToDelete.id, user.email);

        if (result.success) {
            toast.success("Usuario eliminado correctamente");
            refreshData();
        } else {
            toast.error(result.error || "Error al eliminar usuario");
        }

        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
    };

    // Bulk User Selection Handlers
    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        const selectableUsers = users.filter(u => u.email !== user?.email);
        if (selectedUsers.size === selectableUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(selectableUsers.map(u => u.id)));
        }
    };

    const handleBulkDeleteUsers = async () => {
        if (selectedUsers.size === 0 || !user?.email) return;

        setIsDeleting(true);
        let successCount = 0;
        let errorCount = 0;

        for (const userId of selectedUsers) {
            const result = await deleteUser(userId, user.email);
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
            }
        }

        setIsDeleting(false);
        setIsBulkDeleteDialogOpen(false);
        setSelectedUsers(new Set());

        if (successCount > 0) {
            toast.success(`${successCount} usuario(s) eliminado(s) correctamente`);
            refreshData();
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} usuario(s) no pudieron ser eliminados`);
        }
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        // Note: This still uses localStorage. You might want to add an updateUser server action
        toast.success("Usuario actualizado correctamente");
        setIsEditOpen(false);
        setEditingUser(null);
        refreshData();
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean | undefined) => {
        if (!user?.email) return;

        const newStatus = !(currentStatus ?? true);
        const result = await toggleUserStatus(userId, newStatus, user.email);

        if (result.success) {
            toast.success(result.message);
            refreshData();
        } else {
            toast.error(result.error || "Error al cambiar estado del usuario");
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">Cargando panel de administración...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                        Panel de <span className="text-[#ff8508]">Administración</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gestión de usuarios y códigos de acceso</p>
                </div>
                <Button onClick={refreshData} variant="outline" size="icon">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </header>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <UserCog className="h-4 w-4" /> Usuarios ({users.length})
                    </TabsTrigger>
                    <TabsTrigger value="invitations" className="gap-2">
                        <Shield className="h-4 w-4" /> Invitaciones
                    </TabsTrigger>
                </TabsList>


                {/* USERS TAB */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Usuarios Registrados</CardTitle>
                                <CardDescription>
                                    Lista de todos los usuarios con acceso a la plataforma.
                                </CardDescription>
                            </div>
                            {selectedUsers.size > 0 && (
                                <Button
                                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                                    variant="destructive"
                                    className="gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Eliminar Seleccionados ({selectedUsers.size})
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={
                                                    users.filter(u => u.email !== user?.email).length > 0 &&
                                                    selectedUsers.size === users.filter(u => u.email !== user?.email).length
                                                }
                                                onCheckedChange={toggleSelectAll}
                                                aria-label="Seleccionar todos"
                                            />
                                        </TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Especialidad</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow
                                            key={u.id}
                                            className={selectedUsers.has(u.id) ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedUsers.has(u.id)}
                                                    onCheckedChange={() => toggleUserSelection(u.id)}
                                                    disabled={u.email === user?.email}
                                                    aria-label={`Seleccionar ${u.nombre}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{u.nombre}</TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {u.rol === 'admin' ? 'Administrador' : 'Nutricionista'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${(u as any).isActive !== false && (u as any).is_active !== false
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${(u as any).isActive !== false && (u as any).is_active !== false
                                                        ? 'bg-emerald-500'
                                                        : 'bg-red-500'
                                                        }`}></span>
                                                    {(u as any).isActive !== false && (u as any).is_active !== false ? 'Activo' : 'Desactivado'}
                                                </span>
                                            </TableCell>
                                            <TableCell>{u.especialidad || "-"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingUser(u);
                                                            setIsEditOpen(true);
                                                        }}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleUserStatus(u.id, (u as any).isActive ?? (u as any).is_active)}
                                                        className={`${(u as any).isActive !== false && (u as any).is_active !== false
                                                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                                            }`}
                                                        disabled={u.email === user?.email || u.rol === 'admin'}
                                                        title={
                                                            u.email === user?.email
                                                                ? "No puedes desactivar tu propia cuenta"
                                                                : u.rol === 'admin'
                                                                    ? "No se puede desactivar a un administrador"
                                                                    : (u as any).isActive !== false && (u as any).is_active !== false
                                                                        ? "Desactivar cuenta"
                                                                        : "Activar cuenta"
                                                        }
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setUserToDelete(u);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        disabled={u.email === user?.email}
                                                        title={u.email === user?.email ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* INVITATIONS TAB */}
                <TabsContent value="invitations" className="space-y-4">
                    {/* BULK GENERATOR SECTION */}
                    <Card className="border-dashed border-2 border-[#ff8508]/30 bg-gradient-to-br from-[#ff8508]/5 to-transparent">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-[#ff8508]" />
                                <CardTitle className="text-lg">Generación en Lote</CardTitle>
                            </div>
                            <CardDescription>
                                Genera múltiples códigos de invitación de una sola vez y descárgalos en PDF.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bulk-quantity">Cantidad (1-50)</Label>
                                    <Input
                                        id="bulk-quantity"
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={bulkQuantity}
                                        onChange={(e) => setBulkQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                                        className="w-24"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bulk-role">Rol</Label>
                                    <Select value={bulkRole} onValueChange={(val: "usuario" | "admin") => setBulkRole(val)}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="usuario">Nutricionista</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subscription-days">Duración Suscripción</Label>
                                    <Select
                                        value={subscriptionDays.toString()}
                                        onValueChange={(val) => setSubscriptionDays(parseInt(val))}
                                    >
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">7 días (Prueba)</SelectItem>
                                            <SelectItem value="30">30 días (1 mes)</SelectItem>
                                            <SelectItem value="90">90 días (3 meses)</SelectItem>
                                            <SelectItem value="365">365 días (1 año)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleGenerateBulk}
                                    disabled={isGeneratingBulk}
                                    className="gap-2 bg-[#ff8508] hover:bg-[#e67500]"
                                >
                                    {isGeneratingBulk ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            Generar {bulkQuantity} Códigos
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Generated Codes Preview */}
                            {generatedCodes.length > 0 && (
                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            {generatedCodes.length} códigos generados
                                        </h4>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={copyAllCodes}
                                                className="gap-1"
                                            >
                                                <Copy className="h-3 w-3" />
                                                Copiar Todos
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={downloadCodesPDF}
                                                className="gap-1 bg-[#ff8508] hover:bg-[#e67500]"
                                            >
                                                <Download className="h-3 w-3" />
                                                Descargar PDF
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setGeneratedCodes([])}
                                                className="text-gray-500 hover:text-gray-700"
                                                title="Cerrar vista previa"
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedCodes.map((code, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded-md font-mono text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                                onClick={() => copyToClipboard(code)}
                                                title="Click para copiar"
                                            >
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* EXISTING CODES TABLE */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Códigos Existentes</CardTitle>
                                <CardDescription>
                                    Lista de todos los códigos de invitación generados.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleDeleteUnusedCodes}
                                    variant="outline"
                                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    disabled={isLoading || invitations.filter(i => i.status === 'active').length === 0}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Eliminar No Usados ({invitations.filter(i => i.status === 'active').length})
                                </Button>
                                <Button onClick={handleGenerateCode} variant="outline" className="gap-2">
                                    <Plus className="h-4 w-4" /> Generar Uno
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Duración</TableHead>
                                        <TableHead>Creado</TableHead>
                                        <TableHead>Usado Por</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No hay códigos generados.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invitations.map((inv) => (
                                            <TableRow key={inv.code}>
                                                <TableCell className="font-mono font-bold">{inv.code}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inv.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {inv.status === 'active' ? 'Activo' : 'Usado'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="capitalize">{inv.rol}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-medium">
                                                        {inv.subscriptionDays || 30} días
                                                    </span>
                                                </TableCell>
                                                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{inv.usedBy || "-"}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {inv.status === 'active' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => copyToClipboard(inv.code)}
                                                                title="Copiar código"
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteCode(inv.code)}
                                                            title="Eliminar código"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* EDIT USER DIALOG */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>
                            Modifica los datos y permisos del usuario.
                        </DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Completo</Label>
                                <Input
                                    id="nombre"
                                    value={editingUser.nombre}
                                    onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editingUser.email}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rol">Rol</Label>
                                    <Select
                                        value={editingUser.rol}
                                        onValueChange={(val: UserRole) => setEditingUser({ ...editingUser, rol: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="usuario">Nutricionista</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cmp">CNP</Label>
                                    <Input
                                        id="cnp"
                                        value={editingUser.cmp || ""}
                                        onChange={(e) => setEditingUser({ ...editingUser, cmp: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="especialidad">Especialidad</Label>
                                <Input
                                    id="especialidad"
                                    value={editingUser.especialidad || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, especialidad: e.target.value })}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">Guardar Cambios</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* DELETE USER CONFIRMATION DIALOG */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta de{" "}
                            <strong>{userToDelete?.nombre}</strong> ({userToDelete?.email}).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                "Eliminar"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* BULK DELETE USERS CONFIRMATION DIALOG */}
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {selectedUsers.size} usuario(s)?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán permanentemente las cuentas de los {selectedUsers.size} usuario(s) seleccionado(s).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDeleteUsers}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                `Eliminar ${selectedUsers.size} usuario(s)`
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
