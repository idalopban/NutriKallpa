import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paciente } from "@/types";
import { cn } from "@/lib/utils";

interface PatientAvatarProps {
    patient: Paciente;
    className?: string;
}

const EMOJI_MAP: Record<string, string> = {
    'avatar-1': '👤',
    'avatar-2': '👨',
    'avatar-3': '👩',
    'avatar-4': '👴',
    'avatar-5': '👵',
    'avatar-6': '🧑‍⚕️',
    'avatar-7': '🏃',
    'avatar-8': '🏋️',
    'avatar-9': '🧘',
    'avatar-10': '🚴',
};

export function PatientAvatar({ patient, className }: PatientAvatarProps) {
    const { avatarUrl, nombre, apellido } = patient.datosPersonales;

    if (avatarUrl) {
        if (avatarUrl.startsWith('avatar-')) {
            return (
                <Avatar className={cn("border-2 border-slate-100 dark:border-slate-600", className)}>
                    <AvatarFallback className="bg-gradient-to-br from-[#6cba00] to-[#4a8c00] text-white text-lg">
                        {EMOJI_MAP[avatarUrl] || '👤'}
                    </AvatarFallback>
                </Avatar>
            );
        }
        return (
            <Avatar className={cn("border-2 border-slate-100 dark:border-slate-600", className)}>
                <img src={avatarUrl} alt={`${nombre} ${apellido}`} className="w-full h-full object-cover" />
            </Avatar>
        );
    }

    return (
        <Avatar className={cn("border-2 border-slate-100 dark:border-slate-600", className)}>
            <AvatarFallback className="text-[#ff8508] font-bold bg-[#ff8508]/10">
                {nombre[0]}{apellido[0]}
            </AvatarFallback>
        </Avatar>
    );
}
