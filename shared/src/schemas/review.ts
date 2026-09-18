import { z } from 'zod';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
  REVIEWS_PAGE_SIZE,
} from '../constants/limits.js';
import { multilineString } from './common.js';

export const ratingSchema = z.coerce
  .number()
  .int('Choose a whole number of stars')
  .min(REVIEW_MIN_RATING, 'Choose at least one star')
  .max(REVIEW_MAX_RATING, `Ratings go up to ${REVIEW_MAX_RATING} stars`);

/**
 * A review is a rating with optional prose. An empty body is stored as `null`
 * rather than `''` so "rated but did not write" is a single, queryable state.
 */
export const upsertReviewSchema = z.object({
  rating: ratingSchema,
  body: z
    .union([multilineString(1, REVIEW_BODY_MAX_LENGTH, 'Review'), z.literal('')])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
});
export type UpsertReviewInput = z.infer<typeof upsertReviewSchema>;

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(REVIEWS_PAGE_SIZE),
});
export type ReviewListQueryInput = z.infer<typeof reviewListQuerySchema>;

export const reportReviewSchema = z.object({
  reason: z.enum(['spam', 'offensive', 'off-topic', 'other']),
  detail: multilineString(0, 500, 'Detail').optional(),
});
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
