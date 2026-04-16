"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type Props = {
  stashId: string;
  stashName?: string;
};

const SECTION_LABELS: Record<string, string> = {
  listings: "Listings",
  orders: "Orders",
  members: "Members",
};

export function StashNav({ stashId, stashName }: Props) {
  const pathname = usePathname();
  const section = pathname.split("/").at(-1) ?? "";
  const label = SECTION_LABELS[section];

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link
        href={`/stash/${stashId}`}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {stashName ?? "Stash"}
      </Link>
      {label && (
        <>
          <span>/</span>
          <span className="text-foreground font-medium">{label}</span>
        </>
      )}
    </nav>
  );
}
