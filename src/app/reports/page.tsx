"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";
import type { User } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MyJacketsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [jackets, setJackets] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "jackets"), where("dealerId", "==", user.uid));
    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const jacketsData: DocumentData[] = [];
      querySnapshot.forEach((doc) => {
        jacketsData.push({ id: doc.id, ...doc.data() });
      });
      setJackets(jacketsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jackets: ", error);
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Jackets</CardTitle>
        <CardDescription>
          A list of all vehicle jackets assigned to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading your jackets...</p>
        ) : jackets.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jacket ID</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Auction Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jackets.map((jacket) => (
                <TableRow key={jacket.id}>
                  <TableCell>
                    <Badge variant="outline">{jacket.jacketId}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{jacket.vin}</TableCell>
                  <TableCell>{jacket.year}</TableCell>
                  <TableCell>{jacket.make}</TableCell>
                  <TableCell>{jacket.model}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${jacket.auctionInvoiceTotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">You have not been assigned any jackets yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
