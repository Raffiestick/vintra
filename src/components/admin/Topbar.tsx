"use client";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client"; // your existing client Firebase

export default function Topbar() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/landing"); // or "/" if you prefer
    } catch (e) {
      console.error("Logout failed", e);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="font-medium">Admin Dashboard</div>
      <div className="flex items-center gap-2">
        {/* room for search, notifications, etc. */}
        <button
          onClick={handleLogout}
          className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
