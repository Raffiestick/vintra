"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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

  const handleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
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

  const handleCreateAccount = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        companyName,
        streetAddress,
        city,
        state,
        zip,
        contactName,
        phone,
        email,
        role: 'dealer',
        status: 'pending',
        documentsUploaded: false,
      });
      
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
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-card-foreground">Dealer Portal Access</DialogTitle>
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
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email-signin">Email</Label>
                <Input id="email-signin" type="email" placeholder="dealer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signin">Password</Label>
                <Input id="password-signin" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full mt-2" onClick={handleSignIn} disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="create-account">
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Your Company LLC" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input id="contactName" placeholder="John Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="(555) 555-5555" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input id="streetAddress" placeholder="123 Main St" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
              </div>
              <div className="flex gap-4">
                <div className="space-y-2 w-1/2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Anytown" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2 w-1/4">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="CA" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                 <div className="space-y-2 w-1/4">
                  <Label htmlFor="zip">Zip</Label>
                  <Input id="zip" placeholder="12345" value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email Address</Label>
                <Input id="email-signup" type="email" placeholder="dealer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input id="password-signup" type="password" placeholder="Choose a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-confirm">Confirm Password</Label>
                <Input id="password-confirm" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full mt-2" onClick={handleCreateAccount} disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
