"use client";

import { argon2id } from "hash-wasm";
import { toUtf8 } from "./codec";

/**
 * Derives the 32-byte master key from username + password.
 * Uses the username as a deterministic salt so the same credentials
 * always produce the same key on any device.
 *
 * Only call from client-side code — requires WASM.
 */
export async function deriveMasterKey(
  password: string,
  username: string
): Promise<Uint8Array> {
  const salt = toUtf8(`stash:masterkey:${username.toLowerCase()}`);

  const result = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: "binary",
  });

  return result as Uint8Array;
}
