"use client";

import { create } from "zustand";
import { toBase64, fromBase64 } from "@/lib/crypto/codec";

const SS_KEY = "stash:crypto";

type IdentityKeys = {
  masterKey: Uint8Array;
  identityPrivKey: Uint8Array;
  identityPubKey: Uint8Array;
};

type CryptoStore = {
  identity: IdentityKeys | null;
  stashKeys: Record<string, Uint8Array>;
  setIdentity: (keys: IdentityKeys) => void;
  setStashKey: (stashId: string, key: Uint8Array) => void;
  getStashKey: (stashId: string) => Uint8Array | null;
  clear: () => void;
};

function loadFromSession(): IdentityKeys | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      masterKey: fromBase64(parsed.masterKey),
      identityPrivKey: fromBase64(parsed.identityPrivKey),
      identityPubKey: fromBase64(parsed.identityPubKey),
    };
  } catch {
    return null;
  }
}

function saveToSession(keys: IdentityKeys): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    SS_KEY,
    JSON.stringify({
      masterKey: toBase64(keys.masterKey),
      identityPrivKey: toBase64(keys.identityPrivKey),
      identityPubKey: toBase64(keys.identityPubKey),
    })
  );
}

function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SS_KEY);
}

export const useCryptoStore = create<CryptoStore>((set, get) => ({
  identity: loadFromSession(),
  stashKeys: {},

  setIdentity(keys) {
    saveToSession(keys);
    set({ identity: keys });
  },

  setStashKey(stashId, key) {
    set((state) => ({
      stashKeys: { ...state.stashKeys, [stashId]: key },
    }));
  },

  getStashKey(stashId) {
    return get().stashKeys[stashId] ?? null;
  },

  clear() {
    clearSession();
    set({ identity: null, stashKeys: {} });
  },
}));
