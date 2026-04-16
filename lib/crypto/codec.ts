export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function fromBase64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, "base64"));
}

/** base64url (no padding, URL-safe alphabet) — safe in all environments. */
export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function fromBase64Url(str: string): Uint8Array {
  // Re-add padding and convert back to standard base64
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return fromBase64(pad ? padded + "=".repeat(4 - pad) : padded);
}

export function toUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}
