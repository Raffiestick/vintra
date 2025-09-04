
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase-admin"; // Using admin SDK for server-side fetch
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: {
    vin: string;
  };
}

async function getJacket(vin: string): Promise<DocumentData | null> {
  if (!vin) return null;
  const jacketRef = doc(db, "jackets", vin);
  const docSnap = await getDoc(jacketRef);

  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export default async function JacketDetailPage({ params }: PageProps) {
  const { vin } = params;
  const jacket = await getJacket(vin);

  if (!jacket) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
        <Card className="w-full max-w-4xl">
           <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">Jacket Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No vehicle jacket was found with the VIN:{" "}
              <span className="font-mono">{vin}</span>.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Format date if it exists
  const createdAt = jacket.createdAt?.toDate ? jacket.createdAt.toDate().toLocaleDateString() : 'N/A';

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8">
       <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">
                {jacket.year} {jacket.make} {jacket.model}
              </CardTitle>
              <CardDescription>
                VIN: <span className="font-mono">{jacket.vin}</span>
              </CardDescription>
            </div>
             <Badge variant="secondary" className="text-lg">
                Jacket ID: {jacket.jacketId}
             </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="md:col-span-3 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">Vehicle Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><strong className="block text-muted-foreground">Color:</strong> {jacket.color}</div>
                <div><strong className="block text-muted-foreground">Odometer:</strong> {jacket.odometer.toLocaleString()}</div>
                <div><strong className="block text-muted-foreground">Title State:</strong> {jacket.titleState}</div>
                <div><strong className="block text-muted-foreground">Title Number:</strong> {jacket.titleNumber}</div>
            </div>
          </div>

           <div className="md:col-span-3 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">Financials & Assignment</h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><strong className="block text-muted-foreground">Auction Total:</strong> ${jacket.auctionInvoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="col-span-2"><strong className="block text-muted-foreground">Assigned Dealer ID:</strong> <span className="font-mono text-xs">{jacket.dealerId}</span></div>
             </div>
          </div>
          <div className="md:col-span-3 border-t pt-6">
             <div className="text-xs text-muted-foreground">
                Created on: {createdAt}
             </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
            <Button size="lg" className="w-full md:w-auto">Process Jacket</Button>
        </CardFooter>
       </Card>
    </main>
  );
}
