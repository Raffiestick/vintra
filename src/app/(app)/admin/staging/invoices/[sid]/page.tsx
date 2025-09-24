"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, collection, onSnapshot, DocumentData } from "firebase/firestore";
import { db, functions } from "@/lib/firebase/client";
import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const processStagedUnit = httpsCallable(functions, "processStagedUnit");

const DEFINED_FIELDS: string[] = [
  'vin', 'hin', 'vinOrHin', 'year', 'make', 'model', 'color', 'odometer', 
  'engine', 'lengthFeet', 'titleInfo', 'saleLocation', 'itemPrice', 
  'buyerFee', 'onlineFee', 'managementFee'
];

function StagedUnit({ unitData, unitId, sid }: { unitData: DocumentData, unitId: string, sid: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState(unitData);
  const [isLoading, setIsLoading] = useState(false);

  const onChange = (key: string, value: any) => {
    setState((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleProcess = async () => {
    setIsLoading(true);
    try {
      const payload = { sid, unitId, updates: state };
      const result: any = await processStagedUnit(payload);
      
      toast({ title: "Success!", description: `Jacket ${result.data.jacketId} created.` });
      router.push(`/admin/jackets/${result.data.jacketId}`);
    } catch (error: any) {
      console.error("Failed to process unit:", error);
      toast({ variant: 'destructive', title: "Processing Error", description: error.message });
      setIsLoading(false);
    }
  };
  
  const otherFields = Object.entries(state).filter(([key]) => !DEFINED_FIELDS.includes(key) && !['processed', 'createdAt', 'processedAt', 'rawSnippet'].includes(key));

  return (
    <Card className="panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Unit: {unitData.vin || unitData.hin || unitData.vinOrHin || "(no VIN/HIN)"}
            {unitData.processed && <span className="text-green-500 ml-2 font-normal text-base">✓ Processed</span>}
          </CardTitle>
          {!unitData.processed && (
            <Button size="sm" onClick={handleProcess} disabled={isLoading} className="btn-primary">
              <Loader2 className={`mr-2 h-4 w-4 animate-spin ${!isLoading && 'hidden'}`} />
              Process to Jacket
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Defined Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEFINED_FIELDS.map((key) => {
            const isNumeric = ['year', 'odometer', 'itemPrice', 'buyerFee', 'onlineFee', 'managementFee'].includes(key);
            return (
              <div key={key}>
                <Label className="capitalize text-xs text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                <Input
                  type={isNumeric ? 'number' : 'text'}
                  value={state[key] || ''}
                  onChange={e => onChange(key, e.target.value)}
                  disabled={unitData.processed}
                  className="input-like"
                />
              </div>
            );
          })}
        </div>

        {/* Other unexpected fields */}
        {otherFields.length > 0 && (
          <div className="pt-4 border-t">
             <h4 className="text-sm font-medium text-muted-foreground mb-2">Additional Data</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherFields.map(([key, value]) => (
                <div key={key}>
                  <Label className="capitalize text-xs text-muted-foreground">{key}</Label>
                  <Input type="text" value={value || ''} onChange={e => onChange(key, e.target.value)} disabled={unitData.processed} className="input-like"/>
                </div>
              ))}
            </div>
          </div>
        )}

        {unitData.rawSnippet && (
          <details className="mt-4"><summary className="cursor-pointer text-sm text-muted-foreground hover:underline">View Raw Snippet</summary>
            <pre className="mt-2 p-3 bg-black/20 rounded-md text-xs whitespace-pre-wrap">{unitData.rawSnippet}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export default function StagingInvoiceDetailPage() {
  const params = useParams<{ sid: string }>();
  const sid = params.sid;
  const [invoice, setInvoice] = useState<DocumentData | null>(null);
  const [units, setUnits] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sid) return;
    const docRef = doc(db, "stagingInvoices", sid);
    const unsubDoc = onSnapshot(docRef, (docSnap) => {
      setInvoice(docSnap.exists() ? docSnap.data() : null);
    });
    const unitsRef = collection(db, "stagingInvoices", sid, "units");
    const unsubUnits = onSnapshot(unitsRef, (querySnapshot) => {
      setUnits(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsubDoc(); unsubUnits(); };
  }, [sid]);

  if (loading) {
    return ( <div className="space-y-6"><Card><CardHeader><Skeleton className="h-8 w-64"/><Skeleton className="h-4 w-96 mt-2"/></CardHeader></Card><Skeleton className="h-96 w-full"/></div> );
  }

  return (
    <div className="space-y-6">
      <Card className="panel">
        <CardHeader>
          <CardTitle className="text-2xl">Staging Invoice</CardTitle>
          <CardDescription>
            Invoice Date: {invoice?.auctionSaleDate ? invoice.auctionSaleDate.toDate().toLocaleDateString('en-US', { timeZone: 'UTC' }) : "-"} · 
            Invoice #: {invoice?.auctionInvoiceNumber || "-"} · 
            Units: {invoice?.unitCount ?? "-"}
          </CardDescription>
          {invoice?.invoiceUrl && (<div className="pt-2"><Link href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View Original Uploaded Invoice</Link></div>)}
        </CardHeader>
      </Card>
      
      <div className="space-y-4">
        {units.map((unit) => (<StagedUnit key={unit.id} unitData={unit} unitId={unit.id} sid={sid} />))}
      </div>
    </div>
  );
}