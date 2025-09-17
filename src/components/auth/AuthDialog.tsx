"use client";

import { useState, useEffect } from "react";
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
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import React from "react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'sign-in' | 'create-account';
}

const ShimmerCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={`relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90 shadow-lg ${className}`}
            {...props}
        >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(40%_120%_at_50%_0%,#fff2,transparent)]" />
            <div
                className="absolute -top-1/2 left-0 -z-10 h-[200%] w-full animate-[vintra-shimmer_5s_infinite]"
                style={{
                    background: 'linear-gradient(110deg, transparent 20%, transparent 40%, #ffffff30 50%, transparent 60%, transparent 80%)',
                }}
            />
            {children}
        </div>
    );
});
ShimmerCard.displayName = "ShimmerCard";

export function AuthDialog({ open, onOpenChange, defaultTab = 'sign-in' }: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
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

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const tokenResult = await user.getIdTokenResult(true);
      const isAdmin = tokenResult.claims.admin === true;

      onOpenChange(false);
      
      if (typeof window !== 'undefined') {
        if (isAdmin) {
          window.location.href = '/admin/dealer-management';
        } else {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          if (userData?.documentsUploaded === false) {
            window.location.href = '/upload-documents';
          } else if (userData?.status === 'pending') {
            window.location.href = '/pending-review';
          } else if (userData?.status === 'approved') {
            window.location.href = '/dealer';
          } else {
            toast({ title: "Login Issue", description: "Your account status is unrecognized.", variant: "destructive" });
          }
        }
      }
    } catch (error: any) {
      toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        uid: user.uid, email, companyName, streetAddress, city, state, zip,
        contactName, phone, role: 'dealer', status: 'new', documentsUploaded: false,
        resellCertificateUrl: '', governmentIdUrl: '', createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", user.uid), userData);
      
      onOpenChange(false);
      if (typeof window !== 'undefined') {
        window.location.href = '/upload-documents';
      }
    } catch (error: any) {
      toast({ title: "Account Creation Failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };
  
  const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    }}>
      {children}
    </div>
  );


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 w-[92%] max-w-md">
        <DialogHeader>
            <VisuallyHidden>
                <DialogTitle>Authentication</DialogTitle>
                <DialogDescription>Sign in or create an account to continue.</DialogDescription>
            </VisuallyHidden>
        </DialogHeader>
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <div className="relative z-50">
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-3xl bg-[radial-gradient(closest-side,rgba(121,87,214,0.5),transparent)] blur-3xl animate-[vintra-pulse_4s_infinite]" />
            <ShimmerCard>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                    <CardHeader className="text-center pt-6">
                       <h2 className="font-manrope text-2xl font-bold text-white">Welcome to Vintra</h2>
                    </CardHeader>
                    <TabsList className="grid w-[calc(100%-2rem)] mx-auto grid-cols-2 bg-white/5 border-white/10">
                        <TabsTrigger value="sign-in" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Sign In</TabsTrigger>
                        <TabsTrigger value="create-account" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Create Account</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sign-in">
                        <form onSubmit={handleSignIn}>
                        <Card className="border-0 shadow-none bg-transparent">
                            <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="email-signin" className="text-white/80">Email</Label>
                                <Input id="email-signin" type="email" placeholder="dealer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/15" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password-signin" className="text-white/80">Password</Label>
                                <Input id="password-signin" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/15" />
                            </div>
                            </CardContent>
                            <CardFooter>
                            <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200" disabled={loading}>
                                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</> : "Sign In"}
                            </Button>
                            </CardFooter>
                        </Card>
                        </form>
                    </TabsContent>
                    <TabsContent value="create-account">
                        <form onSubmit={handleCreateAccount}>
                        <Card className="border-0 shadow-none bg-transparent">
                            <CardContent className="h-96 w-full pr-4">
                            <ScrollArea className="h-full w-full">
                                <div className="space-y-4 py-4 text-white/80">
                                    <div className="space-y-2"><Label>Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="space-y-2"><Label>Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="space-y-2"><Label>Phone Number</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="space-y-2"><Label>Street Address</Label><Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="flex gap-4">
                                    <div className="space-y-2 flex-1"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="space-y-2 w-20"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="space-y-2 w-24"><Label>Zip</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    </div>
                                    <div className="space-y-2"><Label>Email Address</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                    <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white/5 border-white/15"/></div>
                                </div>
                            </ScrollArea>
                            </CardContent>
                            <CardFooter>
                            <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200" disabled={loading}>
                                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Account & Continue"}
                            </Button>
                            </CardFooter>
                        </Card>
                        </form>
                    </TabsContent>
                </Tabs>
            </ShimmerCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}
