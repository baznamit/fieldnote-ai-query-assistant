import { jwtVerify, SignJWT } from "jose";

const issuer = "fieldnote";
const audience = "fieldnote-query";

function signingKey(secret: string) {
  if (secret.length < 32) throw new Error("Session signing is not configured correctly.");
  return new TextEncoder().encode(secret);
}

// An intentionally public test session, permitted by the assignment. This is
// not account authentication; replace issuance with an identity provider before production.
export async function issueTestSession(secret: string) {
  return new SignJWT({ scope: "query" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("exercise-reviewer")
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(signingKey(secret));
}

export async function verifySession(authorization: string | undefined, secret: string) {
  if (!authorization?.startsWith("Bearer "))
    throw new Error("Your session has expired. Start a new session and try again.");
  const { payload } = await jwtVerify(authorization.slice(7), signingKey(secret), {
    algorithms: ["HS256"],
    issuer,
    audience,
  });
  if (payload["scope"] !== "query" || payload.sub !== "exercise-reviewer")
    throw new Error("This session does not have query access.");
  return payload;
}
