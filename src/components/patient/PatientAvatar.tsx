import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paciente } from "@/types";
import { cn } from "@/lib/utils";

interface PatientAvatarProps {
    patient: Paciente;
    className?: string;
}

// Map avatar IDs to image paths in /perfil folder
const AVATAR_IMAGES: Record<string, string> = {
    'avatar-1': '/perfil/bebe_nino.png',
    'avatar-2': '/perfil/bebe_nina.png',
    'avatar-3': '/perfil/nino.png',
    'avatar-4': '/perfil/nina.png',
    'avatar-5': '/perfil/adulto.png',
    'avatar-6': '/perfil/adulta.png',
    'avatar-7': '/perfil/adulto_mayor.png',
    'avatar-8': '/perfil/adulta_mayor.png',
};

export function PatientAvatar({ patient, className }: PatientAvatarProps) {
    const { avatarUrl, nombre, apellido } = patient.datosPersonales;
    const initials = `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase();

    // 1. Icon Avatar (uses images from /perfil folder)
    if (avatarUrl && avatarUrl.startsWith('avatar-')) {
        const imageSrc = AVATAR_IMAGES[avatarUrl];
        if (imageSrc) {
            return (
                <Avatar className={cn("border-2 border-slate-100 dark:border-slate-600", className)}>
                    <AvatarImage
                        src={imageSrc}
                        alt="Avatar"
                        className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[#6cba00] to-[#4a8c00] text-white text-lg">
                        {initials}
                    </AvatarFallback>
                </Avatar>
            );
        }
    }

    // 2. Photo Avatar (with Initials Fallback)
    return (
        <Avatar className={cn("border-2 border-slate-100 dark:border-slate-600", className)}>
            <AvatarImage
                src={avatarUrl || undefined}
                alt={`${nombre} ${apellido}`}
                className="object-cover"
            />
            <AvatarFallback className="text-[#ff8508] font-bold bg-[#ff8508]/10">
                {initials}
            </AvatarFallback>
        </Avatar>
    );
}

