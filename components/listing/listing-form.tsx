"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { encryptAesGcm, deriveEpochKey } from "@/lib/crypto/encryption";
import { toUtf8 } from "@/lib/crypto/codec";

type Props = {
  stashId: string;
  currentEpoch: number;
  stashKey: Uint8Array;
};

export function ListingForm({ stashId, currentEpoch, stashKey }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const epochKey = deriveEpochKey(stashKey, currentEpoch);
      const payload = JSON.stringify({
        title,
        description,
        price,
        stock: parseInt(stock, 10),
      });
      const encryptedContent = JSON.stringify(
        encryptAesGcm(toUtf8(payload), epochKey)
      );

      const res = await fetch(`/api/stash/${stashId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedContent, epoch: currentEpoch }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create listing");
        return;
      }

      router.push(`/stash/${stashId}/listings`);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. €10"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Posting…" : "Post listing"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/stash/${stashId}/listings`)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
