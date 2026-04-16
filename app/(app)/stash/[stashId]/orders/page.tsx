"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCryptoStore } from "@/stores/crypto-store";
import { OrderCard } from "@/components/order/order-card";
import { encryptAesGcm, deriveEpochKey } from "@/lib/crypto/encryption";
import { toUtf8 } from "@/lib/crypto/codec";
import type { DecryptedOrder } from "@/types/stash";

type OrderRow = {
  id: string;
  listingId: string;
  encryptedContent: string;
  epoch: number;
  createdAt: string;
};

export default function OrdersPage() {
  const { stashId } = useParams<{ stashId: string }>();
  const getStashKey = useCryptoStore((s) => s.getStashKey);
  const stashKey = getStashKey(stashId);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState(0);

  useEffect(() => {
    async function load() {
      const [ordersRes, stashRes] = await Promise.all([
        fetch(`/api/stash/${stashId}/orders`),
        fetch(`/api/stash/${stashId}`),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (stashRes.ok) {
        const { currentEpoch: epoch } = await stashRes.json();
        setCurrentEpoch(epoch ?? 0);
      }
    }
    load();
  }, [stashId]);

  const handleStatusChange = useCallback(
    async (
      orderId: string,
      newStatus: DecryptedOrder["status"],
      current: DecryptedOrder
    ) => {
      if (!stashKey) return;

      try {
        const epochKey = deriveEpochKey(stashKey, currentEpoch);
        const updated = { ...current, status: newStatus };
        const encryptedContent = JSON.stringify(
          encryptAesGcm(toUtf8(JSON.stringify(updated)), epochKey)
        );

        const res = await fetch(`/api/stash/${stashId}/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encryptedContent, epoch: currentEpoch }),
        });

        if (res.ok) {
          // Re-fetch to get the updated ciphertext
          const ordersRes = await fetch(`/api/stash/${stashId}/orders`);
          if (ordersRes.ok) setOrders(await ordersRes.json());
        }
      } catch {
        // silent — user can retry
      }
    },
    [stashId, stashKey, currentEpoch]
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((row) => (
            <li key={row.id}>
              <OrderCard
                id={row.id}
                listingId={row.listingId}
                encryptedContent={row.encryptedContent}
                epoch={row.epoch}
                stashKey={stashKey}
                onStatusChange={handleStatusChange}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
