import { serve } from "@hono/node-server";
import { issueTestSession, verifySession } from "../src/lib/backend/session.server.ts";
import { answerQuery, QueryError } from "../src/lib/backend/query.server.ts";

// The portable Node entry shares validation, JWT and AI logic with the preview.
// No framework-specific RPC protocol is needed by external reviewers.
serve({
  port: Number(process.env["PORT"] ?? 3000),
  fetch: async (request) => {
    const path = new URL(request.url).pathname;
    const json = (body: unknown, status = 200) =>
      Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
    if (path === "/health" && request.method === "GET") return json({ status: "ok" });
    if (request.method !== "POST") return json({ error: "Not found" }, 404);
    const secret = process.env["JWT_SECRET"] ?? "";
    if (path === "/session") {
      try {
        return json({ token: await issueTestSession(secret) });
      } catch {
        return json({ error: "Session signing is not configured." }, 503);
      }
    }
    if (path !== "/query") return json({ error: "Not found" }, 404);
    try {
      await verifySession(request.headers.get("authorization") ?? undefined, secret);
    } catch {
      return json({ error: "Unauthorized" }, 401);
    }
    let input: unknown;
    try {
      const body = await request.text();
      if (body.length > 20000) return json({ error: "Request body is too large." }, 413);
      input = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    try {
      return json(await answerQuery(request, input, process.env["LOVABLE_API_KEY"] ?? ""));
    } catch (error) {
      return json(
        { error: error instanceof QueryError ? error.message : "Request failed" },
        error instanceof QueryError ? error.status : 500,
      );
    }
  },
});
