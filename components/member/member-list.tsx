"use client";

import { User } from "lucide-react";
import type { DecryptedMetadata } from "@/types/stash";

type Props = {
  metadata: DecryptedMetadata | null;
};

export function MemberList({ metadata }: Props) {
  if (!metadata) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }

  const members = Object.entries(metadata.members);

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {members.map(([token, entry]) => (
        <li
          key={token}
          className="flex items-center gap-3 rounded-lg border px-4 py-3"
        >
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{entry.nickname}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {token.slice(0, 16)}…
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(entry.joinedAt).toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
