"use client";

import { useState, useCallback } from "react";
import { deriveMemberKeyPair } from "@/lib/crypto/keys";
import { openEcies } from "@/lib/crypto/ecies";
import { memberToken } from "@/lib/crypto/hash";
import { fromBase64, toBase64 } from "@/lib/crypto/codec";
import { useCryptoStore } from "@/stores/crypto-store";
import type { EciesPayload } from "@/types/crypto";

type AuthState = "idle" | "loading" | "done" | "error";

export function useStashAuth(stashId: string) {
  const { identity, setStashKey, getStashKey } = useCryptoStore();
  const [state, setState] = useState<AuthState>(
    getStashKey(stashId) ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (!identity) {
      setError("Not logged in");
      setState("error");
      return;
    }

    if (getStashKey(stashId)) {
      setState("done");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const memberKeys = deriveMemberKeyPair(identity.identityPrivKey, stashId);
      const token = memberToken(memberKeys.publicKey);

      // Step 1: request challenge
      const challengeRes = await fetch(
        `/api/stash/${stashId}/auth/challenge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberToken: token }),
        }
      );

      if (!challengeRes.ok) {
        throw new Error("Challenge request failed");
      }

      const { challenge, encryptedStashKey } = await challengeRes.json();

      // Decrypt the challenge to prove membership
      const challengePayload: EciesPayload = challenge;
      const randomToken = new TextDecoder().decode(
        openEcies(challengePayload, memberKeys.privateKey)
      );

      // Step 2: verify
      const verifyRes = await fetch(
        `/api/stash/${stashId}/auth/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberToken: token, token: randomToken }),
        }
      );

      if (!verifyRes.ok) {
        throw new Error("Membership verification failed");
      }

      // Decrypt the stash key
      const stashKeyPayload: EciesPayload = JSON.parse(encryptedStashKey);
      const stashKeyBytes = openEcies(stashKeyPayload, memberKeys.privateKey);

      setStashKey(stashId, stashKeyBytes);
      setState("done");
    } catch (err) {
      console.error(err);
      setError("Access denied or stash not found");
      setState("error");
    }
  }, [stashId, identity, getStashKey, setStashKey]);

  return { state, error, authenticate };
}
