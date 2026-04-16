"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCryptoStore } from "@/stores/crypto-store";
import { ListingForm } from "@/components/listing/listing-form";

export default function NewListingPage() {
  const { stashId } = useParams<{ stashId: string }>();
  const getStashKey = useCryptoStore((s) => s.getStashKey);
  const stashKey = getStashKey(stashId);
  const [currentEpoch, setCurrentEpoch] = useState(0);

  useEffect(() => {
    fetch(`/api/stash/${stashId}`)
      .then((r) => r.json())
      .then((data) => setCurrentEpoch(data.currentEpoch ?? 0))
      .catch(() => {});
  }, [stashId]);

  if (!stashKey) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-muted-foreground">Loading stash…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">New listing</h1>
      <ListingForm stashId={stashId} currentEpoch={currentEpoch} stashKey={stashKey} />
    </main>
  );
}
