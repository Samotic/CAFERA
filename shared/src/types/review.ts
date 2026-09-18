import type { Id, IsoDateString, Paginated } from './common.js';

export interface ReviewAuthor {
  _id: Id;
  name: string;
  avatarUrl: string | null;
}

export interface Review {
  _id: Id;
  recipeId: Id;
  author: ReviewAuthor;
  /** 1-5, integers only. */
  rating: number;
  body: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Index 0 holds the number of 1-star ratings, index 4 the number of 5-star. */
  distribution: [number, number, number, number, number];
  /** The requesting user's own review, when signed in and they have written one. */
  mine: Review | null;
}

export interface ReviewListResponse extends Paginated<Review> {
  summary: ReviewSummary;
}

export interface UpsertReviewRequest {
  rating: number;
  body?: string;
}
