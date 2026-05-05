"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deriveMasterKey } from "@/lib/crypto/argon2";
import { deriveMemberKeyPair } from "@/lib/crypto/keys";
import { encryptAesGcm, deriveEpochKey } from "@/lib/crypto/encryption";
import { decryptAesGcm } from "@/lib/crypto/encryption";
import { sealEcies } from "@/lib/crypto/ecies";
import { memberToken } from "@/lib/crypto/hash";
import { toBase64, toUtf8, fromBase64, fromBase64Url } from "@/lib/crypto/codec";
import { useCryptoStore } from "@/stores/crypto-store";
import { useStashAuth } from "@/hooks/use-stash-auth";
import type { EncryptedField } from "@/types/crypto";

type InviteMetadata = {
  stashId: string;
  passwordProtected: boolean;
  salt: string;
  encryptedPayload: string;
};

type InvitePayload = {
  stashKey: string;
  previewName: string;
  previewDescription?: string;
};

type JoinState =
  | "loading-invite"
  | "needs-login"
  | "needs-password"
  | "confirm"
  | "joining"
  | "done"
  | "error";

export function JoinForm({ code }: { code: string }) {
  const router = useRouter();
  const { identity, getStashKey } = useCryptoStore();

  const [joinState, setJoinState] = useState<JoinState>("loading-invite");
  const [invite, setInvite] = useState<InviteMetadata | null>(null);
  const [stashKey, setLocalStashKey] = useState<Uint8Array | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewDescription, setPreviewDescription] = useState<string>("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Once we have a stash key, set up the stash auth
  const stashId = invite?.stashId ?? "";
  const { authenticate } = useStashAuth(stashId);

  // Load invite metadata and attempt passwordless key extraction
  useEffect(() => {
    async function loadInvite() {
      const res = await fetch(`/api/invite/${code}`);
      if (!res.ok) {
        setError("This invite link is invalid or has expired.");
        setJoinState("error");
        return;
      }

      const data: InviteMetadata = await res.json();
      setInvite(data);

      if (!identity) {
        // Save invite code and key to sessionStorage so they survive the redirect.
        // Use a code-scoped key so stale keys from other invites don't interfere.
        sessionStorage.setItem("pendingInvite", code);
        const fragment = window.location.hash.slice(1);
        const keyParam = new URLSearchParams(fragment).get("k");
        if (keyParam) sessionStorage.setItem(`pendingInviteKey_${code}`, keyParam);
        setJoinState("needs-login");
        return;
      }

      if (!data.passwordProtected) {
        // Extract invite key from URL fragment (#k=<base64url>) or sessionStorage fallback.
        // Do NOT remove from sessionStorage here — removal happens after a successful join
        // to avoid losing the key on React Strict Mode double-invocations.
        const fragment = window.location.hash.slice(1);
        const params = new URLSearchParams(fragment);
        const keyParam = params.get("k") ?? sessionStorage.getItem(`pendingInviteKey_${code}`);

        if (!keyParam) {
          setError("Invite key missing from URL. Make sure you copied the full link.");
          setJoinState("error");
          return;
        }

        try {
          const inviteKey = fromBase64Url(keyParam);
          await decryptAndConfirm(data, inviteKey);
        } catch {
          setError("Failed to decrypt invite. The link may be corrupted.");
          setJoinState("error");
        }
      } else {
        setJoinState("needs-password");
      }
    }

    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, identity]);

  async function decryptAndConfirm(meta: InviteMetadata, inviteKey: Uint8Array) {
    const field: EncryptedField = JSON.parse(meta.encryptedPayload);
    const bytes = decryptAesGcm(field, inviteKey);
    const payload: InvitePayload = JSON.parse(new TextDecoder().decode(bytes));
    setLocalStashKey(fromBase64(payload.stashKey));
    setPreviewName(payload.previewName);
    setPreviewDescription(payload.previewDescription ?? "");
    setJoinState("confirm");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite || !identity) return;
    setError(null);

    try {
      const salt = fromBase64(invite.salt);
      const { argon2id } = await import("hash-wasm");
      const inviteKey = await argon2id({
        password,
        salt,
        parallelism: 1,
        iterations: 3,
        memorySize: 65536,
        hashLength: 32,
        outputType: "binary",
      }) as Uint8Array;

      await decryptAndConfirm(invite, inviteKey);
    } catch {
      setError("Wrong password or corrupted invite.");
    }
  }

  const handleJoin = useCallback(async () => {
    if (!invite || !identity || !stashKey) return;
    setJoinState("joining");
    setError(null);

    try {
      const memberKeys = deriveMemberKeyPair(identity.identityPrivKey, invite.stashId);
      const token = memberToken(memberKeys.publicKey);

      const newSlot = {
        token,
        publicKey: toBase64(memberKeys.publicKey),
        encryptedStashKey: JSON.stringify(sealEcies(stashKey, memberKeys.publicKey)),
      };

      // Encrypted join announcement (nick defaults to "Member")
      const epochKey = deriveEpochKey(stashKey, 0);
      const announcementData = JSON.stringify({
        token,
        nickname: "Member",
        joinedAt: new Date().toISOString(),
      });
      const announcement = {
        encryptedContent: JSON.stringify(
          encryptAesGcm(toUtf8(announcementData), epochKey)
        ),
        epoch: 0,
      };

      // Update encrypted stash index
      let encryptedStashIndex: string | undefined;
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json();
        const existing: Array<{ stashId: string; previewName: string; previewDescription?: string }> =
          me.encryptedStashIndex
            ? JSON.parse(
                new TextDecoder().decode(
                  decryptAesGcm(
                    JSON.parse(me.encryptedStashIndex),
                    identity.masterKey
                  )
                )
              )
            : [];

        const updated = [...existing, { stashId: invite.stashId, previewName, previewDescription }];
        encryptedStashIndex = JSON.stringify(
          encryptAesGcm(toUtf8(JSON.stringify(updated)), identity.masterKey)
        );
      } catch {
        // Index update is best-effort
      }

      const res = await fetch(`/api/stash/${invite.stashId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: code,
          newSlot,
          announcement,
          ...(encryptedStashIndex && { encryptedStashIndex }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to join stash");
        setJoinState("confirm");
        return;
      }

      // Clean up sessionStorage keys written during the pre-login phase
      sessionStorage.removeItem("pendingInvite");
      sessionStorage.removeItem(`pendingInviteKey_${code}`);

      // Navigate — stash layout will run challenge-response, derive the stash key,
      // and establish the server session before rendering any stash content.
      setJoinState("done");
      router.push(`/stash/${invite.stashId}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while joining.");
      setJoinState("confirm");
    }
  }, [invite, identity, stashKey, previewName, previewDescription, code, router]);

  // ── Render states ────────────────────────────────────────────────────────

  if (joinState === "loading-invite") {
    return <CenteredCard title="Checking invite…" description="One moment." />;
  }

  if (joinState === "error") {
    return (
      <CenteredCard title="Invalid invite" description={error ?? "Something went wrong."}>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </CenteredCard>
    );
  }

  if (joinState === "needs-login") {
    return (
      <CenteredCard
        title="Sign in to join"
        description="You need an account to accept this invite."
      >
        <div className="flex gap-3">
          <Button onClick={() => router.push(`/signup?redirect=/invite/${code}`)}>
            Create account
          </Button>
          <Button variant="outline" onClick={() => router.push(`/login?redirect=/invite/${code}`)}>
            Sign in
          </Button>
        </div>
      </CenteredCard>
    );
  }

  if (joinState === "needs-password") {
    return (
      <CenteredCard
        title="Password required"
        description="This invite is password-protected."
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-password">Invite password</Label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Unlock</Button>
        </form>
      </CenteredCard>
    );
  }

  if (joinState === "confirm" || joinState === "joining") {
    return (
      <CenteredCard
        title={`Join "${previewName}"`}
        description="Your membership will be cryptographically anonymous."
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
          <span>Your identity is hidden from the server and other members.</span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full"
          onClick={handleJoin}
          disabled={joinState === "joining"}
        >
          {joinState === "joining" ? "Joining…" : "Join stash"}
        </Button>
      </CenteredCard>
    );
  }

  return <CenteredCard title="Joined!" description="Redirecting…" />;
}

function CenteredCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm text-primary">Stash</span>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent className="space-y-4">{children}</CardContent>}
      </Card>
    </main>
  );
}
