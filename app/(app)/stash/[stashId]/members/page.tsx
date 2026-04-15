"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { decryptAesGcm } from "@/lib/crypto/encryption";
import { deriveMemberKeyPair } from "@/lib/crypto/keys";
import { memberToken as computeMemberToken } from "@/lib/crypto/hash";
import { fromBase64 } from "@/lib/crypto/codec";
import { useCryptoStore } from "@/stores/crypto-store";
import { MemberList } from "@/components/member/member-list";
import { InviteManager } from "@/components/member/invite-manager";
import { Separator } from "@/components/ui/separator";
import type { DecryptedMetadata } from "@/types/stash";
import type { EncryptedField } from "@/types/crypto";

export default function MembersPage() {
  const { stashId } = useParams<{ stashId: string }>();
  const { identity, getStashKey } = useCryptoStore();
  const [metadata, setMetadata] = useState<DecryptedMetadata | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function load() {
      const stashKey = getStashKey(stashId);
      if (!stashKey || !identity) return;

      const res = await fetch(`/api/stash/${stashId}`);
      if (!res.ok) return;

      const { encryptedMetadata, ownerMemberToken } = await res.json();
      try {
        const field: EncryptedField = JSON.parse(encryptedMetadata);
        const bytes = decryptAesGcm(field, stashKey);
        const meta: DecryptedMetadata = JSON.parse(new TextDecoder().decode(bytes));
        setMetadata(meta);
        setPreviewName(meta.name);

        // Check if current user is the owner
        const memberKeys = deriveMemberKeyPair(identity.identityPrivKey, stashId);
        const myToken = computeMemberToken(memberKeys.publicKey);
        setIsOwner(myToken === ownerMemberToken);
      } catch {
        // Decryption failed
      }
    }
    load();
  }, [stashId, identity, getStashKey]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members are identified by pseudonymous tokens only.
        </p>
      </div>

      <MemberList metadata={metadata} />

      {isOwner && (
        <>
          <Separator />
          <InviteManager stashId={stashId} stashPreviewName={previewName} />
        </>
      )}
    </main>
  );
}
