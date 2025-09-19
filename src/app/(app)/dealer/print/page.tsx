
"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ALLOWED_URL_PREFIX = "https://storage.googleapis.com/";

function PrintView() {
    const searchParams = useSearchParams();
    const url = searchParams.get('url');

    if (!url) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-red-500">Error: No document URL provided.</p>
            </div>
        );
    }
    
    if (!url.startsWith(ALLOWED_URL_PREFIX)) {
        return (
             <div className="flex items-center justify-center h-screen">
                <p className="text-red-500">Error: Invalid or disallowed document URL.</p>
            </div>
        )
    }

    return (
        <iframe
            src={url}
            className="w-full h-screen border-0"
            title="Print Document"
            onLoad={(e) => {
                const iframe = e.target as HTMLIFrameElement;
                if (iframe.contentWindow) {
                    // Wait a moment for PDF to render then trigger print
                    setTimeout(() => {
                        try {
                            iframe.contentWindow?.print();
                        } catch (err) {
                            console.error("Print failed:", err);
                        }
                    }, 500); 
                }
            }}
        />
    );
}


export default function PrintPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading document...</div>}>
            <PrintView />
        </Suspense>
    )
}
