"use client";

import { useDecrypted } from "@/hooks/use-decrypted";
import type { DecryptedOrder } from "@/types/stash";

type Props = {
  id: string;
  listingId: string;
  encryptedContent: string;
  epoch: number;
  stashKey: Uint8Array | null;
  onStatusChange?: (orderId: string, status: DecryptedOrder["status"], current: DecryptedOrder) => void;
};

const STATUS_LABELS: Record<DecryptedOrder["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<DecryptedOrder["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fulfilled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
};

export function OrderCard({ id, listingId, encryptedContent, epoch, stashKey, onStatusChange }: Props) {
  const order = useDecrypted<DecryptedOrder>(encryptedContent, stashKey, epoch);

  if (!order) {
    return (
      <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground italic">
        Encrypted order
      </div>
    );
  }

  const nextStatuses: DecryptedOrder["status"][] = [];
  if (order.status === "pending") nextStatuses.push("accepted", "cancelled");
  if (order.status === "accepted") nextStatuses.push("fulfilled", "cancelled");

  return (
    <div className="rounded-lg border px-4 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted-foreground truncate">
          Order {id.slice(0, 8)}…
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Quantity: </span>
          {order.quantity}
        </p>
        {order.notes && (
          <p>
            <span className="text-muted-foreground">Notes: </span>
            {order.notes}
          </p>
        )}
        <p className="font-mono text-xs text-muted-foreground truncate">
          Buyer: {order.buyerToken.slice(0, 16)}…
        </p>
      </div>

      {onStatusChange && nextStatuses.length > 0 && (
        <div className="flex gap-2 pt-1">
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(id, s, order)}
              className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
            >
              Mark {STATUS_LABELS[s].toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
