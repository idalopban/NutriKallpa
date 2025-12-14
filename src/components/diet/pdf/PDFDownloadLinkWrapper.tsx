'use client';

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';

interface WrapperProps {
    document: any;
    fileName: string;
}

const PDFDownloadLinkWrapper = ({ document, fileName }: WrapperProps) => {
    return (
        <PDFDownloadLink document={document} fileName={fileName}>
            {({ blob, url, loading, error }: { blob: Blob | null, url: string | null, loading: boolean, error: Error | null }) => (
                <Button variant="default" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando PDF...
                        </>
                    ) : (
                        <>
                            <Printer className="w-4 h-4 mr-2" /> Descargar Plan Semanal
                        </>
                    )}
                </Button>
            )}
        </PDFDownloadLink>
    );
};

export default PDFDownloadLinkWrapper;
