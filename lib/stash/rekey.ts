"use client";

import { randomBytes } from "@noble/hashes/utils.js";
import { sealEcies } from "@/lib/crypto/ecies";
import { encryptAesGcm } from "@/lib/crypto/encryption";
import { toBase64, toUtf8, fromBase64 } from "@/lib/crypto/codec";
import { padSlots, generateDummySlot } from "@/lib/stash/slots";
import type { MemberSlot } from "@/types/crypto";
import type { DecryptedMetadata } from "@/types/stash";

export type RekeyResult = {
  newMemberSlots: MemberSlot[];
  newEncryptedMetadata: string;
  newStashKey: Uint8Array;
};

/**
 * Generates a new stash key, re-encrypts it for all remaining members
 * (identified by their public keys stored in slots), and re-encrypts
 * the metadata with the kicked member removed from the member index.
 *
 * The caller must supply:
 * - currentSlots: the full padded slot array from the server
 * - realTokens: the tokens of members still in the stash (all tokens except kicked one)
 * - currentMetadata: decrypted metadata (to rebuild member index without kicked member)
 * - kickedToken: the token being removed
 */
export function rekeyStash(
  currentSlots: MemberSlot[],
  realTokens: string[],
  currentMetadata: DecryptedMetadata,
  kickedToken: string
): RekeyResult {
  const newStashKey = randomBytes(32);

  // Re-encrypt newStashKey for each remaining real member using their stored pubkey
  const newRealSlots: MemberSlot[] = [];
  for (const slot of currentSlots) {
    if (!realTokens.includes(slot.token)) continue;
    const pubKeyBytes = fromBase64(slot.publicKey);
    newRealSlots.push({
      token: slot.token,
      publicKey: slot.publicKey,
      encryptedStashKey: JSON.stringify(sealEcies(newStashKey, pubKeyBytes)),
    });
  }

  const newMemberSlots = padSlots(newRealSlots);

  // Rebuild metadata without kicked member
  const { [kickedToken]: _removed, ...remainingMembers } = currentMetadata.members;
  const newMetadata: DecryptedMetadata = {
    ...currentMetadata,
    members: remainingMembers,
  };

  const newEncryptedMetadata = JSON.stringify(
    encryptAesGcm(toUtf8(JSON.stringify(newMetadata)), newStashKey)
  );

  return { newMemberSlots, newEncryptedMetadata, newStashKey };
}
