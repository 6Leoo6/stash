"use client";

import { useState, useEffect } from "react";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { encryptAesGcm } from "@/lib/crypto/encryption";
import { toBase64, toUtf8, fromBase64 } from "@/lib/crypto/codec";
import { randomBytes } from "@noble/hashes/utils.js";
import { useCryptoStore } from "@/stores/crypto-store";

type InviteRecord = {
  id: string;
  code: string;
  passwordProtected: boolean;
  usesRemaining: number | null;
  expiresAt: string | null;
  createdAt: string;
};

type Props = {
  stashId: string;
  stashPreviewName: string;
};

export function InviteManager({ stashId, stashPreviewName }: Props) {
  const getStashKey = useCryptoStore((s) => s.getStashKey);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [loading, setLoading] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/stash/${stashId}/invite`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setInvites(data))
      .catch(() => {});
  }, [stashId]);

  async function handleCreate() {
    const stashKey = getStashKey(stashId);
    if (!stashKey) {
      setError("Stash key not loaded");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let inviteKey: Uint8Array;
      let salt = "";
      let keyFragment = "";

      if (password) {
        const saltBytes = randomBytes(16);
        salt = toBase64(saltBytes);
        const { argon2id } = await import("hash-wasm");
        inviteKey = (await argon2id({
          password,
          salt: saltBytes,
          parallelism: 1,
          iterations: 3,
          memorySize: 65536,
          hashLength: 32,
          outputType: "binary",
        })) as Uint8Array;
      } else {
        inviteKey = randomBytes(32);
        keyFragment = "#k=" + Buffer.from(inviteKey).toString("base64url");
      }

      const payload = JSON.stringify({
        stashKey: toBase64(stashKey),
        previewName: stashPreviewName,
      });
      const encryptedPayload = JSON.stringify(
        encryptAesGcm(toUtf8(payload), inviteKey)
      );

      const res = await fetch(`/api/stash/${stashId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedPayload,
          salt,
          passwordProtected: !!password,
          usesRemaining: maxUses ? parseInt(maxUses, 10) : null,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create invite");
        return;
      }

      const { code } = await res.json();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const link = `${appUrl}/invite/${code}${keyFragment}`;

      setNewLink(link);
      setInvites((prev) => [
        {
          id: code,
          code,
          passwordProtected: !!password,
          usesRemaining: maxUses ? parseInt(maxUses, 10) : null,
          expiresAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setPassword("");
      setMaxUses("");
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Invite links</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setNewLink(null); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create invite link</DialogTitle>
              <DialogDescription>
                Share this link to invite someone. The link contains an encrypted
                copy of the stash key.
              </DialogDescription>
            </DialogHeader>

            {newLink ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Copy this link and share it. Anyone with it can join.
                </p>
                <div className="flex gap-2">
                  <Input value={newLink} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyLink(newLink)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600">Copied to clipboard!</p>
                )}
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="inv-password">
                    Password{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="inv-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank for passwordless"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-uses">
                    Max uses{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="inv-uses"
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    disabled={loading}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}

            <DialogFooter>
              {newLink ? (
                <Button onClick={() => setOpen(false)}>Done</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={loading}>
                    {loading ? "Generating…" : "Create"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invite links yet.</p>
      ) : (
        <ul className="space-y-2">
          {invites.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
            >
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-mono text-xs truncate flex-1">{inv.code}</span>
              {inv.passwordProtected && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  password
                </span>
              )}
              {inv.usesRemaining !== null && (
                <span className="text-xs text-muted-foreground">
                  {inv.usesRemaining} left
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
