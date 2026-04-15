"use client";

import { useEffect, useState } from "react";
import { openEcies } from "@/lib/crypto/ecies";
import { fromBase64, toUtf8 } from "@/lib/crypto/codec";
import { useCryptoStore } from "@/stores/crypto-store";
import { StashCard } from "@/components/stash/stash-card";
import { CreateStashDialog } from "@/components/stash/create-stash-dialog";
import type { StashRow, DecryptedPreview } from "@/types/stash";
import type { EciesPayload } from "@/types/crypto";

type StashWithPreview = StashRow & { preview: DecryptedPreview | null };

export default function DashboardPage() {
  const { identity } = useCryptoStore();
  const [stashes, setStashes] = useState<StashWithPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!identity) return;

      const res = await fetch("/api/stash");
      if (!res.ok) return;

      const rows: StashRow[] = await res.json();

      const withPreviews = rows.map((row) => {
        let preview: DecryptedPreview | null = null;
        try {
          const payload: EciesPayload = JSON.parse(row.encryptedPreview);
          const bytes = openEcies(payload, identity.identityPrivKey);
          preview = JSON.parse(new TextDecoder().decode(bytes));
        } catch {
          // Silently ignore decryption failures — show placeholder
        }
        return { ...row, preview };
      });

      setStashes(withPreviews);
      setLoading(false);
    }

    load();
  }, [identity]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your stashes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All content is encrypted end-to-end.
          </p>
        </div>
        <CreateStashDialog />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 rounded-xl border bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : stashes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">No stashes yet.</p>
          <CreateStashDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stashes.map((s) => (
            <StashCard key={s.id} stashId={s.id} preview={s.preview} />
          ))}
        </div>
      )}
    </main>
  );
}
