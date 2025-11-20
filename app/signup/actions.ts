"use server";

import { z } from "zod";

export type SignupState = {
  errors?: {
    username?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  fields?: {
    username?: string;
    password?: string;
    confirmPassword?: string;
  }
  success?: boolean;
}

const schema = z.object({
  username: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .max(32, "Username cannot exceed 32 characters")
    .toLowerCase().regex(/^[a-z0-9_.]+$/, "Username must be alphanumeric"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters"),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      path: ["confirmPassword"],
      code: "custom",
      message: "Passwords do not match",
    });
  }
});

export async function signup(state: SignupState, payload: FormData): Promise<SignupState> {
  const fields = {
    username: payload.get("username") as string,
    password: payload.get("password") as string,
    confirmPassword: payload.get("confirm-password") as string,
  };
  const parsed = schema.safeParse(fields);

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, fields: fields };
  }

  return { success: true };
}