'use client';

/**
 * ConsentBanner Component
 * 
 * Displays a banner prompting the user to collect patient consent
 * when required consents are missing. Can be expanded to show
 * the consent collection form.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
    getConsentStatus,
    getConsentTemplates,
    recordEssentialConsents,
    ConsentStatus,
    ConsentTemplate,
    ConsentType
} from '@/lib/consent-manager';

// ============================================================================
// TYPES
// ============================================================================

interface ConsentBannerProps {
    patientId: string;
    patientName: string;
    isMinor?: boolean;
    onConsentGranted?: () => void;
    onDismiss?: () => void;
    className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConsentBanner({
    patientId,
    patientName,
    isMinor = false,
    onConsentGranted,
    onDismiss,
    className = ''
}: ConsentBannerProps) {
    const [status, setStatus] = useState<ConsentStatus | null>(null);
    const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Form state
    const [acceptedConsents, setAcceptedConsents] = useState<Set<ConsentType>>(new Set());
    const [guardianName, setGuardianName] = useState('');
    const [guardianRelationship, setGuardianRelationship] = useState('');
    const [guardianDocument, setGuardianDocument] = useState('');

    // Load consent status and templates
    useEffect(() => {
        async function loadData() {
            console.log('[ConsentBanner] Loading data for patient:', patientId);
            const [consentStatus, consentTemplates] = await Promise.all([
                getConsentStatus(patientId),
                getConsentTemplates()
            ]);
            console.log('[ConsentBanner] Status:', consentStatus);
            console.log('[ConsentBanner] Templates:', consentTemplates);
            console.log('[ConsentBanner] Missing consents:', consentStatus.missingConsents);
            console.log('[ConsentBanner] Templates matching missing:',
                consentTemplates.filter(t => consentStatus.missingConsents.includes(t.consentType))
            );
            setStatus(consentStatus);
            setTemplates(consentTemplates);
        }
        loadData();
    }, [patientId]);

    // If no missing consents, don't render anything
    if (status?.canProceed || !status) {
        return null;
    }

    const handleToggleConsent = (type: ConsentType) => {
        const newSet = new Set(acceptedConsents);
        if (newSet.has(type)) {
            newSet.delete(type);
        } else {
            newSet.add(type);
        }
        setAcceptedConsents(newSet);
    };

    const canSubmit = () => {
        // All missing consents must be accepted
        const allAccepted = status.missingConsents.every(c => acceptedConsents.has(c));

        // If minor, guardian info is required
        if (isMinor) {
            return allAccepted && guardianName.trim() && guardianRelationship.trim();
        }

        return allAccepted;
    };

    const handleSubmit = async () => {
        if (!canSubmit()) return;

        setIsSubmitting(true);

        try {
            const success = await recordEssentialConsents({
                patientId,
                guardianName: isMinor ? guardianName : undefined,
                guardianRelationship: isMinor ? guardianRelationship : undefined,
                guardianDocument: isMinor ? guardianDocument : undefined,
            });

            if (success) {
                setShowSuccess(true);
                setTimeout(() => {
                    onConsentGranted?.();
                }, 1500);
            }
        } catch (error) {
            console.error('Error recording consent:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Success state
    if (showSuccess) {
        return (
            <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 ${className}`}>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                            Consentimiento registrado correctamente
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                            Puede continuar con la atención del paciente.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                            Consentimiento Informado Requerido
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Según la Ley 29733 (Protección de Datos Personales), debe obtener el consentimiento
                            de <strong>{patientName}</strong> antes de procesar sus datos de salud.
                        </p>

                        <div className="flex items-center gap-2 mt-3">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                {isExpanded ? (
                                    <>
                                        <ChevronUp className="w-4 h-4 mr-1" />
                                        Ocultar formulario
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4 mr-1" />
                                        Registrar consentimiento
                                    </>
                                )}
                            </Button>

                            {onDismiss && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onDismiss}
                                    className="text-amber-600"
                                >
                                    Omitir por ahora
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded-full text-xs font-medium text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Faltan {status.missingConsents.length}
                    </div>
                </div>
            </div>

            {/* Expandable Form */}
            {isExpanded && (
                <div className="border-t border-amber-200 dark:border-amber-800 p-4 bg-white dark:bg-slate-900">
                    {/* Consent Checkboxes */}
                    <div className="space-y-4 mb-6">
                        {templates
                            .filter(t => status.missingConsents.includes(t.consentType))
                            .map(template => (
                                <div
                                    key={template.id}
                                    className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="w-6 h-6 aspect-square shrink-0 flex items-center justify-center mt-0.5" style={{ aspectRatio: '1 / 1' }}>
                                        <Checkbox
                                            id={template.consentType}
                                            checked={acceptedConsents.has(template.consentType)}
                                            onCheckedChange={() => handleToggleConsent(template.consentType)}
                                            className="!h-6 !w-6 !aspect-square rounded-full border-2 border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                            style={{ aspectRatio: '1 / 1', minWidth: '24px', minHeight: '24px' }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label
                                            htmlFor={template.consentType}
                                            className="font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                                        >
                                            {template.titleEs}
                                        </Label>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            {template.contentEs}
                                        </p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    {/* Guardian Info (for minors) */}
                    {isMinor && (
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                                Información del Tutor Legal
                            </h4>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                                Para pacientes menores de edad, el consentimiento debe ser otorgado por un tutor legal.
                            </p>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <Label htmlFor="guardianName" className="text-sm">
                                        Nombre del Tutor *
                                    </Label>
                                    <Input
                                        id="guardianName"
                                        value={guardianName}
                                        onChange={e => setGuardianName(e.target.value)}
                                        placeholder="Nombre completo"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="guardianRelationship" className="text-sm">
                                        Parentesco *
                                    </Label>
                                    <Input
                                        id="guardianRelationship"
                                        value={guardianRelationship}
                                        onChange={e => setGuardianRelationship(e.target.value)}
                                        placeholder="Padre, Madre, Tutor Legal"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="guardianDocument" className="text-sm">
                                        DNI del Tutor
                                    </Label>
                                    <Input
                                        id="guardianDocument"
                                        value={guardianDocument}
                                        onChange={e => setGuardianDocument(e.target.value)}
                                        placeholder="12345678"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs text-slate-500 order-2 sm:order-1">
                            Los consentimientos quedarán registrados en el historial del paciente.
                        </p>

                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit() || isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto order-1 sm:order-2 shrink-0"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Confirmar Consentimiento
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// COMPACT INDICATOR COMPONENT
// ============================================================================

interface ConsentIndicatorProps {
    patientId: string;
    onClick?: () => void;
}

export function ConsentIndicator({ patientId, onClick }: ConsentIndicatorProps) {
    const [status, setStatus] = useState<ConsentStatus | null>(null);

    useEffect(() => {
        getConsentStatus(patientId).then(setStatus);
    }, [patientId]);

    if (!status) return null;

    if (status.canProceed) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>Consentimiento OK</span>
            </div>
        );
    }

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        >
            <AlertTriangle className="w-3 h-3" />
            <span>Falta consentimiento</span>
        </button>
    );
}
// ============================================================================
// CONSENT DETAILS COMPONENT
// ============================================================================

export function ConsentDetails({ patientId }: { patientId: string }) {
    const [status, setStatus] = useState<ConsentStatus | null>(null);

    useEffect(() => {
        getConsentStatus(patientId).then(setStatus);
    }, [patientId]);

    if (!status || !status.canProceed) return null;

    return (
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Consentimiento Legal</h4>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Estado:</span>
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">ACTIVO</Badge>
                </div>

                {status.authorizedBy && (
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Autorizado por:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{status.authorizedBy}</span>
                    </div>
                )}

                {status.relationship && (
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Parentesco:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{status.relationship}</span>
                    </div>
                )}

                {status.authorizedAt && (
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Fecha:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                            {status.authorizedAt.toLocaleDateString('es-PE')}
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 leading-tight">
                    Cumple con la Ley 29733 de Protección de Datos Personales (Perú).
                </p>
            </div>
        </div>
    );
}
