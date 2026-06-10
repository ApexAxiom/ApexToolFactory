import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonField, optionalEmail, parseForm, requiredTrimmed } from "@/server/actions/validation";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("parseForm", () => {
  const schema = z.object({
    name: requiredTrimmed("Name"),
    email: optionalEmail,
    findings: jsonField(z.array(z.object({ code: z.string(), amount: z.number() })))
  });

  it("parses and trims valid submissions", () => {
    const result = parseForm(
      schema,
      formData({ name: "  Acme  ", email: "", findings: '[{"code":"termite","amount":250}]' })
    );

    expect(result.name).toBe("Acme");
    expect(result.email).toBeUndefined();
    expect(result.findings).toEqual([{ code: "termite", amount: 250 }]);
  });

  it("rejects missing required fields with a field-specific message", () => {
    expect(() => parseForm(schema, formData({ name: "   ", findings: "[]" }))).toThrow(/Name is required/);
  });

  it("rejects invalid email addresses", () => {
    expect(() => parseForm(schema, formData({ name: "Acme", email: "not-an-email", findings: "[]" }))).toThrow(
      /valid email/
    );
  });

  it("rejects malformed JSON fields instead of crashing", () => {
    expect(() => parseForm(schema, formData({ name: "Acme", findings: "{broken" }))).toThrow(/malformed JSON/);
  });
});
