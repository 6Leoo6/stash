"use client";

import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { toUtf8, toBase64, fromBase64 } from "./codec";
import type { EncryptedField } from "@/types/crypto";

export function encryptAesGcm(
  plaintext: Uint8Array,
  key: Uint8Array
): EncryptedField {
  const iv = randomBytes(12);
  const ciphertext = gcm(key, iv).encrypt(plaintext);
  return {
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

export function decryptAesGcm(
  field: EncryptedField,
  key: Uint8Array
): Uint8Array {
  const iv = fromBase64(field.iv);
  const ciphertext = fromBase64(field.ciphertext);
  return gcm(key, iv).decrypt(ciphertext);
}

/**
 * Derives the AES-GCM encryption key for a given stash epoch.
 * epoch increments every time a member is kicked (re-key event).
 */
export function deriveEpochKey(stashKey: Uint8Array, epoch: number): Uint8Array {
  const info = toUtf8(`epoch-${epoch}`);
  return hkdf(sha256, stashKey, undefined, info, 32);
}
