import { Badge } from "@/components/ui/badge";
import { getClinicalContextByAge, formatClinicalAge } from "@/lib/clinical-calculations";
import { cn } from "@/lib/utils";

interface PatientAgeBadgeProps {
    birthDate?: string | Date;
    className?: string;
    showAge?: boolean;
}

export function PatientAgeBadge({ birthDate, className, showAge = true }: PatientAgeBadgeProps) {
    const { label, color, age } = getClinicalContextByAge(birthDate);

    return (
        <Badge className={cn("rounded-full border-0 font-medium px-2.5 py-0.5 text-xs whitespace-nowrap shadow-none", color, className)}>
            {label}{showAge && ` • ${formatClinicalAge(birthDate)}`}
        </Badge>
    );
}
