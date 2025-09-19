"use client";

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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
    
    // Basic validation to ensure it's a plausible URL
    if (!url.startsWith('http')) {
        return (
             <div className="flex items-center justify-center h-screen">
                <p className="text-red-500">Error: Invalid document URL.</p>
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
                        iframe.contentWindow?.print();
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
