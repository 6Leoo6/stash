"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListingCard } from "@/components/listing/listing-card";
import { encryptAesGcm, deriveEpochKey } from "@/lib/crypto/encryption";
import { toUtf8 } from "@/lib/crypto/codec";
import { deriveMemberKeyPair } from "@/lib/crypto/keys";
import { memberToken as computeMemberToken } from "@/lib/crypto/hash";
import { useCryptoStore } from "@/stores/crypto-store";
import type { DecryptedListing } from "@/types/stash";

type ListingRow = {
  id: string;
  encryptedContent: string;
  epoch: number;
  createdAt: string;
};

type OrderDialogState = {
  listingId: string;
  listing: DecryptedListing;
} | null;

export default function ListingsPage() {
  const { stashId } = useParams<{ stashId: string }>();
  const { identity, getStashKey } = useCryptoStore();
  const stashKey = getStashKey(stashId);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [orderDialog, setOrderDialog] = useState<OrderDialogState>(null);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [listingsRes, stashRes] = await Promise.all([
        fetch(`/api/stash/${stashId}/listings`),
        fetch(`/api/stash/${stashId}`),
      ]);
      if (listingsRes.ok) setListings(await listingsRes.json());
      if (stashRes.ok) {
        const { currentEpoch: epoch } = await stashRes.json();
        setCurrentEpoch(epoch ?? 0);
      }
    }
    load();
  }, [stashId]);

  async function handleOrder() {
    if (!orderDialog || !stashKey || !identity) return;
    setOrdering(true);
    setOrderError(null);

    try {
      const epochKey = deriveEpochKey(stashKey, currentEpoch);
      const memberKeys = deriveMemberKeyPair(identity.identityPrivKey, stashId);
      const buyerToken = computeMemberToken(memberKeys.publicKey);

      const payload = JSON.stringify({
        quantity: parseInt(quantity, 10),
        notes,
        buyerToken,
        status: "pending",
      });
      const encryptedContent = JSON.stringify(
        encryptAesGcm(toUtf8(payload), epochKey)
      );

      const res = await fetch(`/api/stash/${stashId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: orderDialog.listingId,
          encryptedContent,
          epoch: currentEpoch,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setOrderError(data.error ?? "Failed to place order");
        return;
      }

      setOrderDialog(null);
      setQuantity("1");
      setNotes("");
    } catch {
      setOrderError("Something went wrong");
    } finally {
      setOrdering(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Listings</h1>
        <Button size="sm" asChild>
          <Link href={`/stash/${stashId}/listings/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New listing
          </Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No listings yet.</p>
      ) : (
        <ul className="space-y-3">
          {listings.map((row) => (
            <li key={row.id}>
              <ListingCard
                id={row.id}
                encryptedContent={row.encryptedContent}
                epoch={row.epoch}
                stashKey={stashKey}
                onOrder={(id, listing) => {
                  setOrderDialog({ listingId: id, listing });
                  setQuantity("1");
                  setNotes("");
                  setOrderError(null);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!orderDialog} onOpenChange={(v) => !v && setOrderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place order — {orderDialog?.listing.title}</DialogTitle>
            <DialogDescription>
              Your order is encrypted before sending. The server sees only ciphertext.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={ordering}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery info, preferences…"
                disabled={ordering}
              />
            </div>
            {orderError && (
              <p className="text-sm text-destructive">{orderError}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOrderDialog(null)} disabled={ordering}>
              Cancel
            </Button>
            <Button onClick={handleOrder} disabled={ordering}>
              {ordering ? "Placing…" : "Place order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
