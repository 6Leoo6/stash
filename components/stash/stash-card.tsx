"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DecryptedPreview } from "@/types/stash";

type Props = {
  stashId: string;
  preview: DecryptedPreview | null;
};

export function StashCard({ stashId, preview }: Props) {
  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <CardTitle className="text-base">
            {preview?.name ?? "Encrypted stash"}
          </CardTitle>
        </div>
        {preview?.description && (
          <CardDescription className="line-clamp-2">
            {preview.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/stash/${stashId}`}>
            Enter
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
