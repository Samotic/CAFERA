import { z } from 'zod';

/**
 * "Ask CAFERA" contract. The feature ships behind a flag, but its contract is
 * defined now so the route, the rate limiter and the client hook can all be built
 * against something real rather than retrofitted later.
 *
 * The request never carries a model name, system prompt or token budget: those are
 * server-side concerns. A client that could choose them could also choose to make
 * the operator pay for arbitrary inference.
 */
export const askCaferaSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, 'Tell CAFERA what you have or what you feel like')
    .max(500, 'Keep it under 500 characters'),
  /** Optional slugs the user is already looking at, used to ground the answer. */
  context: z.array(z.string().max(100)).max(5).default([]),
});
export type AskCaferaInput = z.infer<typeof askCaferaSchema>;

export interface AskCaferaSuggestion {
  slug: string;
  name: string;
  reason: string;
}

export interface AskCaferaResponse {
  answer: string;
  /** Always drawn from the recipe collection — the model recommends, it does not invent. */
  suggestions: AskCaferaSuggestion[];
}
