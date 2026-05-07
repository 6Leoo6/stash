import { describe, it, expect } from "vitest";
import {
  findSlotByToken,
  replaceSlot,
  padSlots,
} from "../../../lib/stash/slots";
import type { MemberSlot } from "../../../types/crypto";

const makeSlot = (token: string): MemberSlot => ({
  token,
  publicKey: `pk_${token}`,
  encryptedStashKey: `esk_${token}`,
});

describe("findSlotByToken", () => {
  it("returns null for an empty array", () => {
    expect(findSlotByToken([], "abc")).toBeNull();
  });

  it("returns null when token is not present", () => {
    const slots = [makeSlot("aaa"), makeSlot("bbb")];
    expect(findSlotByToken(slots, "ccc")).toBeNull();
  });

  it("finds a slot with a matching token", () => {
    const target = makeSlot("target");
    const slots = [makeSlot("aaa"), target, makeSlot("bbb")];
    expect(findSlotByToken(slots, "target")).toEqual(target);
  });

  it("returns the first match when duplicates exist", () => {
    const first: MemberSlot = { token: "dup", publicKey: "pk1", encryptedStashKey: "esk1" };
    const second: MemberSlot = { token: "dup", publicKey: "pk2", encryptedStashKey: "esk2" };
    expect(findSlotByToken([first, second], "dup")).toEqual(first);
  });

  it("does not mutate the input array", () => {
    const slots = [makeSlot("a"), makeSlot("b")];
    const copy = [...slots];
    findSlotByToken(slots, "a");
    expect(slots).toEqual(copy);
  });
});

describe("replaceSlot", () => {
  it("replaces the slot with the matching token", () => {
    const slots = [makeSlot("a"), makeSlot("b"), makeSlot("c")];
    const replacement: MemberSlot = { token: "b", publicKey: "pk_new", encryptedStashKey: "esk_new" };
    const result = replaceSlot(slots, "b", replacement);
    expect(result[1]).toEqual(replacement);
  });

  it("does not mutate the original array", () => {
    const slots = [makeSlot("a"), makeSlot("b")];
    const original = [...slots];
    replaceSlot(slots, "a", makeSlot("x"));
    expect(slots).toEqual(original);
  });

  it("leaves non-matching slots unchanged", () => {
    const slots = [makeSlot("a"), makeSlot("b"), makeSlot("c")];
    const result = replaceSlot(slots, "b", makeSlot("new_b"));
    expect(result[0]).toEqual(slots[0]);
    expect(result[2]).toEqual(slots[2]);
  });

  it("returns all original slots when token is not found", () => {
    const slots = [makeSlot("a"), makeSlot("b")];
    const result = replaceSlot(slots, "z", makeSlot("x"));
    expect(result).toEqual(slots);
  });

  it("preserves array length", () => {
    const slots = [makeSlot("a"), makeSlot("b"), makeSlot("c")];
    expect(replaceSlot(slots, "b", makeSlot("new")).length).toBe(3);
  });
});

describe("padSlots", () => {
  it("pads a single real slot to 16", () => {
    expect(padSlots([makeSlot("a")]).length).toBe(16);
  });

  it("output length is always a multiple of 16", () => {
    for (const count of [0, 1, 15, 16, 17, 32, 33]) {
      const slots = Array.from({ length: count }, (_, i) => makeSlot(`s${i}`));
      const result = padSlots(slots);
      expect(result.length % 16).toBe(0);
    }
  });

  it("does not shrink below 16 for an empty input", () => {
    expect(padSlots([]).length).toBe(16);
  });

  it("pads exactly 16 real slots to 16 (no extra tier needed)", () => {
    const slots = Array.from({ length: 16 }, (_, i) => makeSlot(`s${i}`));
    expect(padSlots(slots).length).toBe(16);
  });

  it("pads 17 real slots to 32", () => {
    const slots = Array.from({ length: 17 }, (_, i) => makeSlot(`s${i}`));
    expect(padSlots(slots).length).toBe(32);
  });

  it("preserves all real slot tokens in the output (order may differ)", () => {
    const realTokens = ["alice", "bob", "carol"];
    const result = padSlots(realTokens.map(makeSlot));
    const resultTokens = result.map((s) => s.token);
    for (const token of realTokens) {
      expect(resultTokens).toContain(token);
    }
  });

  it("output length is greater than or equal to input length", () => {
    for (const count of [0, 1, 8, 16, 20]) {
      const slots = Array.from({ length: count }, (_, i) => makeSlot(`s${i}`));
      expect(padSlots(slots).length).toBeGreaterThanOrEqual(count);
    }
  });
});
