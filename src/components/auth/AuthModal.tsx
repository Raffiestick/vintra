
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState(""); 
  const [zip, setZip] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Force refresh the token to get latest claims.
      const tokenResult = await user.getIdTokenResult(true);
      const isAdmin = tokenResult.claims.admin === true;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (isAdmin) {
        router.push('/admin/dealer-management');
      } else {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.documentsUploaded === false) {
            router.push('/upload-documents');
          } else if (userData.status === 'pending') {
            router.push('/pending-review');
          } else if (userData.status === 'approved') {
            router.push('/reports');
          } else {
             toast({
              title: "Login Issue",
              description: "Your account status is unrecognized. Please contact support.",
              variant: "destructive",
            });
          }
        } else {
          // This case should not happen for a non-admin, but is a safeguard.
          throw new Error("User profile not found.");
        }
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        email,
        companyName,
        streetAddress,
        city,
        state,
        zip,
        contactName,
        phone,
        role: 'dealer',
        status: 'new', // Start as 'new', will go to 'pending' after docs
        documentsUploaded: false,
        resellCertificateUrl: '',
        governmentIdUrl: '',
        createdAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, "users", user.uid), userData);
      
      // Force refresh the token to ensure custom claims are loaded if set by a function
      await user.getIdToken(true);

      router.push('/upload-documents');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Account Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Dealer Portal Access</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Sign in or create your dealer account.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="sign-in" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="create-account">Create Account</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in">
            <form onSubmit={handleSignIn}>
              <Card className="border-0 shadow-none">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email-signin">Email</Label>
                    <Input id="email-signin" type="email" placeholder="dealer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signin">Password</Label>
                    <Input id="password-signin" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>
          <TabsContent value="create-account">
            <form onSubmit={handleCreateAccount}>
              <Card className="border-0 shadow-none">
                <CardContent className="h-96 w-full pr-4">
                  <ScrollArea className="h-full w-full">
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Phone Number</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Street Address</Label><Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} /></div>
                      <div className="flex gap-4">
                        <div className="space-y-2 flex-1"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                        <div className="space-y-2 w-20"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
                        <div className="space-y-2 w-24"><Label>Zip</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div>
                      </div>
                      <div className="space-y-2"><Label>Email Address</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
