"use client";

import { x25519 } from "@noble/curves/ed25519.js";
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes, concatBytes } from "@noble/hashes/utils.js";
import { toBase64, fromBase64 } from "./codec";
import type { EciesPayload } from "@/types/crypto";

const INFO = new TextEncoder().encode("ecies-v1");

/**
 * Encrypts plaintext to a recipient's X25519 public key.
 * Produces an ephemeral key pair and derives a shared AES-GCM key via ECDH + HKDF.
 */
export function sealEcies(
  plaintext: Uint8Array,
  recipientPublicKey: Uint8Array
): EciesPayload {
  const ephemeralPrivKey = x25519.utils.randomSecretKey();
  const ephemeralPubKey = x25519.getPublicKey(ephemeralPrivKey);

  const sharedSecret = x25519.getSharedSecret(ephemeralPrivKey, recipientPublicKey);
  const salt = concatBytes(ephemeralPubKey, recipientPublicKey);
  const encKey = hkdf(sha256, sharedSecret, salt, INFO, 32);

  const iv = randomBytes(12);
  const ciphertext = gcm(encKey, iv).encrypt(plaintext);

  return {
    ephemeralPublicKey: toBase64(ephemeralPubKey),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

/**
 * Decrypts an ECIES payload using the recipient's X25519 private key.
 */
export function openEcies(
  payload: EciesPayload,
  recipientPrivateKey: Uint8Array
): Uint8Array {
  const ephemeralPubKey = fromBase64(payload.ephemeralPublicKey);
  const recipientPublicKey = x25519.getPublicKey(recipientPrivateKey);

  const sharedSecret = x25519.getSharedSecret(recipientPrivateKey, ephemeralPubKey);
  const salt = concatBytes(ephemeralPubKey, recipientPublicKey);
  const encKey = hkdf(sha256, sharedSecret, salt, INFO, 32);

  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);

  return gcm(encKey, iv).decrypt(ciphertext);
}
