import type { ZodError } from "zod";

export function firstZodError(error: ZodError, fallback = "Invalid input") {
  return error.issues[0]?.message ?? fallback;
}
