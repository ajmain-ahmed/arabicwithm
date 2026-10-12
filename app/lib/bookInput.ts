import { z } from "zod";
import { normalizeThumbnailCrop } from "@/app/lib/thumbnailCrop";
const optionalText = z.string().trim().max(2000).nullable();
export const bookInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Enter a book slug.")
    .max(200)
    .regex(
      /^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u,
      "Use letters/numbers separated by hyphens or underscores for the slug.",
    ),
  title: z.string().trim().min(1, "Enter a book title.").max(500),
  author: optionalText,
  title_ar: optionalText,
  description: z
    .string()
    .trim()
    .min(20, "Add a meaningful description of at least 20 characters.")
    .max(20000),
  reading_time_minutes: z
    .number()
    .finite()
    .int("Reading time must be a whole number of minutes.")
    .positive("Reading time must be at least 1 minute.")
    .nullable(),
  cover: z.string().max(2048).nullable(),
  cover_crop: z.unknown().transform(normalizeThumbnailCrop),
  level: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => value === "" || /^(A0|A1|A2|B1|B2|C1|C2)$/.test(value),
      "Use a CEFR level from A0 to C2.",
    ),
  category: optionalText,
});
export function bookSaveError(
  error: { code?: string; message?: string } | null,
): string {
  if (error?.code === "23505")
    return "A book already uses this slug. Choose a different slug.";
  if (error?.code === "23514")
    return "The book does not meet the required description, reading-time or cover rules. Check the fields and retry.";
  if (["42703", "PGRST204", "PGRST205"].includes(error?.code ?? ""))
    return "Book storage does not match the website schema. The book was not saved; check the book migrations.";
  return "Unable to save the book. Please try again.";
}
