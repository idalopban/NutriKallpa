import { getPatientServer, getMedidasServer } from "@/actions/patient-actions";
import { PatientDetailClient } from "@/components/patient/PatientDetailClient";
import { PatientServerWrapper } from "@/components/patient/PatientServerWrapper";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

/**
 * DETALLE PACIENTE PAGE (Server Component)
 * 
 * This is the entry point for the patient dossier. 
 * It fetches initial data on the server to prevent "blank states"
 * and passes it to the Hydration Bridge (PatientServerWrapper).
 */
export default async function DetallePacientePage({ params }: PageProps) {
    const { id } = await params;

    // Fetch data in parallel on the server
    const [patient, medidas] = await Promise.all([
        getPatientServer(id),
        getMedidasServer(id)
    ]);

    if (!patient) {
        notFound();
    }

    return (
        <PatientServerWrapper patient={patient} medidas={medidas}>
            <PatientDetailClient />
        </PatientServerWrapper>
    );
}
