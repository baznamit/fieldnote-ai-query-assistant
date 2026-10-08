// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { issueTestSession, verifySession } from "../lib/backend/session.server";
import { querySchema } from "../lib/query-schema";

const secret = "a-test-only-signing-key-with-more-than-32-characters";

describe("JWT endpoint protection", () => {
  it("accepts a signed reviewer session", async () => {
    const token = await issueTestSession(secret);
    expect((await verifySession(`Bearer ${token}`, secret)).sub).toBe("exercise-reviewer");
  });
  it("rejects missing authentication", async () => {
    await expect(verifySession(undefined, secret)).rejects.toThrow();
  });
  it("rejects a token signed with another key", async () => {
    const token = await issueTestSession(secret);
    await expect(
      verifySession(`Bearer ${token}`, "another-secret-of-at-least-thirty-two-characters"),
    ).rejects.toThrow();
  });
  it("rejects an expired JWT", async () => {
    const token = await new SignJWT({ scope: "query" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("fieldnote")
      .setAudience("fieldnote-query")
      .setSubject("exercise-reviewer")
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(secret));
    await expect(verifySession(`Bearer ${token}`, secret)).rejects.toThrow();
  });
});

describe("query validation", () => {
  it("rejects blank input before calling the model", () => {
    expect(querySchema.safeParse({ query: "   " }).success).toBe(false);
  });
  it("rejects oversized questions", () => {
    expect(querySchema.safeParse({ query: "x".repeat(4001) }).success).toBe(false);
  });
});
