"use client";

import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDecrypted } from "@/hooks/use-decrypted";
import type { DecryptedListing } from "@/types/stash";

type Props = {
  id: string;
  encryptedContent: string;
  epoch: number;
  stashKey: Uint8Array | null;
  onOrder?: (listingId: string, listing: DecryptedListing) => void;
};

export function ListingCard({ id, encryptedContent, epoch, stashKey, onOrder }: Props) {
  const listing = useDecrypted<DecryptedListing>(encryptedContent, stashKey, epoch);

  if (!listing) {
    return (
      <div className="rounded-lg border px-4 py-3 flex items-center gap-3 text-muted-foreground text-sm">
        <Package className="h-4 w-4 shrink-0" />
        <span className="italic">Encrypted listing</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border px-4 py-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{listing.title}</p>
          {listing.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {listing.description}
            </p>
          )}
        </div>
        <span className="text-sm font-semibold shrink-0">{listing.price}</span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-muted-foreground">
          {listing.stock > 0 ? `${listing.stock} in stock` : "Out of stock"}
        </span>
        {onOrder && listing.stock > 0 && (
          <Button size="sm" variant="outline" onClick={() => onOrder(id, listing)}>
            Place order
          </Button>
        )}
      </div>
    </div>
  );
}
