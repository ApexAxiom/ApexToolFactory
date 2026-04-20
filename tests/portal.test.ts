import { describe, expect, it } from "vitest";
import { hashPortalToken } from "@/server/services/portal";

describe("hashPortalToken", () => {
  it("is deterministic and does not return the raw token", () => {
    const token = "quoted-portal-token";
    const first = hashPortalToken(token);
    const second = hashPortalToken(token);

    expect(first).toBe(second);
    expect(first).not.toBe(token);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
