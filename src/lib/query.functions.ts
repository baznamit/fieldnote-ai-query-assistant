import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { querySchema } from "./query-schema";

export const startTestSession = createServerFn({ method: "POST" }).handler(async () => {
  const { issueTestSession } = await import("./backend/session.server");
  const secret = process.env["JWT_SECRET"] ?? "";
  return { token: await issueTestSession(secret) };
});

export const submitQuery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => querySchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const { verifySession } = await import("./backend/session.server");
    try {
      await verifySession(
        request.headers.get("authorization") ?? undefined,
        process.env["JWT_SECRET"] ?? "",
      );
    } catch {
      return {
        ok: false as const,
        status: 401,
        error: "Your session has expired. Start a new session and try again.",
      };
    }
    const { answerQuery, QueryError } = await import("./backend/query.server");
    try {
      return {
        ok: true as const,
        result: await answerQuery(request, data, process.env["LOVABLE_API_KEY"] ?? ""),
      };
    } catch (error) {
      return {
        ok: false as const,
        status: error instanceof QueryError ? error.status : 500,
        error:
          error instanceof QueryError ? error.message : "Something went wrong. Please try again.",
      };
    }
  });
