export type EncryptedField = {
  iv: string;
  ciphertext: string;
};

export type EciesPayload = {
  ephemeralPublicKey: string;
  iv: string;
  ciphertext: string;
};

export type EncryptedIdentityBundle = EncryptedField;

export type MemberSlot = {
  token: string;
  publicKey: string;
  encryptedStashKey: string;
};
