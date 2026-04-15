import { randomBytes } from "@noble/hashes/utils.js";
import { toBase64 } from "@/lib/crypto/codec";
import type { MemberSlot } from "@/types/crypto";

const SLOT_CAPACITY = 16;

/** Generates a dummy slot indistinguishable from a real one. */
export function generateDummySlot(): MemberSlot {
  return {
    token: toBase64(randomBytes(32)),
    publicKey: toBase64(randomBytes(32)),
    encryptedStashKey: toBase64(randomBytes(80)),
  };
}

/**
 * Pads an array of real slots with dummy entries to the next multiple of
 * SLOT_CAPACITY, then shuffles so real slot positions are hidden.
 */
export function padSlots(realSlots: MemberSlot[]): MemberSlot[] {
  const capacity =
    Math.max(1, Math.ceil(realSlots.length / SLOT_CAPACITY)) * SLOT_CAPACITY;

  const slots: MemberSlot[] = [...realSlots];
  while (slots.length < capacity) {
    slots.push(generateDummySlot());
  }

  // Fisher-Yates shuffle using crypto random bytes
  for (let i = slots.length - 1; i > 0; i--) {
    const rand = randomBytes(4);
    const j = new DataView(rand.buffer).getUint32(0) % (i + 1);
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return slots;
}

export function findSlotByToken(
  slots: MemberSlot[],
  token: string
): MemberSlot | null {
  return slots.find((s) => s.token === token) ?? null;
}

export function replaceSlot(
  slots: MemberSlot[],
  token: string,
  replacement: MemberSlot
): MemberSlot[] {
  return slots.map((s) => (s.token === token ? replacement : s));
}
