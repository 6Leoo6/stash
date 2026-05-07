"use client";

import { User, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DecryptedMetadata } from "@/types/stash";

type Props = {
  metadata: DecryptedMetadata | null;
  ownerToken?: string;
  myToken?: string;
  onKick?: (token: string) => void;
  kicking?: string | null;
};

export function MemberList({ metadata, ownerToken, myToken, onKick, kicking }: Props) {
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
            <p className="text-sm font-medium truncate">
              {entry.nickname}
              {token === ownerToken && (
                <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                  owner
                </span>
              )}
              {token === myToken && token !== ownerToken && (
                <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                  you
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {token.slice(0, 16)}…
            </p>
          </div>
          <span className="hidden sm:block text-xs text-muted-foreground shrink-0">
            {new Date(entry.joinedAt).toLocaleDateString()}
          </span>
          {onKick && token !== ownerToken && token !== myToken && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
              onClick={() => onKick(token)}
              disabled={kicking === token}
              title="Kick member"
            >
              <UserMinus className="h-3.5 w-3.5" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
