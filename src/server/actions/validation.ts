import { z } from "zod";

export function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData): z.infer<T> {
  const entries: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    entries[key] = value;
  }

  const result = schema.safeParse(entries);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join(".");
    throw new Error(issue && field ? `${field}: ${issue.message}` : "The submitted form was invalid");
  }
  return result.data;
}

export const optionalTrimmed = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? undefined : trimmed;
  });

export const requiredTrimmed = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .transform((value) => value.trim())
    .pipe(z.string().min(1, `${label} is required`));

export const optionalEmail = optionalTrimmed.pipe(z.string().email("Enter a valid email").optional());

export const requiredEmail = (label: string) =>
  requiredTrimmed(label).pipe(z.string().email("Enter a valid email"));

export function jsonField<T extends z.ZodTypeAny>(schema: T) {
  return z
    .string()
    .default("[]")
    .transform((value, ctx) => {
      try {
        return JSON.parse(value || "[]") as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Field contained malformed JSON" });
        return z.NEVER;
      }
    })
    .pipe(schema);
}
