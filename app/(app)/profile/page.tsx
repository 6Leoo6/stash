"use client";

import { useEffect, useState } from "react";
import { KeyRound, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCryptoStore } from "@/stores/crypto-store";
import { toBase64 } from "@/lib/crypto/codec";

export default function ProfilePage() {
  const { identity } = useCryptoStore();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUsername(d.username ?? null))
      .catch(() => {});
  }, []);

  const pubKeyPreview = identity
    ? toBase64(identity.identityPubKey).slice(0, 24) + "…"
    : null;

  return (
    <main className="mx-auto max-w-lg px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{username ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Cryptographic identity
          </CardTitle>
          <CardDescription>
            Your identity key is derived from your password and never leaves this device in plaintext.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-muted-foreground">Identity public key</span>
            <span className="font-mono text-xs break-all sm:break-normal sm:text-right">
              {pubKeyPreview ?? (
                <span className="italic text-muted-foreground not-italic font-sans">Not loaded — sign in again</span>
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Key material is held only in memory for this browser session. Clearing browser
            storage or signing out removes it.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
