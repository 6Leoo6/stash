"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deriveMasterKey } from "@/lib/crypto/argon2";
import { decryptAesGcm } from "@/lib/crypto/encryption";
import { fromBase64 } from "@/lib/crypto/codec";
import { x25519 } from "@noble/curves/ed25519.js";
import { useCryptoStore } from "@/stores/crypto-store";
import type { EncryptedIdentityBundle } from "@/types/crypto";

export function LoginForm() {
  const router = useRouter();
  const setIdentity = useCryptoStore((s) => s.setIdentity);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login failed");
        return;
      }

      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setError("Failed to load account data");
        return;
      }
      const { encryptedIdentityBundle } = await meRes.json();

      const masterKey = await deriveMasterKey(password, username);
      const bundle: EncryptedIdentityBundle = JSON.parse(encryptedIdentityBundle);
      const identityPrivKey = decryptAesGcm(bundle, masterKey);
      const identityPubKey = x25519.getPublicKey(identityPrivKey);

      setIdentity({ masterKey, identityPrivKey, identityPubKey });
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Invalid credentials or corrupted account data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Unlocking…" : "Sign in"}
      </Button>
    </form>
  );
}
