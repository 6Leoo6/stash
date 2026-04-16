"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { decryptAesGcm } from "@/lib/crypto/encryption";
import { deriveMemberKeyPair } from "@/lib/crypto/keys";
import { memberToken as computeMemberToken } from "@/lib/crypto/hash";
import { fromBase64 } from "@/lib/crypto/codec";
import { rekeyStash } from "@/lib/stash/rekey";
import { useCryptoStore } from "@/stores/crypto-store";
import { MemberList } from "@/components/member/member-list";
import { InviteManager } from "@/components/member/invite-manager";
import { Separator } from "@/components/ui/separator";
import type { DecryptedMetadata } from "@/types/stash";
import type { EncryptedField, MemberSlot } from "@/types/crypto";

export default function MembersPage() {
  const { stashId } = useParams<{ stashId: string }>();
  const { identity, getStashKey, setStashKey } = useCryptoStore();
  const stashKey = getStashKey(stashId);

  const [metadata, setMetadata] = useState<DecryptedMetadata | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [ownerToken, setOwnerToken] = useState("");
  const [myToken, setMyToken] = useState("");
  const [rawSlots, setRawSlots] = useState<MemberSlot[]>([]);
  const [kicking, setKicking] = useState<string | null>(null);
  const [kickError, setKickError] = useState<string | null>(null);

  const isOwner = !!ownerToken && myToken === ownerToken;

  useEffect(() => {
    async function load() {
      if (!stashKey || !identity) return;

      const res = await fetch(`/api/stash/${stashId}`);
      if (!res.ok) return;

      const { encryptedMetadata, ownerMemberToken, memberSlots } = await res.json();
      try {
        const field: EncryptedField = JSON.parse(encryptedMetadata);
        const bytes = decryptAesGcm(field, stashKey);
        const meta: DecryptedMetadata = JSON.parse(new TextDecoder().decode(bytes));
        setMetadata(meta);
        setPreviewName(meta.name);
        setOwnerToken(ownerMemberToken ?? "");
        setRawSlots(Array.isArray(memberSlots) ? memberSlots : []);

        const memberKeys = deriveMemberKeyPair(identity.identityPrivKey, stashId);
        setMyToken(computeMemberToken(memberKeys.publicKey));
      } catch {
        // Decryption failed
      }
    }
    load();
  }, [stashId, stashKey, identity]);

  const handleKick = useCallback(
    async (kickedToken: string) => {
      if (!metadata || !stashKey) return;
      setKicking(kickedToken);
      setKickError(null);

      try {
        // All known real member tokens minus the kicked one
        const realTokens = Object.keys(metadata.members).filter(
          (t) => t !== kickedToken
        );

        const { newMemberSlots, newEncryptedMetadata, newStashKey } = rekeyStash(
          rawSlots,
          realTokens,
          metadata,
          kickedToken
        );

        const res = await fetch(`/api/stash/${stashId}/members`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newMemberSlots, newEncryptedMetadata }),
        });

        if (!res.ok) {
          const data = await res.json();
          setKickError(data.error ?? "Failed to kick member");
          return;
        }

        // Update local state with new key and metadata
        setStashKey(stashId, newStashKey);
        const { [kickedToken]: _removed, ...remaining } = metadata.members;
        setMetadata({ ...metadata, members: remaining });
      } catch (err) {
        console.error(err);
        setKickError("Re-key failed. Try again.");
      } finally {
        setKicking(null);
      }
    },
    [metadata, stashKey, rawSlots, stashId, setStashKey]
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members are identified by pseudonymous tokens only.
        </p>
      </div>

      {kickError && (
        <p className="text-sm text-destructive">{kickError}</p>
      )}

      <MemberList
        metadata={metadata}
        ownerToken={ownerToken}
        myToken={myToken}
        onKick={isOwner ? handleKick : undefined}
        kicking={kicking}
      />

      {isOwner && (
        <>
          <Separator />
          <InviteManager stashId={stashId} stashPreviewName={previewName} />
        </>
      )}
    </main>
  );
}
