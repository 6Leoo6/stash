export type StashMemberEntry = {
  nickname: string;
  joinedAt: string;
};

export type DecryptedMetadata = {
  name: string;
  description: string;
  members: Record<string, StashMemberEntry>;
};

export type DecryptedPreview = {
  name: string;
  description: string;
};

export type DecryptedListing = {
  title: string;
  description: string;
  price: string;
  stock: number;
};

export type DecryptedOrder = {
  quantity: number;
  notes: string;
  buyerToken: string;
  status: "pending" | "accepted" | "fulfilled" | "cancelled";
};

export type StashRow = {
  id: string;
  encryptedPreview: string;
  ownerMemberToken: string;
  currentEpoch: number;
  createdAt: Date;
};
