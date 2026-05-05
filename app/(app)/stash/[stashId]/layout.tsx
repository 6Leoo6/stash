"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCryptoStore } from "@/stores/crypto-store";
import { useStashAuth } from "@/hooks/use-stash-auth";

export default function StashLayout({ children }: { children: React.ReactNode }) {
  const { stashId } = useParams<{ stashId: string }>();
  const identity = useCryptoStore((s) => s.identity);
  const router = useRouter();
  const { state, error, authenticate } = useStashAuth(stashId);

  useEffect(() => {
    if (!identity) {
      router.push(`/login?redirect=/stash/${stashId}`);
      return;
    }
    if (state === "idle") {
      authenticate();
    }
  }, [identity, state, authenticate, router]);

  if (state === "loading" || state === "idle") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Verifying access…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-destructive font-medium">Access denied</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <>{children}</>;
}
