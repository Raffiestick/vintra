
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface PageProps {
  params: {
    vin: string;
  };
}

export default function JacketDetailPage({ params }: PageProps) {
  const { vin } = params;
  const [jacket, setJacket] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vin) return;

    const fetchJacket = async () => {
      setLoading(true);
      try {
        const jacketRef = doc(db, "jackets", vin);
        const docSnap = await getDoc(jacketRef);

        if (docSnap.exists()) {
          setJacket(docSnap.data());
        } else {
          setError("No jacket found with this VIN.");
        }
      } catch (err) {
        console.error("Error fetching jacket:", err);
        setError("Failed to fetch jacket details.");
      } finally {
        setLoading(false);
      }
    };

    fetchJacket();
  }, [vin]);

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">
        Jacket Details for VIN: {vin}
      </h1>
      
      {loading && <p>Loading jacket details...</p>}
      {error && <p className="text-destructive">{error}</p>}
      
      {jacket && (
         <div className="p-6 bg-card text-card-foreground rounded-lg shadow-md">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">{jacket.year} {jacket.make} {jacket.model}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><strong className="block text-muted-foreground">Jacket ID:</strong> {jacket.jacketId}</div>
                <div><strong className="block text-muted-foreground">VIN:</strong> {jacket.vin}</div>
                <div><strong className="block text-muted-foreground">Color:</strong> {jacket.color}</div>
                <div><strong className="block text-muted-foreground">Odometer:</strong> {jacket.odometer.toLocaleString()}</div>
                <div><strong className="block text-muted-foreground">Title State:</strong> {jacket.titleState}</div>
                <div><strong className="block text-muted-foreground">Title Number:</strong> {jacket.titleNumber}</div>
                <div className="col-span-2 md:col-span-1"><strong className="block text-muted-foreground">Auction Total:</strong> ${jacket.auctionInvoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="col-span-2 md:col-span-3"><strong className="block text-muted-foreground">Assigned Dealer ID:</strong> {jacket.dealerId}</div>
            </div>
        </div>
      )}
    </main>
  );
}
