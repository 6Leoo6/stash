import { sha256 } from "@noble/hashes/sha2.js";
import { toBase64 } from "./codec";

export function hashBytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}

/** Generates a pseudonymous member token from a member's public key. */
export function memberToken(publicKey: Uint8Array): string {
  return toBase64(sha256(publicKey));
}
