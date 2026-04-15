"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Package, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { decryptAesGcm } from "@/lib/crypto/encryption";
import { fromBase64 } from "@/lib/crypto/codec";
import { useCryptoStore } from "@/stores/crypto-store";
import type { DecryptedMetadata } from "@/types/stash";
import type { EncryptedField } from "@/types/crypto";

export default function StashPage() {
  const { stashId } = useParams<{ stashId: string }>();
  const getStashKey = useCryptoStore((s) => s.getStashKey);
  const [metadata, setMetadata] = useState<DecryptedMetadata | null>(null);

  useEffect(() => {
    async function load() {
      const stashKey = getStashKey(stashId);
      if (!stashKey) return;

      const res = await fetch(`/api/stash/${stashId}`);
      if (!res.ok) return;

      const { encryptedMetadata } = await res.json();
      try {
        const field: EncryptedField = JSON.parse(encryptedMetadata);
        const bytes = decryptAesGcm(field, stashKey);
        setMetadata(JSON.parse(new TextDecoder().decode(bytes)));
      } catch {
        // Decryption failed — stale key or corrupted data
      }
    }
    load();
  }, [stashId, getStashKey]);

  const memberCount = metadata
    ? Object.keys(metadata.members).length
    : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {metadata?.name ?? "Loading…"}
        </h1>
        {metadata?.description && (
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        )}
        {memberCount !== null && (
          <p className="text-xs text-muted-foreground mt-2">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <NavCard
          href={`/stash/${stashId}/listings`}
          icon={<Package className="h-5 w-5" />}
          title="Listings"
          description="Browse and manage items for sale"
        />
        <NavCard
          href={`/stash/${stashId}/orders`}
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Orders"
          description="Track and fulfil orders"
        />
        <NavCard
          href={`/stash/${stashId}/members`}
          icon={<Users className="h-5 w-5" />}
          title="Members"
          description="Manage access and invites"
        />
      </div>
    </main>
  );
}

function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Button
      variant="outline"
      className="h-auto flex-col items-start gap-2 p-5 text-left"
      asChild
    >
      <Link href={href}>
        <span className="text-primary">{icon}</span>
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground font-normal">
          {description}
        </span>
      </Link>
    </Button>
  );
}
