"use client";

import { useState, useEffect } from "react";
import { db, auth, functions } from "@/lib/firebase/client";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  query,
  where,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

export default function DealerManagementPage() {
  const [pendingDealers, setPendingDealers] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const dealers: DocumentData[] = [];
        querySnapshot.forEach((doc) => {
          dealers.push({ id: doc.id, ...doc.data() });
        });
        setPendingDealers(dealers);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching pending dealers: ", error);
        toast({
          title: "Error",
          description: "Failed to fetch pending dealer applications.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const handleManageApplication = async (
    uid: string,
    action: "approve" | "deny"
  ) => {
    if (!auth.currentUser) {
       toast({
        title: "Authentication Error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting((prev) => ({ ...prev, [uid]: true }));
    try {
      const manageDealerApplication = httpsCallable(functions, 'manageDealerApplication');
      const result: any = await manageDealerApplication({ uid, action });

      if (result.data.success) {
        toast({
          title: "Success",
          description: `Dealer application has been ${action}d.`,
        });
      } else {
        throw new Error(result.data.error || "An unknown error occurred.");
      }

    } catch (error: any) {
      console.error("Error managing dealer application:", error);
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [uid]: false }));
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Dealer Application Management
          </CardTitle>
          <CardDescription>
            Review and approve or deny pending dealer applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading pending applications...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Resale Certificate</TableHead>
                  <TableHead>Government ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDealers.length > 0 ? (
                  pendingDealers.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell className="font-medium">
                        {dealer.companyName}
                      </TableCell>
                      <TableCell>{dealer.contactName}</TableCell>
                      <TableCell>{dealer.email}</TableCell>
                       <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInNewTab(dealer.resellCertificateUrl)}
                          disabled={!dealer.resellCertificateUrl}
                        >
                          <ExternalLink className="mr-2" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInNewTab(dealer.governmentIdUrl)}
                          disabled={!dealer.governmentIdUrl}
                        >
                          <ExternalLink className="mr-2" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleManageApplication(dealer.id, "deny")
                          }
                          disabled={isSubmitting[dealer.id]}
                        >
                          Deny
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleManageApplication(dealer.id, "approve")
                          }
                          disabled={isSubmitting[dealer.id]}
                        >
                          {isSubmitting[dealer.id] ? "Processing..." : "Approve"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No pending applications found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
