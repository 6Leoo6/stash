"use client";

import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { toUtf8 } from "./codec";

export type KeyPair = {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
};

export function generateX25519KeyPair(): KeyPair {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Derives a stash-specific key pair from the user's identity private key.
 * Output is deterministic and pseudonymous — not linkable to the identity
 * key without the private key.
 */
export function deriveMemberKeyPair(
  identityPrivKey: Uint8Array,
  stashId: string
): KeyPair {
  const salt = toUtf8(stashId);
  const info = toUtf8("stash-member-key-v1");
  const privateKey = hkdf(sha256, identityPrivKey, salt, info, 32);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}
