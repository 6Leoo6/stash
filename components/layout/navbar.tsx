"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCryptoStore } from "@/stores/crypto-store";

export function Navbar() {
  const router = useRouter();
  const clear = useCryptoStore((s) => s.clear);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.push("/login");
  }

  return (
    <header className="border-b px-6 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="font-semibold tracking-tight">
        Stash
      </Link>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </header>
  );
}
