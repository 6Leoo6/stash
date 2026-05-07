import { describe, it, expect } from "vitest";
import {
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toUtf8,
} from "../../../lib/crypto/codec";

describe("toBase64 / fromBase64", () => {
  it("encodes known bytes to correct base64", () => {
    // "Hello" = [72, 101, 108, 108, 111]
    expect(toBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8=");
  });

  it("round-trips arbitrary bytes", () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 255]);
    expect(fromBase64(toBase64(original))).toEqual(original);
  });

  it("encodes empty array to empty string", () => {
    expect(toBase64(new Uint8Array([]))).toBe("");
  });

  it("decodes empty string to empty Uint8Array", () => {
    expect(fromBase64("")).toEqual(new Uint8Array([]));
  });

  it("decodes back to original 32-byte value", () => {
    const bytes = new Uint8Array(32).fill(0xab);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });
});

describe("toBase64Url", () => {
  it("produces no standard base64 special characters", () => {
    for (let i = 0; i < 256; i++) {
      const result = toBase64Url(new Uint8Array([i, i ^ 0xff, i ^ 0x55]));
      expect(result).not.toMatch(/[+/=]/);
    }
  });

  it("replaces + with -", () => {
    // [0xfb, 0xef, 0xbe] standard base64 contains '+'
    const bytes = new Uint8Array([0xfb, 0xef, 0xbe]);
    expect(toBase64(bytes)).toContain("+");
    expect(toBase64Url(bytes)).toContain("-");
    expect(toBase64Url(bytes)).not.toContain("+");
  });

  it("replaces / with _", () => {
    // [0xff, 0xff, 0xff] standard base64 contains '/'
    const bytes = new Uint8Array([0xff, 0xff, 0xff]);
    expect(toBase64(bytes)).toContain("/");
    expect(toBase64Url(bytes)).toContain("_");
    expect(toBase64Url(bytes)).not.toContain("/");
  });

  it("strips padding from output", () => {
    // 5 bytes → 8 base64 chars with one '=' pad
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    expect(toBase64(bytes)).toContain("=");
    expect(toBase64Url(bytes)).not.toContain("=");
  });
});

describe("fromBase64Url", () => {
  it("round-trips bytes through toBase64Url", () => {
    const original = new Uint8Array([0, 127, 128, 255, 1, 2, 3]);
    expect(fromBase64Url(toBase64Url(original))).toEqual(original);
  });

  it("handles 1-byte input (length % 4 == 2 — needs 2 padding chars)", () => {
    const bytes = new Uint8Array([0x42]);
    const encoded = toBase64Url(bytes);
    expect(encoded.length % 4).toBe(2);
    expect(fromBase64Url(encoded)).toEqual(bytes);
  });

  it("handles 2-byte input (length % 4 == 3 — needs 1 padding char)", () => {
    const bytes = new Uint8Array([0x42, 0x43]);
    const encoded = toBase64Url(bytes);
    expect(encoded.length % 4).toBe(3);
    expect(fromBase64Url(encoded)).toEqual(bytes);
  });

  it("handles 3-byte input (length % 4 == 0 — no padding needed)", () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe]);
    const encoded = toBase64Url(bytes);
    expect(encoded.length % 4).toBe(0);
    expect(fromBase64Url(encoded)).toEqual(bytes);
  });

  it("round-trips 32-byte value (typical key/token size)", () => {
    const key = new Uint8Array(32).fill(0x7f);
    expect(fromBase64Url(toBase64Url(key))).toEqual(key);
  });
});

describe("toUtf8", () => {
  it("encodes ASCII string to correct bytes", () => {
    expect(toUtf8("hello")).toEqual(
      new Uint8Array([104, 101, 108, 108, 111])
    );
  });

  it("encodes empty string to empty array", () => {
    expect(toUtf8("")).toEqual(new Uint8Array([]));
  });

  it("encodes multi-byte unicode characters", () => {
    const encoded = toUtf8("ő"); // U+0151, 2-byte UTF-8: 0xC5 0x91
    expect(encoded).toEqual(new Uint8Array([0xc5, 0x91]));
  });
});
