"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth'; // Corrected path
import { storage, functions } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { format, parseISO } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast'; // Corrected path
import { CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { parseSnippetText, ParsedUnit } from '@/lib/parsers/snippetParser';

type UnitData = ParsedUnit & {
  trailerVin?: string;
  trailerTitleInfo?: string;
  hasTrailer?: boolean;
  rawSnippet?: string;
};

type UnitState = {
  id: number;
  text: string;
  data: UnitData;
};

const initialUnitData: UnitData = {
  vinOrHin: '', year: '', make: '', model: '', color: '',
  odometer: '', hours: '', lengthFeet: '', engine: '',
  titleInfo: '', saleLocation: '', itemPrice: '', buyerFee: '',
  onlineFee: '', managementFee: 100, trailerVin: '',
  trailerTitleInfo: '', hasTrailer: false, rawSnippet: '',
};

const createStagingBatchFromManualEntry = httpsCallable(functions, 'createStagingBatchFromManualEntry');

export default function NewJacketQuickEntryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [units, setUnits] = useState<UnitState[]>([{ id: 1, text: '', data: { ...initialUnitData } }]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addUnit = () => {
    setUnits([...units, { id: Date.now(), text: '', data: { ...initialUnitData } }]);
  };

  const removeUnit = (id: number) => {
    setUnits(units.filter(u => u.id !== id));
  };

  const handleUnitTextChange = (id: number, text: string) => {
    setUnits(units.map(u => u.id === id ? { ...u, text } : u));
  };

  const handleUnitDataChange = (id: number, field: keyof UnitData, value: string) => {
    setUnits(units.map(u => u.id === id ? { ...u, data: { ...u.data, [field]: value } } : u));
  };
  
  const handleQuickParse = (id: number) => {
    const unit = units.find(u => u.id === id);
    if (!unit || !unit.text) return;

    const parsed = parseSnippetText(unit.text);
    const updatedData = { ...initialUnitData, ...parsed, rawSnippet: unit.text };
    setUnits(units.map(u => u.id === id ? { ...u, data: updatedData } : u));
    toast({ title: "Parse Complete!", description: "Data has been extracted. Please review." });
  };

  const isSaveDisabled = useMemo(() => {
    return isLoading || !invoiceDate || units.length === 0 || units.some(u => !u.data.vinOrHin);
  }, [isLoading, invoiceDate, units]);

  const handleSave = async () => {
    if (!user || !invoiceDate) {
      toast({ variant: 'destructive', title: "Missing Information", description: "Please provide an invoice date." });
      return;
    }
    setIsLoading(true);

    try {
      let invoiceUrl = '';
      if (invoiceFile) {
        const storageRef = ref(storage, `invoices/${user.uid}/${Date.now()}-${invoiceFile.name}`);
        const snapshot = await uploadBytes(storageRef, invoiceFile);
        invoiceUrl = await getDownloadURL(snapshot.ref);
      }

      const payload = {
        auctionSaleDate: invoiceDate.toISOString(),
        auctionInvoiceNumber: invoiceNumber || null,
        invoiceUrl,
        units: units.map(u => {
          const unitData = { ...u.data };
          (Object.keys(unitData) as Array<keyof UnitData>).forEach(key => {
            const numericKeys: Array<keyof UnitData> = ['year', 'odometer', 'hours', 'lengthFeet', 'itemPrice', 'buyerFee', 'onlineFee', 'managementFee'];
            if (numericKeys.includes(key)) {
              const val = unitData[key];
              (unitData as any)[key] = (val === '' || val === null || val === undefined) ? null : Number(val);
            }
          });
          return unitData;
        }),
      };
      
      const result: any = await createStagingBatchFromManualEntry(payload);
      const sid = result.data.sid;
      
      toast({ title: "Success!", description: "Staging batch created. Redirecting..." });
      router.push(`/admin/staging/invoices`);

    } catch (error: any) {
      console.error("Failed to create staging batch:", error);
      toast({ variant: 'destructive', title: "Error", description: error.message || "Could not create staging batch." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Staging Batch</CardTitle>
          <CardDescription>Set the invoice date, paste unit details to quick-parse, then review and process.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Auction Invoice Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !invoiceDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} initialFocus />
              </PopoverContent>
            </Popover>
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground">Or type manually</Label>
              <Input type="date" value={invoiceDate ? format(invoiceDate, "yyyy-MM-dd") : ""} onChange={(e) => setInvoiceDate(e.target.value ? parseISO(e.target.value) : undefined)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Upload Original Invoice (Optional)</Label>
            <Input type="file" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} accept=".pdf,image/*" />
            <div className="mt-4">
              <Label>Auction Invoice Number</Label>
              <Input placeholder="e.g., LK-2025-0912-12345" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value.trim())} />
            </div>
          </div>
        </CardContent>
      </Card>

      {units.map((unit, index) => (
        <Card key={unit.id}>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Unit #{index + 1}</CardTitle>
            {units.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeUnit(unit.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor={`paste-${unit.id}`}>Paste Unit Details Here</Label>
              <Textarea
                id={`paste-${unit.id}`}
                placeholder="Paste the full text for one vehicle from the auction invoice..."
                className="min-h-[150px] font-mono text-xs"
                value={unit.text}
                onChange={(e) => handleUnitTextChange(unit.id, e.target.value)}
              />
              <Button className="mt-2" onClick={() => handleQuickParse(unit.id)}>Parse Text</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(initialUnitData).filter(k => !['hasTrailer', 'rawSnippet'].includes(k)).map((key) => {
                const isNumeric = ['year', 'odometer', 'hours', 'lengthFeet', 'itemPrice', 'buyerFee', 'onlineFee', 'managementFee'].includes(key);
                return (
                  <div key={key}>
                    <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    <Input
                      type={isNumeric ? 'number' : 'text'}
                      value={unit.data[key as keyof UnitData] as string | number}
                      onChange={(e) => handleUnitDataChange(unit.id, key as keyof UnitData, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={addUnit}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Unit
        </Button>
        <Button onClick={handleSave} disabled={isSaveDisabled}>
          <Loader2 className={`mr-2 h-4 w-4 animate-spin ${!isLoading && 'hidden'}`} />
          Move to Staging
        </Button>
      </div>
    </div>
  );
}