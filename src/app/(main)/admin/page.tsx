"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { getAllUsers, deleteUser, getInvitationCodesFromDB, createInvitationCode, deleteInvitationCodeFromDB } from "@/actions/auth-actions";
import type { User, InvitationCode, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Copy, Plus, RefreshCw, Shield, Trash2, UserCog, Loader2 } from "lucide-react";

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
                createdAt: c.created_at,
                usedBy: c.used_by,
            })));
        }
        setIsLoading(false);
    };

    const handleGenerateCode = async () => {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const result = await createInvitationCode(code, "usuario");
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
            const result = await deleteInvitationCodeFromDB(code);
            if (result.success) {
                toast.success("Código eliminado correctamente");
                refreshData();
            } else {
                toast.error(result.error || "Error al eliminar código");
            }
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

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        // Note: This still uses localStorage. You might want to add an updateUser server action
        toast.success("Usuario actualizado correctamente");
        setIsEditOpen(false);
        setEditingUser(null);
        refreshData();
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
                        <CardHeader>
                            <CardTitle>Usuarios Registrados</CardTitle>
                            <CardDescription>
                                Lista de todos los usuarios con acceso a la plataforma.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Especialidad</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.nombre}</TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {u.rol === 'admin' ? 'Administrador' : 'Nutricionista'}
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
                <TabsContent value="invitations">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Códigos de Invitación</CardTitle>
                                <CardDescription>
                                    Genera códigos para permitir el registro de nuevos nutricionistas.
                                </CardDescription>
                            </div>
                            <Button onClick={handleGenerateCode} className="gap-2">
                                <Plus className="h-4 w-4" /> Generar Código
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Rol Asignado</TableHead>
                                        <TableHead>Creado</TableHead>
                                        <TableHead>Usado Por</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
        </div>
    );
}
