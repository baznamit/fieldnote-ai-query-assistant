// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError } from "ai";

const mockCall = vi.hoisted(() => vi.fn());
vi.mock("../lib/ai/responses.server.ts", () => ({ createResponsesCall: mockCall }));
import { answerQuery } from "../lib/backend/query.server";

const request = () => new Request("http://localhost/query", { method: "POST" });

describe("query error handling", () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it("does not call the AI for invalid input", async () => {
    await expect(answerQuery(request(), { query: "" }, "test-key")).rejects.toMatchObject({
      status: 400,
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("rejects missing AI configuration", async () => {
    await expect(answerQuery(request(), { query: "Hello" }, "")).rejects.toMatchObject({
      status: 503,
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("returns the actual model answer", async () => {
    mockCall.mockReturnValue({ result: { text: Promise.resolve("The answer is 42.") } });
    expect((await answerQuery(request(), { query: "A question" }, "test-key")).answer).toBe(
      "The answer is 42.",
    );
  });

  it("surfaces an upstream timeout without retrying", async () => {
    mockCall.mockImplementation(() => {
      const error = new APICallError({
        message: "timeout",
        url: "https://example.test",
        requestBodyValues: {},
        statusCode: 504,
        isRetryable: false,
      });
      return { result: { text: Promise.reject(error) } };
    });
    await expect(answerQuery(request(), { query: "Hello" }, "test-key")).rejects.toMatchObject({
      status: 504,
    });
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it("preserves a provider denial and its safe message", async () => {
    mockCall.mockImplementation(() => {
      const error = new APICallError({
        message: "denied",
        url: "https://example.test",
        requestBodyValues: {},
        statusCode: 403,
        responseBody: JSON.stringify({
          error: { message: "Your workspace has disabled AI access." },
        }),
      });
      return { result: { text: Promise.reject(error) } };
    });
    await expect(answerQuery(request(), { query: "Hello" }, "test-key")).rejects.toMatchObject({
      status: 403,
      message: "Your workspace has disabled AI access.",
    });
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it("reports empty responses instead of inventing a fallback", async () => {
    mockCall.mockReturnValue({ result: { text: Promise.resolve(" ") } });
    await expect(answerQuery(request(), { query: "Hello" }, "test-key")).rejects.toMatchObject({
      status: 502,
    });
  });
});
