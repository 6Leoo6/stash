import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { hashBytes, memberToken } from "../../../lib/crypto/hash";
import { fromBase64 } from "../../../lib/crypto/codec";

describe("hashBytes", () => {
  it("produces exactly 32 bytes", () => {
    expect(hashBytes(new Uint8Array([1, 2, 3])).length).toBe(32);
  });

  it("is deterministic", () => {
    const input = new Uint8Array([10, 20, 30, 40, 50]);
    expect(hashBytes(input)).toEqual(hashBytes(input));
  });

  it("matches Node.js built-in SHA-256", () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const expected = new Uint8Array(
      createHash("sha256").update(input).digest()
    );
    expect(hashBytes(input)).toEqual(expected);
  });

  it("produces different output for different inputs", () => {
    expect(hashBytes(new Uint8Array([1]))).not.toEqual(
      hashBytes(new Uint8Array([2]))
    );
  });

  it("known vector: SHA-256 of empty input", () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const expected = new Uint8Array(
      Buffer.from(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "hex"
      )
    );
    expect(hashBytes(new Uint8Array([]))).toEqual(expected);
  });

  it("known vector: SHA-256 of 'abc' matches Node.js built-in", () => {
    const input = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
    const expected = new Uint8Array(
      createHash("sha256").update(input).digest()
    );
    expect(hashBytes(input)).toEqual(expected);
  });
});

describe("memberToken", () => {
  it("returns a non-empty string", () => {
    const token = memberToken(new Uint8Array(32).fill(1));
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("returns a base64 string that decodes to 32 bytes", () => {
    const token = memberToken(new Uint8Array(32).fill(7));
    const decoded = fromBase64(token);
    expect(decoded.length).toBe(32);
  });

  it("is deterministic", () => {
    const pubKey = new Uint8Array(32).fill(42);
    expect(memberToken(pubKey)).toBe(memberToken(pubKey));
  });

  it("different public keys produce different tokens", () => {
    const key1 = new Uint8Array(32).fill(1);
    const key2 = new Uint8Array(32).fill(2);
    expect(memberToken(key1)).not.toBe(memberToken(key2));
  });

  it("token is the base64 of SHA-256(publicKey)", () => {
    const pubKey = new Uint8Array(32).fill(99);
    const expectedHash = new Uint8Array(
      createHash("sha256").update(pubKey).digest()
    );
    const expectedToken = Buffer.from(expectedHash).toString("base64");
    expect(memberToken(pubKey)).toBe(expectedToken);
  });
});
