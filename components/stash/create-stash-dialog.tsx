"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateX25519KeyPair, deriveMemberKeyPair } from "@/lib/crypto/keys";
import { encryptAesGcm } from "@/lib/crypto/encryption";
import { sealEcies } from "@/lib/crypto/ecies";
import { memberToken } from "@/lib/crypto/hash";
import { toBase64, toUtf8 } from "@/lib/crypto/codec";
import { padSlots } from "@/lib/stash/slots";
import { randomBytes } from "@noble/hashes/utils.js";
import { useCryptoStore } from "@/stores/crypto-store";
import type { DecryptedMetadata, DecryptedPreview } from "@/types/stash";

export function CreateStashDialog() {
  const router = useRouter();
  const { identity } = useCryptoStore();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!identity) return;
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stashId = crypto.randomUUID();
      const stashKey = randomBytes(32);

      // Derive owner's stash-specific key pair
      const memberKeys = deriveMemberKeyPair(identity.identityPrivKey, stashId);
      const ownerToken = memberToken(memberKeys.publicKey);

      // Encrypt stash metadata with stash key
      const metadata: DecryptedMetadata = {
        name: name.trim(),
        description: description.trim(),
        members: {
          [ownerToken]: {
            nickname: "Owner",
            joinedAt: new Date().toISOString(),
          },
        },
      };
      const encryptedMetadata = JSON.stringify(
        encryptAesGcm(toUtf8(JSON.stringify(metadata)), stashKey)
      );

      // Encrypt preview with owner's identity key (for fast dashboard listing)
      const preview: DecryptedPreview = {
        name: name.trim(),
        description: description.trim(),
      };
      const encryptedPreview = JSON.stringify(
        sealEcies(toUtf8(JSON.stringify(preview)), identity.identityPubKey)
      );

      // Create owner's member slot
      const ownerSlot = {
        token: ownerToken,
        publicKey: toBase64(memberKeys.publicKey),
        encryptedStashKey: JSON.stringify(
          sealEcies(stashKey, memberKeys.publicKey)
        ),
      };

      // Pad with dummy slots to hide member count
      const memberSlots = padSlots([ownerSlot]);

      const res = await fetch("/api/stash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: stashId,
          encryptedMetadata,
          encryptedPreview,
          ownerMemberToken: ownerToken,
          memberSlots,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create stash");
        return;
      }

      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
      router.push(`/stash/${stashId}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New stash
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a stash</DialogTitle>
          <DialogDescription>
            Your stash name and contents are encrypted on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="stash-name">Name</Label>
            <Input
              id="stash-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My private market"
              maxLength={64}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stash-desc">Description</Label>
            <Textarea
              id="stash-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this stash for?"
              maxLength={256}
              rows={3}
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Encrypting…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
