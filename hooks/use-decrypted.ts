"use client";

import { useMemo } from "react";
import { decryptAesGcm, deriveEpochKey } from "@/lib/crypto/encryption";
import type { EncryptedField } from "@/types/crypto";

export function useDecrypted<T>(
  encryptedContent: string,
  stashKey: Uint8Array | null,
  epoch: number
): T | null {
  return useMemo(() => {
    if (!stashKey) return null;
    try {
      const epochKey = deriveEpochKey(stashKey, epoch);
      const field: EncryptedField = JSON.parse(encryptedContent);
      const bytes = decryptAesGcm(field, epochKey);
      return JSON.parse(new TextDecoder().decode(bytes)) as T;
    } catch {
      return null;
    }
  }, [encryptedContent, stashKey, epoch]);
}
