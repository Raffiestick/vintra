
"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

export function UploadInvoice() {
  const router = useRouter();

  const handleNavigateToStaging = () => {
    router.push('/admin/staging/invoices');
  };

  return (
    <Card className="text-center max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Auction Invoice</CardTitle>
        <CardDescription>
          Our AI will parse the invoice and create draft jackets for you to review in the Staging Area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          onClick={handleNavigateToStaging}
          className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary transition-colors"
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Click here to upload</p>
          <p className="text-sm text-muted-foreground">You will be taken to the Staging Area to complete the upload.</p>
        </div>
      </CardContent>
    </Card>
  );
}
