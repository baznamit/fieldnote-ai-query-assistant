import { z } from "zod";

export const QUERY_LIMIT = 4000;

export const querySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Write a question before sending it.")
    .max(QUERY_LIMIT, "Keep your question under 4,000 characters."),
});

export type QueryResult = {
  answer: string;
  elapsedMs: number;
};
